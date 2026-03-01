import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { isMalformed, scaffold } from "../src/index";
// -----------------------------------------------------------------------------
// Node shape reference:
//
// {
//   role: 'openTag' | 'closeTag' | 'selfTag' | 'processingInstruction'
//       | 'comment' | 'textLeaf' | 'doctype'
//   raw: string          -- exact source string, untouched
//   globalIndex: number  -- position across the entire document, never resets
//   localIndex: number   -- position within the parent's children array
//   children?: XmlNode[] -- only present on openTag
//   malformed?: true     -- present when structure is broken
// }
// -----------------------------------------------------------------------------

describe("leaf node shapes", () => {
  it("produces a fully shaped selfTag token", () => {
    const tokens = scaffold("<br/>");
    const br = tokens[0];
    expect(br.role).toBe("selfTag");
    expect(br.raw).toBe("<br/>");
    expect(br.globalIndex).toBe(0);
    expect(br.localIndex).toBe(0);
    expect(br.children).toBeUndefined();
    expect(br.malformed).toBeUndefined();
  });

  it("produces a fully shaped comment token", () => {
    const tokens = scaffold("<!-- a comment -->");
    const comment = tokens[0];
    expect(comment.role).toBe("comment");
    expect(comment.raw).toBe("<!-- a comment -->");
    expect(comment.globalIndex).toBe(0);
    expect(comment.localIndex).toBe(0);
    expect(comment.children).toBeUndefined();
    expect(comment.malformed).toBeUndefined();
  });

  it("produces a fully shaped processingInstruction token", () => {
    const tokens = scaffold('<?xml version="1.0" encoding="UTF-8"?>');
    const pi = tokens[0];
    expect(pi.role).toBe("processingInstruction");
    expect(pi.raw).toBe('<?xml version="1.0" encoding="UTF-8"?>');
    expect(pi.globalIndex).toBe(0);
    expect(pi.localIndex).toBe(0);
    expect(pi.children).toBeUndefined();
    expect(pi.malformed).toBeUndefined();
  });

  it("places a processingInstruction before the root element as a sibling with correct indexes", () => {
    const tokens = scaffold('<?xml version="1.0"?><root/>');
    expect(tokens[0].role).toBe("processingInstruction");
    expect(tokens[0].globalIndex).toBe(0);
    expect(tokens[0].localIndex).toBe(0);
    expect(tokens[1].role).toBe("selfTag");
    expect(tokens[1].globalIndex).toBe(1);
    expect(tokens[1].localIndex).toBe(1);
  });

  it("produces a fully shaped textLeaf token inside a parent", () => {
    const tokens = scaffold("<p>  spaced text  </p>");
    const text = tokens[0].children?.[0];
    expect(text?.role).toBe("textLeaf");
    expect(text?.raw).toBe("  spaced text  ");
    expect(text?.globalIndex).toBe(1);
    expect(text?.localIndex).toBe(0);
    expect(text?.children).toBeUndefined();
    expect(text?.malformed).toBeUndefined();
  });

  it("parses a CDATA section as a textLeaf with the raw CDATA string intact", () => {
    const tokens = scaffold("<root><![CDATA[x < y && y > z]]></root>");
    const root = tokens[0];
    expect(root.role).toBe("openTag");
    expect(root.malformed).toBeUndefined();
    expect(root.children?.length).toBe(1);
    const cdata = root.children?.[0];
    expect(cdata?.role).toBe("textLeaf");
    expect(cdata?.raw).toBe("<![CDATA[x < y && y > z]]>");
    expect(cdata?.malformed).toBeUndefined();
  });

  it("parses CDATA containing angle brackets and close tags without corrupting siblings", () => {
    const tokens = scaffold(
      "<doc><code><![CDATA[<b>bold</b>]]></code><after/></doc>",
    );
    const doc = tokens[0];
    expect(doc.malformed).toBeUndefined();
    expect(doc.children?.length).toBe(2);
    const code = doc.children?.[0];
    expect(code?.role).toBe("openTag");
    expect(code?.malformed).toBeUndefined();
    expect(code?.children?.length).toBe(1);
    expect(code?.children?.[0].raw).toBe("<![CDATA[<b>bold</b>]]>");
    const after = doc.children?.[1];
    expect(after?.role).toBe("selfTag");
    expect(after?.raw).toBe("<after/>");
  });

  it("parses a simple <!DOCTYPE html> as a doctype leaf with no children", () => {
    const tokens = scaffold("<!DOCTYPE html><root/>");
    expect(tokens.length).toBe(2);
    const doctype = tokens[0];
    expect(doctype.role).toBe("doctype");
    expect(doctype.raw).toBe("<!DOCTYPE html>");
    expect(doctype.children).toBeUndefined();
    expect(doctype.malformed).toBeUndefined();
    expect(tokens[1].role).toBe("selfTag");
    expect(tokens[1].raw).toBe("<root/>");
  });

  it("parses a <!DOCTYPE> with an external DTD reference as a single doctype leaf", () => {
    const tokens = scaffold("<!DOCTYPE root SYSTEM 'file.dtd'><root/>");
    expect(tokens.length).toBe(2);
    const doctype = tokens[0];
    expect(doctype.role).toBe("doctype");
    expect(doctype.raw).toBe("<!DOCTYPE root SYSTEM 'file.dtd'>");
    expect(doctype.children).toBeUndefined();
    expect(doctype.malformed).toBeUndefined();
  });

  it("parses a <!DOCTYPE> with an internal subset as a single doctype leaf capturing the full raw string", () => {
    const input = "<!DOCTYPE root [<!ELEMENT root EMPTY>]><root/>";
    const tokens = scaffold(input);
    expect(tokens.length).toBe(2);
    const doctype = tokens[0];
    expect(doctype.role).toBe("doctype");
    expect(doctype.raw).toBe("<!DOCTYPE root [<!ELEMENT root EMPTY>]>");
    expect(doctype.children).toBeUndefined();
    expect(doctype.malformed).toBeUndefined();
  });
});

describe("openTag shape", () => {
  it("produces a fully shaped openTag token with children and no closeTag in output", () => {
    const tokens = scaffold(
      '<book category="cooking"><title/><author/></book>',
    );
    const book = tokens[0];
    expect(book.role).toBe("openTag");
    expect(book.raw).toBe('<book category="cooking">');
    expect(book.globalIndex).toBe(0);
    expect(book.localIndex).toBe(0);
    expect(book.children?.length).toBe(2);
    expect(book.children?.every((c) => c.role !== "closeTag")).toBe(true);
    expect(book.malformed).toBeUndefined();
  });

  it("places mixed children — selfTag, textLeaf, comment — in document order with correct localIndex", () => {
    const tokens = scaffold("<a><b/>hello<!-- note --><c/></a>");
    const children = tokens[0].children ?? [];
    expect(children.length).toBe(4);
    expect(children[0].role).toBe("selfTag");
    expect(children[0].localIndex).toBe(0);
    expect(children[1].role).toBe("textLeaf");
    expect(children[1].localIndex).toBe(1);
    expect(children[2].role).toBe("comment");
    expect(children[2].localIndex).toBe(2);
    expect(children[3].role).toBe("selfTag");
    expect(children[3].localIndex).toBe(3);
  });

  it("reads an attribute value containing > without splitting the tag", () => {
    const tokens = scaffold('<el attr="a>b">text</el>');
    expect(tokens.length).toBe(1);
    const el = tokens[0];
    expect(el.role).toBe("openTag");
    expect(el.raw).toBe('<el attr="a>b">');
    expect(el.malformed).toBeUndefined();
    expect(el.children?.length).toBe(1);
    expect(el.children?.[0].raw).toBe("text");
  });

  it("reads a self-closing tag whose attribute value contains >", () => {
    const tokens = scaffold('<img src="1>2" alt="photo"/>');
    expect(tokens.length).toBe(1);
    const img = tokens[0];
    expect(img.role).toBe("selfTag");
    expect(img.raw).toBe('<img src="1>2" alt="photo"/>');
    expect(img.malformed).toBeUndefined();
  });
});

describe("globalIndex", () => {
  it("assigns globalIndex sequentially across siblings and into nested children", () => {
    const tokens = scaffold("<x/><a><b/></a>");
    expect(tokens[0].globalIndex).toBe(0);
    expect(tokens[1].globalIndex).toBe(1);
    expect(tokens[1].children?.[0].globalIndex).toBe(2);
  });

  it("assigns globalIndex depth-first so nested tokens count before later siblings", () => {
    const tokens = scaffold("<a><b><c/></b><d/></a>");
    const a = tokens[0];
    const b = a.children?.[0];
    const c = b?.children?.[0];
    const d = a.children?.[1];
    expect(a.globalIndex).toBe(0);
    expect(b?.globalIndex).toBe(1);
    expect(c?.globalIndex).toBe(2);
    expect(d?.globalIndex).toBe(3);
  });
});

describe("localIndex", () => {
  it("resets localIndex to 0 for children of each new parent regardless of globalIndex", () => {
    const tokens = scaffold("<x/><a><b/><c/></a>");
    expect(tokens[0].localIndex).toBe(0);
    expect(tokens[1].localIndex).toBe(1);
    const aChildren = tokens[1].children ?? [];
    expect(aChildren[0].localIndex).toBe(0);
    expect(aChildren[1].localIndex).toBe(1);
  });
});

describe("comment detection", () => {
  it("does not treat <!- as a comment opener — only <!-- qualifies", () => {
    const tokens = scaffold("<!-not-a-comment><root/>");
    const first = tokens[0];
    expect(first.role).not.toBe("comment");
    expect(first.raw).not.toContain("<root/>");
  });

  it("parses a valid <!-- comment --> without swallowing the following sibling", () => {
    const tokens = scaffold("<!-- real comment --><root/>");
    expect(tokens.length).toBe(2);
    expect(tokens[0].role).toBe("comment");
    expect(tokens[0].raw).toBe("<!-- real comment -->");
    expect(tokens[1].role).toBe("selfTag");
    expect(tokens[1].raw).toBe("<root/>");
  });
});

describe("malformed input", () => {
  it("marks an unclosed openTag as malformed and keeps its collected children intact", () => {
    const tokens = scaffold("<a><unclosed><valid/></a>");
    const a = tokens[0];
    const unclosed = a.children?.[0];
    const valid = unclosed?.children?.[0];
    expect(unclosed?.malformed).toBe(true);
    expect(valid?.role).toBe("selfTag");
    expect(valid?.malformed).toBeUndefined();
  });

  it("surfaces a stray closeTag as a malformed closeTag node with correct indexes", () => {
    const tokens = scaffold("<a/></orphan><b/>");
    const stray = tokens[1];
    expect(stray.role).toBe("closeTag");
    expect(stray.raw).toBe("</orphan>");
    expect(stray.malformed).toBe(true);
    expect(stray.globalIndex).toBe(1);
    expect(stray.localIndex).toBe(1);
  });

  it("marks an unclosed bracket as malformed", () => {
    const tokens = scaffold("<unclosed");
    expect(tokens[0].malformed).toBe(true);
    expect(tokens[0].raw).toBe("<unclosed");
  });

  it("never throws on any input", () => {
    expect(() => scaffold("")).not.toThrow();
    expect(() => scaffold("<")).not.toThrow();
    expect(() => scaffold("</>")).not.toThrow();
    expect(() => scaffold("<a>")).not.toThrow();
    expect(() => scaffold("</a>")).not.toThrow();
    expect(() => scaffold("<a><b></a></b>")).not.toThrow();
    expect(() => scaffold("just text")).not.toThrow();
  });
});

describe("whitespace handling", () => {
  it("does not produce textLeaf nodes for whitespace-only content between tags", () => {
    const xml = `
      <page>
        <header>
          <nav/>
        </header>
        <main>
          <section/>
        </main>
      </page>
    `;
    const tokens = scaffold(xml);
    const allNodes: typeof tokens = [];
    const collect = (nodes: typeof tokens) => {
      for (const node of nodes) {
        allNodes.push(node);
        if (node.children) collect(node.children);
      }
    };
    collect(tokens);
    const whitespaceLeafs = allNodes.filter(
      (n) => n.role === "textLeaf" && n.raw.trim() === "",
    );
    expect(whitespaceLeafs.length).toBe(0);
  });

  it("preserves meaningful text content inside a tag while stripping structural whitespace between tags", () => {
    const xml = `
      <root>
        <h1> hey peeps </h1>
        <p>some content</p>
      </root>
    `;
    const tokens = scaffold(xml);
    const root = tokens[0];
    expect(root.role).toBe("openTag");
    expect(root.children?.length).toBe(2);
    const h1 = root.children?.[0];
    expect(h1?.role).toBe("openTag");
    expect(h1?.raw).toBe("<h1>");
    expect(h1?.children?.length).toBe(1);
    expect(h1?.children?.[0].role).toBe("textLeaf");
    expect(h1?.children?.[0].raw).toBe(" hey peeps ");
    const p = root.children?.[1];
    expect(p?.role).toBe("openTag");
    expect(p?.raw).toBe("<p>");
  });

  it("strips leading and trailing whitespace from the entire input before parsing", () => {
    const xml = "\n  <root/>\n";
    const tokens = scaffold(xml);
    expect(tokens.length).toBe(1);
    expect(tokens[0].role).toBe("selfTag");
    expect(tokens[0].raw).toBe("<root/>");
  });

  it("preserves multiple spaces between words inside a text node", () => {
    const tokens = scaffold("<p>hello   world</p>");
    const text = tokens[0].children?.[0];
    expect(text?.role).toBe("textLeaf");
    expect(text?.raw).toBe("hello   world");
  });

  it("preserves mixed content where text and tags are siblings inside a parent", () => {
    const tokens = scaffold("<p>Hello <strong>world</strong> today</p>");
    const children = tokens[0].children ?? [];
    expect(children.length).toBe(3);
    expect(children[0].role).toBe("textLeaf");
    expect(children[0].raw).toBe("Hello ");
    expect(children[1].role).toBe("openTag");
    expect(children[1].raw).toBe("<strong>");
    expect(children[2].role).toBe("textLeaf");
    expect(children[2].raw).toBe(" today");
  });

  it("drops a tag that contains only whitespace as its text content", () => {
    const tokens = scaffold("<p>   </p>");
    const p = tokens[0];
    expect(p.role).toBe("openTag");
    expect(p.children?.length).toBe(0);
  });
});

describe("edge cases", () => {
  it("returns an empty array for an empty string", () => {
    expect(scaffold("")).toEqual([]);
  });

  it("handles a root-level textLeaf with correct shape", () => {
    const tokens = scaffold("just text");
    expect(tokens[0].role).toBe("textLeaf");
    expect(tokens[0].raw).toBe("just text");
    expect(tokens[0].globalIndex).toBe(0);
    expect(tokens[0].localIndex).toBe(0);
    expect(tokens[0].children).toBeUndefined();
  });

  it("handles deeply nested structure with correct globalIndex at every level", () => {
    const tokens = scaffold("<a><b><c><d/></c></b></a>");
    const a = tokens[0];
    const b = a.children?.[0];
    const c = b?.children?.[0];
    const d = c?.children?.[0];
    expect(a.globalIndex).toBe(0);
    expect(b?.globalIndex).toBe(1);
    expect(c?.globalIndex).toBe(2);
    expect(d?.globalIndex).toBe(3);
    expect(d?.role).toBe("selfTag");
    expect(d?.localIndex).toBe(0);
  });

  it("returns all root-level siblings from a multi-root document with correct indexes", () => {
    const tokens = scaffold("<a/><b/><c/>");
    expect(tokens.length).toBe(3);
    expect(tokens[0].role).toBe("selfTag");
    expect(tokens[0].raw).toBe("<a/>");
    expect(tokens[0].globalIndex).toBe(0);
    expect(tokens[0].localIndex).toBe(0);
    expect(tokens[1].role).toBe("selfTag");
    expect(tokens[1].raw).toBe("<b/>");
    expect(tokens[1].globalIndex).toBe(1);
    expect(tokens[1].localIndex).toBe(1);
    expect(tokens[2].role).toBe("selfTag");
    expect(tokens[2].raw).toBe("<c/>");
    expect(tokens[2].globalIndex).toBe(2);
    expect(tokens[2].localIndex).toBe(2);
  });

  it("produces a malformed openTag node with empty tag and raw '<' for a bare less-than", () => {
    const tokens = scaffold("<");
    expect(tokens.length).toBe(1);
    expect(tokens[0].role).toBe("openTag");
    expect(tokens[0].raw).toBe("<");
    expect(tokens[0].malformed).toBe(true);
    expect(tokens[0].raw).toBe("<");
  });

  it("produces a malformed closeTag node with empty tag for '</>'", () => {
    const tokens = scaffold("</>");
    expect(tokens.length).toBe(1);
    expect(tokens[0].role).toBe("closeTag");
    expect(tokens[0].raw).toBe("</>");
    expect(tokens[0].malformed).toBe(true);
  });
});

describe("unclosed constructs", () => {
  it("returns a processingInstruction node with full raw content when '?>' is never closed", () => {
    const tokens = scaffold("<?xml version='1.0'");
    expect(tokens.length).toBe(1);
    expect(tokens[0].role).toBe("processingInstruction");
    expect(tokens[0].raw).toBe("<?xml version='1.0'");
    expect(tokens[0].malformed).toBeUndefined();
  });

  it("returns a comment node with full raw content when '-->' is never closed", () => {
    const tokens = scaffold("<!-- this comment never ends");
    expect(tokens.length).toBe(1);
    expect(tokens[0].role).toBe("comment");
    expect(tokens[0].raw).toBe("<!-- this comment never ends");
    expect(tokens[0].malformed).toBeUndefined();
  });

  it("returns a textLeaf node with full raw CDATA content when ']]>' is never closed", () => {
    const tokens = scaffold("<![CDATA[data without close");
    expect(tokens.length).toBe(1);
    expect(tokens[0].role).toBe("textLeaf");
    expect(tokens[0].raw).toBe("<![CDATA[data without close");
    expect(tokens[0].malformed).toBeUndefined();
  });
});

describe("isMalformed type guard", () => {
  it("returns false for a well-formed node", () => {
    const tokens = scaffold("<br/>");
    expect(isMalformed(tokens[0])).toBe(false);
  });

  it("returns true for a node flagged as malformed", () => {
    const tokens = scaffold("<unclosed");
    expect(isMalformed(tokens[0])).toBe(true);
  });
});

describe("max depth protection", () => {
  it("does not throw and marks the deepest open tag as malformed when nesting exceeds 500 levels", () => {
    const open = "<a>".repeat(501);
    const close = "</a>".repeat(501);
    const xml = open + close;
    expect(() => scaffold(xml)).not.toThrow();
    const collectAll = (
      nodes: ReturnType<typeof scaffold>,
    ): ReturnType<typeof scaffold> =>
      nodes.flatMap((n) => [n, ...collectAll(n.children ?? [])]);
    const all = collectAll(scaffold(xml));
    const malformedNodes = all.filter((n) => n.malformed === true);
    expect(malformedNodes.length).toBeGreaterThan(0);
  });
});

describe("xmlTag field", () => {
  it("populates xmlTag with the tag name on an openTag node", () => {
    const tokens = scaffold("<book></book>");
    expect(tokens[0].xmlTag).toBe("book");
  });

  it("populates xmlTag with the tag name on a selfTag node", () => {
    const tokens = scaffold("<br/>");
    expect(tokens[0].xmlTag).toBe("br");
  });

  it("populates xmlTag with the tag name on a stray malformed closeTag node", () => {
    const tokens = scaffold("<a/></orphan>");
    const stray = tokens[1];
    expect(stray.role).toBe("closeTag");
    expect(stray.xmlTag).toBe("orphan");
  });

  it("does not populate xmlTag on a textLeaf node", () => {
    const tokens = scaffold("<p>hello</p>");
    const text = tokens[0].children?.[0];
    expect(text?.role).toBe("textLeaf");
    expect(text?.xmlTag).toBeUndefined();
  });

  it("does not populate xmlTag on a comment node", () => {
    const tokens = scaffold("<!-- comment -->");
    expect(tokens[0].xmlTag).toBeUndefined();
  });

  it("does not populate xmlTag on a processingInstruction node", () => {
    const tokens = scaffold('<?xml version="1.0"?>');
    expect(tokens[0].xmlTag).toBeUndefined();
  });

  it("does not populate xmlTag on a doctype node", () => {
    const tokens = scaffold("<!DOCTYPE html><root/>");
    expect(tokens[0].xmlTag).toBeUndefined();
  });

  it("preserves namespace prefixes verbatim in xmlTag", () => {
    const tokens = scaffold("<env:Envelope></env:Envelope>");
    expect(tokens[0].xmlTag).toBe("env:Envelope");
  });

  it("populates xmlTag correctly on a deeply nested child node", () => {
    const tokens = scaffold("<a><b><c/></b></a>");
    const c = tokens[0].children?.[0].children?.[0];
    expect(c?.xmlTag).toBe("c");
  });

  it("populates xmlTag on an openTag that has attributes", () => {
    const tokens = scaffold('<book category="cooking"></book>');
    expect(tokens[0].xmlTag).toBe("book");
  });
});

describe("xmlInner field", () => {
  it("populates xmlInner with everything after the tag name on an openTag with attributes", () => {
    const tokens = scaffold('<book category="cooking"></book>');
    expect(tokens[0].xmlInner).toBe('category="cooking"');
  });

  it("does not populate xmlInner on an openTag with no attributes", () => {
    const tokens = scaffold("<book></book>");
    expect(tokens[0].xmlInner).toBeUndefined();
  });

  it("populates xmlInner on a selfTag with attributes", () => {
    const tokens = scaffold('<img src="photo.jpg" alt="photo"/>');
    expect(tokens[0].xmlInner).toBe('src="photo.jpg" alt="photo"');
  });

  it("does not populate xmlInner on a selfTag with no attributes", () => {
    const tokens = scaffold("<br/>");
    expect(tokens[0].xmlInner).toBeUndefined();
  });

  it("does not populate xmlInner on a textLeaf node", () => {
    const tokens = scaffold("<p>hello</p>");
    const text = tokens[0].children?.[0];
    expect(text?.xmlInner).toBeUndefined();
  });

  it("does not populate xmlInner on a comment node", () => {
    const tokens = scaffold("<!-- comment -->");
    expect(tokens[0].xmlInner).toBeUndefined();
  });

  it("does not populate xmlInner on a processingInstruction node", () => {
    const tokens = scaffold('<?xml version="1.0"?>');
    expect(tokens[0].xmlInner).toBeUndefined();
  });

  it("does not populate xmlInner on a doctype node", () => {
    const tokens = scaffold("<!DOCTYPE html><root/>");
    expect(tokens[0].xmlInner).toBeUndefined();
  });

  it("preserves multi-line and tab-separated attributes verbatim in xmlInner", () => {
    const xml = readFileSync(
      new URL("./fixtures/SOAP.xml", import.meta.url),
      "utf-8",
    );
    const tokens = scaffold(xml);
    const header = tokens[1].children?.[0];
    const reservation = header?.children?.[0];
    expect(reservation?.xmlInner).toBe(
      'xmlns:m="http://travelcompany.example.org/reservation"\n\t\tenv:role="http://www.w3.org/2003/05/soap-envelope/role/next"',
    );
  });

  it("populates xmlInner on a deeply nested child node with attributes", () => {
    const tokens = scaffold('<a><b lang="en"></b></a>');
    const b = tokens[0].children?.[0];
    expect(b?.xmlInner).toBe('lang="en"');
  });
});

describe("xmlAttributes field", () => {
  it("parses a single double-quoted attribute into an array with one entry", () => {
    const tokens = scaffold('<book category="cooking"></book>');
    expect(tokens[0].xmlAttributes).toEqual([
      { name: "category", value: "cooking" },
    ]);
  });

  it("parses multiple attributes into an array preserving order", () => {
    const tokens = scaffold('<title lang="en" dir="ltr"></title>');
    expect(tokens[0].xmlAttributes).toEqual([
      { name: "lang", value: "en" },
      { name: "dir", value: "ltr" },
    ]);
  });

  it("parses a single-quoted attribute value correctly", () => {
    const tokens = scaffold("<root type='basic'></root>");
    expect(tokens[0].xmlAttributes).toEqual([{ name: "type", value: "basic" }]);
  });

  it("parses namespace-prefixed attribute names verbatim", () => {
    const tokens = scaffold(
      '<el xmlns:m="http://example.com" env:role="next"></el>',
    );
    expect(tokens[0].xmlAttributes).toEqual([
      { name: "xmlns:m", value: "http://example.com" },
      { name: "env:role", value: "next" },
    ]);
  });

  it("parses multi-line tab-separated attributes from the SOAP fixture", () => {
    const xml = readFileSync(
      new URL("./fixtures/SOAP.xml", import.meta.url),
      "utf-8",
    );
    const tokens = scaffold(xml);
    const header = tokens[1].children?.[0];
    const reservation = header?.children?.[0];
    expect(reservation?.xmlAttributes).toEqual([
      {
        name: "xmlns:m",
        value: "http://travelcompany.example.org/reservation",
      },
      {
        name: "env:role",
        value: "http://www.w3.org/2003/05/soap-envelope/role/next",
      },
    ]);
  });

  it("parses attributes on a selfTag", () => {
    const tokens = scaffold('<img src="photo.jpg" alt="photo"/>');
    expect(tokens[0].xmlAttributes).toEqual([
      { name: "src", value: "photo.jpg" },
      { name: "alt", value: "photo" },
    ]);
  });

  it("does not populate xmlAttributes on an openTag with no attributes", () => {
    const tokens = scaffold("<book></book>");
    expect(tokens[0].xmlAttributes).toBeUndefined();
  });

  it("does not populate xmlAttributes on a selfTag with no attributes", () => {
    const tokens = scaffold("<br/>");
    expect(tokens[0].xmlAttributes).toBeUndefined();
  });

  it("does not populate xmlAttributes on a textLeaf node", () => {
    const tokens = scaffold("<p>hello</p>");
    expect(tokens[0].children?.[0].xmlAttributes).toBeUndefined();
  });

  it("does not populate xmlAttributes on a comment node", () => {
    const tokens = scaffold("<!-- comment -->");
    expect(tokens[0].xmlAttributes).toBeUndefined();
  });

  it("does not populate xmlAttributes on a processingInstruction node", () => {
    const tokens = scaffold('<?xml version="1.0"?>');
    expect(tokens[0].xmlAttributes).toBeUndefined();
  });

  it("does not populate xmlAttributes on a doctype node", () => {
    const tokens = scaffold("<!DOCTYPE html><root/>");
    expect(tokens[0].xmlAttributes).toBeUndefined();
  });
});

describe("SOAP envelope", () => {
  const xml = readFileSync(
    new URL("./fixtures/SOAP.xml", import.meta.url),
    "utf-8",
  );
  const tokens = scaffold(xml);

  it("parses the SOAP envelope as a single root openTag with a namespace-prefixed tag name", () => {
    expect(tokens.length).toBe(2);
    expect(tokens[0].role).toBe("processingInstruction");
    expect(tokens[1].role).toBe("openTag");
    expect(tokens[1].raw).toContain("env:Envelope");
    expect(tokens[1].malformed).toBeUndefined();
  });

  it("preserves the full xmlns attribute in the raw envelope opening tag", () => {
    const envelope = tokens[1];
    expect(envelope.raw).toContain(
      'xmlns:env="http://www.w3.org/2003/05/soap-envelope"',
    );
  });

  it("produces env:Header and env:Body as the two children of env:Envelope", () => {
    const envelope = tokens[1];
    expect(envelope.children?.length).toBe(2);
    expect(envelope.children?.[0].role).toBe("openTag");
    expect(envelope.children?.[0].raw).toContain("env:Header");
    expect(envelope.children?.[1].role).toBe("openTag");
    expect(envelope.children?.[1].raw).toContain("env:Body");
  });

  it("preserves namespace-prefixed tag names verbatim without stripping the prefix", () => {
    const header = tokens[1].children?.[0];
    const reservation = header?.children?.[0];
    expect(reservation?.raw).toContain("m:reservation");
    const passenger = header?.children?.[1];
    expect(passenger?.raw).toContain("n:passenger");
  });

  it("correctly parses deeply nested text content inside env:Body", () => {
    const body = tokens[1].children?.[1];
    const itinerary = body?.children?.[0];
    const departure = itinerary?.children?.[0];
    const departing = departure?.children?.[0];
    expect(departing?.raw).toContain("p:departing");
    const text = departing?.children?.[0];
    expect(text?.role).toBe("textLeaf");
    expect(text?.raw).toBe("New York");
  });

  it("surfaces no malformed nodes anywhere in the SOAP tree", () => {
    const collectAll = (
      nodes: ReturnType<typeof scaffold>,
    ): ReturnType<typeof scaffold> =>
      nodes.flatMap((n) => [n, ...collectAll(n.children ?? [])]);
    const all = collectAll(tokens);
    const malformedNodes = all.filter((n) => n.malformed === true);
    expect(malformedNodes.length).toBe(0);
  });
});
