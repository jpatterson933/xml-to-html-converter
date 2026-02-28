import { describe, expect, it } from "vitest";
import { scaffold } from "../src/modules/scaffold/scaffold";
// -----------------------------------------------------------------------------
// Token shape reference:
//
// {
//   role: 'openTag' | 'closeTag' | 'selfTag' | 'processingInstruction' | 'comment' | 'textLeaf'
//   raw: string                  -- exact source string, untouched
//   globalIndex: number          -- position in the entire flat token sequence
//   localIndex: number           -- position within the parent's children array
//   children?: Token[]           -- only present on openTag
//   malformed?: true             -- present when structure is broken
// }
// -----------------------------------------------------------------------------

describe("scaffold", () => {
  // ---------------------------------------------------------------------------
  // Leaf token shapes — role, raw, indexes, no children
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // openTag shape — role, raw, indexes, children collected, closeTag consumed
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // globalIndex — counts every token across the entire document, never resets
  // ---------------------------------------------------------------------------

  it("assigns globalIndex sequentially across siblings and into nested children", () => {
    // <x/>=0, <a>=1, <b/>=2
    const tokens = scaffold("<x/><a><b/></a>");
    expect(tokens[0].globalIndex).toBe(0);
    expect(tokens[1].globalIndex).toBe(1);
    expect(tokens[1].children?.[0].globalIndex).toBe(2);
  });

  it("assigns globalIndex depth-first so nested tokens count before later siblings", () => {
    // <a>=0, <b>=1, <c/>=2, <d/>=3
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

  // ---------------------------------------------------------------------------
  // localIndex — resets to 0 for each new parent
  // ---------------------------------------------------------------------------

  it("resets localIndex to 0 for children of each new parent regardless of globalIndex", () => {
    // <x/> localIndex=0 in root, <a> localIndex=1 in root
    // <b/> localIndex=0 inside <a> — not 2
    const tokens = scaffold("<x/><a><b/><c/></a>");
    expect(tokens[0].localIndex).toBe(0);
    expect(tokens[1].localIndex).toBe(1);
    const aChildren = tokens[1].children ?? [];
    expect(aChildren[0].localIndex).toBe(0);
    expect(aChildren[1].localIndex).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Malformed input
  // ---------------------------------------------------------------------------

  it("marks an unclosed openTag as malformed, keeps its collected children intact", () => {
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

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

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
    // <a>=0, <b>=1, <c>=2, <d/>=3
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
});
