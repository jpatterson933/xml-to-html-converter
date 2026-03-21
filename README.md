# xml-to-html-converter

![version](https://img.shields.io/npm/v/xml-to-html-converter)
![node version](https://img.shields.io/node/v/xml-to-html-converter)
![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![XML](https://img.shields.io/badge/input-XML-orange)
![HTML](https://img.shields.io/badge/output-HTML-red)

A zero-dependency Node.js package for converting XML to HTML.

- **`minify(xml)`** removes prettification whitespace between markup tokens before parsing. Non-whitespace text content and CDATA are left untouched
- **`scaffold(xml)`** reads any XML string and returns a nested node tree
- **`walk(nodes, visitor)`** traverses the full node tree depth-first, visiting every node
- **`render(nodes)`** converts a node tree to an HTML string. Every XML element becomes a `<div>` with `data-tag` and `data-attrs-*` attributes

---

## Install

```bash
npm install xml-to-html-converter
```

---

## Usage

### minify

When your XML comes from a file or an API it is usually indented and line-broken. `minify` removes whitespace-only text nodes that include line breaks when they appear between markup tokens. Text content and CDATA are left completely untouched.

```js
import { minify } from "xml-to-html-converter";

const clean = minify(`
  <bookstore>
    <book category="cooking">
      <title lang="en">Everyday Italian</title>
    </book>
  </bookstore>
`);
// <bookstore><book category="cooking"><title lang="en">Everyday Italian</title></book></bookstore>
```

`minify` is opt-in. Skip it if whitespace-only nodes between markup tokens are meaningful to your use case.

---

### scaffold

`scaffold` parses an XML string into a structured tree of `XmlNode` objects. Each node carries its role, its raw source text, and its position in the document both globally across the full document and locally within its parent.

```js
import { scaffold } from "xml-to-html-converter";

const tree = scaffold(`
  <?xml version="1.0" encoding="UTF-8"?>
  <bookstore>
    <book category="cooking">
      <title lang="en">Everyday Italian</title>
    </book>
  </bookstore>
`);
```

`scaffold` returns a flat array of root-level nodes. Each `openTag` node carries its children nested inside it:

```json
[
  {
    "role": "processingInstruction",
    "raw": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "globalIndex": 0,
    "localIndex": 0
  },
  {
    "role": "openTag",
    "raw": "<bookstore>",
    "globalIndex": 1,
    "localIndex": 1,
    "children": [
      {
        "role": "openTag",
        "raw": "<book category=\"cooking\">",
        "xmlTag": "book",
        "xmlInner": "category=\"cooking\"",
        "xmlAttributes": [{ "name": "category", "value": "cooking" }],
        "globalIndex": 2,
        "localIndex": 0,
        "children": [
          {
            "role": "openTag",
            "raw": "<title lang=\"en\">",
            "xmlTag": "title",
            "xmlInner": "lang=\"en\"",
            "xmlAttributes": [{ "name": "lang", "value": "en" }],
            "globalIndex": 3,
            "localIndex": 0,
            "children": [
              {
                "role": "textLeaf",
                "raw": "Everyday Italian",
                "globalIndex": 4,
                "localIndex": 0
              }
            ]
          }
        ]
      }
    ]
  }
]
```

`scaffold` never throws. Malformed structures are flagged with `malformed: true` in place and the tree is built regardless. See [Malformed XML](#malformed-xml) for details.

---

### walk

`walk` traverses the full node tree depth-first, calling a visitor function on every node including all descendants. The visitor decides what to collect or do. `walk` has no opinions.

```js
import { scaffold, walk } from "xml-to-html-converter";

const tree = scaffold(xml);

// collect all text content
const text = [];
walk(tree, (node) => {
  if (node.role === "textLeaf") text.push(node.raw);
});

// find all nodes with a specific tag
const titles = [];
walk(tree, (node) => {
  if (node.xmlTag === "title") titles.push(node);
});

// check for malformed nodes anywhere in the tree
const broken = [];
walk(tree, (node) => {
  if (node.malformed) broken.push(node);
});
```

---

### render

`render` walks the node tree and converts every XML element to a `<div>`. The original tag name is preserved in `data-tag` and each attribute becomes its own `data-attrs-*` attribute.

```js
import { scaffold, render } from "xml-to-html-converter";

const html = render(
  scaffold(`
  <bookstore>
    <book category="cooking">
      <title lang="en">Everyday Italian</title>
    </book>
  </bookstore>
`),
);
```

```html
<div data-tag="bookstore">
  <div data-tag="book" data-attrs-category="cooking">
    <div data-tag="title" data-attrs-lang="en">Everyday Italian</div>
  </div>
</div>
```

Processing instructions and doctypes are dropped. Comments are passed through unchanged. The output is a raw HTML string — if you are inserting it into a web page, treat it accordingly.

---

### Full pipeline

```js
import { minify, scaffold, walk, render } from "xml-to-html-converter";

const tree = scaffold(minify(xml));

walk(tree, (node) => {
  if (node.malformed) console.warn("malformed node", node.raw);
});

const html = render(tree);
```

---

## Node Shape

Every node in the tree has the following fields:

| Field           | Type             | Description                                                                                                           |
| --------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `role`          | `XmlNodeRole`    | What kind of node this is                                                                                             |
| `raw`           | `string`         | The exact source string, untouched                                                                                    |
| `xmlTag`        | `string`         | Tag name only, e.g. `"book"` or `"env:Envelope"`. Present on `openTag`, `selfTag`, and `closeTag`                     |
| `xmlInner`      | `string`         | Everything after the tag name inside the brackets, verbatim. Present on `openTag` and `selfTag` when attributes exist |
| `xmlAttributes` | `XmlAttribute[]` | Parsed array of `{ name, value }` attribute objects. Present on `openTag` and `selfTag` when attributes exist         |
| `globalIndex`   | `number`         | Position in the entire document (never resets)                                                                        |
| `localIndex`    | `number`         | Position within the parent's children array                                                                           |
| `children`      | `XmlNode[]`      | Present only on `openTag` - the nested nodes inside                                                                   |
| `malformed`     | `true`           | Present only when the structure is broken                                                                             |

---

## Node Roles

| Role                    | Has children | Description                                         |
| ----------------------- | ------------ | --------------------------------------------------- |
| `openTag`               | yes          | An opening tag, e.g. `<book category="web">`        |
| `selfTag`               | no           | A self-closing tag, e.g. `<br/>`                    |
| `closeTag`              | no           | Only appears when stray (no matching open)          |
| `processingInstruction` | no           | e.g. `<?xml version="1.0"?>`                        |
| `comment`               | no           | e.g. `<!-- a comment -->`                           |
| `textLeaf`              | no           | Text content between tags, including CDATA sections |
| `doctype`               | no           | e.g. `<!DOCTYPE html>` or `<!DOCTYPE root [...]>`   |

---

## Malformed XML

`scaffold` never throws. No matter what the input looks like, it always returns a complete tree. Malformed structures are flagged with `malformed: true` in place and the walk continues.

Eight cases are handled:

- **Unclosed tags** - opens but never closes, gets `malformed: true`, children are still collected
- **Stray closing tags** - a `</tag>` with no matching open surfaces as a `closeTag` token with `malformed: true`
- **Unclosed brackets** - a `<` with no matching `>` captures the remainder as a malformed token
- **Malformed attributes** - unquoted values (`<tag attr=unquoted>`), invalid separators (`<tag a="1"b="2">`), trailing junk after valid attributes (`<tag a="1" junk>`), and unclosed quoted values all flag the node `malformed: true`; any valid attributes parsed before the error are preserved
- **Unclosed processing instructions** - `<?xml ...` with no `?>` captures the remainder as a malformed token
- **Unclosed comments** - `<!-- ...` with no `-->` captures the remainder as a malformed token
- **Unclosed CDATA** - `<![CDATA[ ...` with no `]]>` captures the remainder as a malformed token
- **Excessive nesting** - documents nested beyond 500 levels have the deepest open tag flagged `malformed: true` to prevent a stack overflow

```js
const tree = scaffold("<root><unclosed><valid>text</valid></root>");
```

```json
[
  {
    "role": "openTag",
    "raw": "<root>",
    "globalIndex": 0,
    "localIndex": 0,
    "malformed": true,
    "children": [
      {
        "role": "openTag",
        "raw": "<unclosed>",
        "globalIndex": 1,
        "localIndex": 0,
        "malformed": true,
        "children": [
          {
            "role": "openTag",
            "raw": "<valid>",
            "globalIndex": 2,
            "localIndex": 0,
            "children": [
              {
                "role": "textLeaf",
                "raw": "text",
                "globalIndex": 3,
                "localIndex": 0
              }
            ]
          }
        ]
      }
    ]
  }
]
```

---

## Exports

```ts
import {
  minify,
  scaffold,
  walk,
  render,
  isMalformed,
} from "xml-to-html-converter";
import type {
  XmlNode,
  XmlNodeRole,
  XmlAttribute,
  MalformedXmlNode,
} from "xml-to-html-converter";
```

| Export             | Kind     | Description                                             |
| ------------------ | -------- | ------------------------------------------------------- |
| `minify`           | function | Strips inter-tag whitespace from an XML string          |
| `scaffold`         | function | Parses an XML string and returns a node tree            |
| `walk`             | function | Traverses a node tree depth-first with a visitor        |
| `render`           | function | Converts a node tree to an HTML string                  |
| `isMalformed`      | function | Type guard that narrows `XmlNode` to `MalformedXmlNode` |
| `XmlNode`          | type     | The shape of every node in the tree                     |
| `XmlNodeRole`      | type     | Union of all valid role strings                         |
| `XmlAttribute`     | type     | Shape of a parsed attribute `{ name, value }`           |
| `MalformedXmlNode` | type     | `XmlNode` narrowed to nodes where `malformed` is `true` |

---

## Requirements

Node.js `>=20.0.0`

---

![license](https://img.shields.io/npm/l/xml-to-html-converter)
