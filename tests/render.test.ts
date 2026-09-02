import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { minify, render, scaffold } from "../src/index";

describe("openTag rendering", () => {
  it("renders an openTag with no attributes as a div with only data-tag", () => {
    const html = render(scaffold("<book></book>"));
    expect(html).toBe('<div data-tag="book"></div>');
  });

  it("renders an openTag with a single attribute as data-attrs-{name}", () => {
    const html = render(scaffold('<book category="cooking"></book>'));
    expect(html).toBe(
      '<div data-tag="book" data-attrs-category="cooking"></div>',
    );
  });

  it("renders an openTag with multiple attributes as separate data-attrs-{name} entries", () => {
    const html = render(scaffold('<title lang="en" dir="ltr"></title>'));
    expect(html).toBe(
      '<div data-tag="title" data-attrs-lang="en" data-attrs-dir="ltr"></div>',
    );
  });

  it("renders children nested inside the parent div", () => {
    const html = render(scaffold("<root><child/></root>"));
    expect(html).toBe(
      '<div data-tag="root"><div data-tag="child"></div></div>',
    );
  });

  it("renders deeply nested children in correct order", () => {
    const html = render(scaffold("<a><b><c/></b></a>"));
    expect(html).toBe(
      '<div data-tag="a"><div data-tag="b"><div data-tag="c"></div></div></div>',
    );
  });
});

describe("selfTag rendering", () => {
  it("renders a selfTag with no attributes as an empty div with data-tag", () => {
    const html = render(scaffold("<br/>"));
    expect(html).toBe('<div data-tag="br"></div>');
  });

  it("renders a selfTag with attributes as data-attrs-{name} entries", () => {
    const html = render(scaffold('<img src="photo.jpg" alt="photo"/>'));
    expect(html).toBe(
      '<div data-tag="img" data-attrs-src="photo.jpg" data-attrs-alt="photo"></div>',
    );
  });
});

describe("textLeaf rendering", () => {
  it("renders textLeaf content directly with no wrapper", () => {
    const html = render(scaffold("<p>hello world</p>"));
    expect(html).toBe('<div data-tag="p">hello world</div>');
  });

  it("preserves internal spacing in text content", () => {
    const html = render(scaffold("<p>hello   world</p>"));
    expect(html).toContain("hello   world");
  });

  it("renders mixed text and tag siblings in document order", () => {
    const html = render(scaffold("<p>Hello <strong>world</strong> today</p>"));
    expect(html).toBe(
      '<div data-tag="p">Hello <div data-tag="strong">world</div> today</div>',
    );
  });
});

describe("comment rendering", () => {
  it("passes comments through to the output unchanged", () => {
    const html = render(scaffold("<!-- a comment --><root/>"));
    expect(html).toContain("<!-- a comment -->");
  });
});

describe("dropped node roles", () => {
  it("produces no output for a processingInstruction", () => {
    const html = render(scaffold('<?xml version="1.0"?><root/>'));
    expect(html).not.toContain("<?xml");
    expect(html).toContain('data-tag="root"');
  });

  it("produces no output for a doctype", () => {
    const html = render(scaffold("<!DOCTYPE html><root/>"));
    expect(html).not.toContain("DOCTYPE");
    expect(html).toContain('data-tag="root"');
  });

  it("produces no output for a stray malformed closeTag", () => {
    const html = render(scaffold("<a/></orphan><b/>"));
    expect(html).not.toContain("orphan");
    expect(html).toContain('data-tag="a"');
    expect(html).toContain('data-tag="b"');
  });
});

describe("raw output contract", () => {
  it("renders xml attribute values verbatim without HTML escaping", () => {
    const html = render(scaffold('<node text="a&b"></node>'));
    expect(html).toBe('<div data-tag="node" data-attrs-text="a&b"></div>');
  });

  it("renders textLeaf content verbatim without escaping", () => {
    const html = render(scaffold("<p>a &amp; b</p>"));
    expect(html).toBe('<div data-tag="p">a &amp; b</div>');
  });
});

describe("round-trip: scaffold → render", () => {
  it("produces a non-empty HTML string from the well-formed bookstore fixture", () => {
    const xml = readFileSync(
      new URL("./fixtures/well-formed.xml", import.meta.url),
      "utf-8",
    );
    const html = render(scaffold(xml));
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('data-tag="bookstore"');
    expect(html).toContain('data-tag="book"');
    expect(html).toContain('data-attrs-category="cooking"');
    expect(html).toContain('data-tag="title"');
    expect(html).toContain('data-attrs-lang="en"');
    expect(html).toContain("Everyday Italian");
    expect(html).toContain("Harry Potter");
  });

  it("produces a non-empty HTML string from the SOAP fixture with namespace-prefixed tags and attributes", () => {
    const xml = readFileSync(
      new URL("./fixtures/SOAP.xml", import.meta.url),
      "utf-8",
    );
    const html = render(scaffold(xml));
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('data-tag="env:Envelope"');
    expect(html).toContain('data-tag="env:Header"');
    expect(html).toContain('data-tag="env:Body"');
    expect(html).toContain('data-tag="m:reservation"');
    expect(html).toContain('data-tag="p:departing"');
    expect(html).toContain("New York");
    expect(html).toContain("Fred Bloggs");
  });
});

describe("CDATA rendering", () => {
  it("renders CDATA content as literal text with markup characters escaped", () => {
    const html = render(scaffold("<code><![CDATA[x < y && y > z]]></code>"));
    expect(html).toBe('<div data-tag="code">x &lt; y &amp;&amp; y &gt; z</div>');
  });

  it("does not emit the CDATA wrapper for an unclosed CDATA section", () => {
    const html = render(scaffold("<code><![CDATA[a < b"));
    expect(html).toContain("a &lt; b");
    expect(html).not.toContain("<![CDATA[");
  });

  it("leaves text that is not CDATA untouched, including existing entities", () => {
    const html = render(scaffold("<p>a &amp; b &lt; c</p>"));
    expect(html).toBe('<div data-tag="p">a &amp; b &lt; c</div>');
  });

  it("renders the cdata fixture without leaking CDATA markers into the HTML", () => {
    const xml = readFileSync(
      new URL("./fixtures/cdata.xml", import.meta.url),
      "utf-8",
    );
    const html = render(scaffold(minify(xml)));
    expect(html).not.toContain("<![CDATA[");
    expect(html).not.toContain("]]>");
    expect(html).toContain("x &lt; y &amp;&amp; y &gt; z");
    expect(html).toContain("Use &lt;b&gt;bold&lt;/b&gt; &amp; \"quotes\" freely inside CDATA");
  });
});

describe("attribute value quoting", () => {
  it("escapes double quotes inside attribute values", () => {
    const html = render(scaffold(`<a title='say "hi"'/>`));
    expect(html).toBe(
      '<div data-tag="a" data-attrs-title="say &quot;hi&quot;"></div>',
    );
  });

  it("leaves single quotes and existing entities in attribute values untouched", () => {
    const html = render(scaffold(`<a title="it's &amp; ok"/>`));
    expect(html).toBe(
      `<div data-tag="a" data-attrs-title="it's &amp; ok"></div>`,
    );
  });
});

describe("whitespace pass-through", () => {
  const pretty = "<root>\n  <child/>\n</root>";

  it("emits whitespace textLeaf nodes between elements when scaffold is used without minify", () => {
    expect(render(scaffold(pretty))).toBe(
      '<div data-tag="root">\n  <div data-tag="child"></div>\n</div>',
    );
  });

  it("emits compact HTML when the input is minified first", () => {
    expect(render(scaffold(minify(pretty)))).toBe(
      '<div data-tag="root"><div data-tag="child"></div></div>',
    );
  });

  it("preserves the space between inline sibling elements", () => {
    expect(render(scaffold("<p>Hello <b>big</b> <i>world</i></p>"))).toBe(
      '<div data-tag="p">Hello <div data-tag="b">big</div> <div data-tag="i">world</div></div>',
    );
  });
});
