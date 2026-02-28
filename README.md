# xml-to-html-converter

![version](https://img.shields.io/npm/v/xml-to-html-converter)
![node version](https://img.shields.io/node/v/xml-to-html-converter)
![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![XML](https://img.shields.io/badge/input-XML-orange)
![HTML](https://img.shields.io/badge/output-HTML-red)

A zero-dependency Node.js package for converting XML to HTML. Currently in pre-1.0.0 development, building the foundation one functional part at a time. Full XML-to-HTML conversion is the goal of `v1.0.0`.

---

## v0.1.x: XML Node Extraction & Scaffolding

Version `0.1.x` is focused entirely on parsing raw XML into a structured tree of nodes. The `scaffold` function walks an XML string and produces an array of `XmlNode` objects, each carrying its role, its raw source text, and its position in the document, both globally across the full document and locally within its parent.

```ts
interface XmlNode {
  role: XmlNodeRole;
  raw: string;
  globalIndex: number;
  localIndex: number;
  children?: XmlNode[];
  malformed?: true;
}

type XmlNodeRole =
  | "closeTag"
  | "comment"
  | "doctype"
  | "openTag"
  | "processingInstruction"
  | "selfTag"
  | "textLeaf";
```

This scaffold is the foundation everything else will be built on. No transformation, no HTML output, no opinions about content, just an accurate, traversable representation of what the XML says.

---

> **Where I am right now**
>
> `v0.x` is building the scaffold: a structural tree of every node in your XML document, each carrying its raw source string and its exact position in the document. This scaffold is what the HTML converter will walk when it's built.
>
> - **`scaffold(xml)`** reads any XML string and returns a nested node tree
> - Every node knows its `role`, its `raw` source string, its `globalIndex` in the document, and its `localIndex` within its parent
> - Broken XML is never thrown - malformed nodes are flagged with `malformed: true` in place and the tree is built regardless
>
> `v1.0.0` is when this package becomes what it says it is: a full XML-to-HTML converter. Everything before that is the work to get there.

---

## Install

```bash
npm install xml-to-html-converter
```

---

## Usage

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
        "globalIndex": 2,
        "localIndex": 0,
        "children": [
          {
            "role": "openTag",
            "raw": "<title lang=\"en\">",
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

---

## Node Shape

Every node in the tree has the following fields:

| Field         | Type          | Description                                         |
| ------------- | ------------- | --------------------------------------------------- |
| `role`        | `XmlNodeRole` | What kind of node this is                           |
| `raw`         | `string`      | The exact source string, untouched                  |
| `globalIndex` | `number`      | Position in the entire document (never resets)      |
| `localIndex`  | `number`      | Position within the parent's children array         |
| `children`    | `XmlNode[]`   | Present only on `openTag` - the nested nodes inside |
| `malformed`   | `true`        | Present only when the structure is broken           |

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

Three cases are handled:

- **Unclosed tags** - opens but never closes, gets `malformed: true`, children are still collected
- **Stray closing tags** - a `</tag>` with no matching open surfaces as a `closeTag` token with `malformed: true`
- **Unclosed brackets** - a `<` with no matching `>` captures the remainder as a malformed token

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
import { scaffold, isMalformed } from "xml-to-html-converter";
import type {
  XmlNode,
  XmlNodeRole,
  MalformedXmlNode,
} from "xml-to-html-converter";
```

| Export             | Kind     | Description                                         |
| ------------------ | -------- | --------------------------------------------------- |
| `scaffold`         | function | Parses an XML string and returns a node tree        |
| `isMalformed`      | function | Type guard, narrows `XmlNode` to `MalformedXmlNode` |
| `XmlNode`          | type     | The shape of every node in the tree                 |
| `XmlNodeRole`      | type     | Union of all valid role strings                     |
| `MalformedXmlNode` | type     | `XmlNode` narrowed to `{ malformed: true }`         |

---

## Requirements

Node.js `>=20.0.0`

---

![license](https://img.shields.io/npm/l/xml-to-html-converter)
