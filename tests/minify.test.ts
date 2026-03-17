import { describe, expect, it } from "vitest";
import { minify, scaffold } from "../src/index";

describe("inter-tag whitespace", () => {
  it("strips newlines and spaces between closing and opening tags", () => {
    const xml = "<root>\n  <child/>\n</root>";
    expect(minify(xml)).toBe("<root><child/></root>");
  });

  it("strips tab-indented whitespace between tags", () => {
    const xml = "<root>\n\t<child/>\n</root>";
    expect(minify(xml)).toBe("<root><child/></root>");
  });

  it("collapses multiple blank lines between tags", () => {
    const xml = "<root>\n\n\n<child/>\n\n\n</root>";
    expect(minify(xml)).toBe("<root><child/></root>");
  });

  it("leaves already-minified xml unchanged", () => {
    const xml = "<root><child/></root>";
    expect(minify(xml)).toBe("<root><child/></root>");
  });
});

describe("text content preservation", () => {
  it("preserves text content between tags", () => {
    const xml = "<root>\n  <p>hello world</p>\n</root>";
    expect(minify(xml)).toBe("<root><p>hello world</p></root>");
  });

  it("preserves multiple spaces inside text content", () => {
    const xml = "<root>\n  <p>hello   world</p>\n</root>";
    expect(minify(xml)).toBe("<root><p>hello   world</p></root>");
  });

  it("preserves attribute values unchanged", () => {
    const xml = '<root>\n  <el attr="a b c"/>\n</root>';
    expect(minify(xml)).toBe('<root><el attr="a b c"/></root>');
  });
});

describe("edge cases", () => {
  it("returns an empty string for empty input", () => {
    expect(minify("")).toBe("");
  });

  it("trims leading and trailing whitespace from the document", () => {
    expect(minify("\n  <root/>\n")).toBe("<root/>");
  });

  it("handles a single self-closing tag with no surrounding whitespace", () => {
    expect(minify("<br/>")).toBe("<br/>");
  });
});

describe("scaffold integration", () => {
  it("produces the same tree shape before and after minify on prettified xml", () => {
    const pretty = `
      <bookstore>
        <book category="cooking">
          <title lang="en">Everyday Italian</title>
        </book>
      </bookstore>
    `;
    const fromPretty = scaffold(pretty);
    const fromMinified = scaffold(minify(pretty));
    expect(JSON.stringify(fromMinified)).toBe(JSON.stringify(fromPretty));
  });
});
