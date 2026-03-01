import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { render, scaffold } from "../src/index";

describe("openTag rendering", () => {
  it("renders an openTag with no attributes as a div with only data-tag", () => {
    const html = render(scaffold("<book></book>"));
    expect(html).toBe('<div data-tag="book"></div>');
  });

  it("renders an openTag with a single attribute as data-attrs-{name}", () => {
    const html = render(scaffold('<book category="cooking"></book>'));
    expect(html).toBe('<div data-tag="book" data-attrs-category="cooking"></div>');
  });

  it("renders an openTag with multiple attributes as separate data-attrs-{name} entries", () => {
    const html = render(scaffold('<title lang="en" dir="ltr"></title>'));
    expect(html).toBe('<div data-tag="title" data-attrs-lang="en" data-attrs-dir="ltr"></div>');
  });

  it("renders children nested inside the parent div", () => {
    const html = render(scaffold("<root><child/></root>"));
    expect(html).toBe('<div data-tag="root"><div data-tag="child"></div></div>');
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
