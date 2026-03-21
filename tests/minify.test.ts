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

  it("does not collapse spaces between literal > and < characters inside text content", () => {
    const xml = "<p>2 >   < 3</p>";
    expect(minify(xml)).toBe("<p>2 >   < 3</p>");
  });

  it("does not collapse newline-separated > and < characters inside text content", () => {
    const xml = "<p>2 >\n< 3</p>";
    expect(minify(xml)).toBe("<p>2 >\n< 3</p>");
  });

  it("does not modify newline content inside CDATA", () => {
    const xml = "<p><![CDATA[a>\n< b]]></p>";
    expect(minify(xml)).toBe("<p><![CDATA[a>\n< b]]></p>");
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

  it("keeps malformed markup constructs intact and only trims document edges", () => {
    const malformedInputs = [
      "<root",
      "<!-- never closed",
      "<?xml version='1.0'",
      "<![CDATA[never closed",
    ];
    for (const xml of malformedInputs) {
      expect(minify(`\n${xml}\n`)).toBe(xml);
    }
  });

  it("keeps doctype internal subset content untouched while removing surrounding prettification", () => {
    const xml = `<!DOCTYPE root [
<!ELEMENT root (#PCDATA)>
]>
<root>
  <child/>
</root>`;
    expect(minify(xml)).toBe(
      "<!DOCTYPE root [\n<!ELEMENT root (#PCDATA)>\n]><root><child/></root>",
    );
  });

  it("removes newline gaps around comments but preserves comment body exactly", () => {
    const xml = `<a/>
<!-- line 1
line 2 -->
<b/>`;
    expect(minify(xml)).toBe("<a/><!-- line 1\nline 2 --><b/>");
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
