# xml-to-html-converter

![version](https://img.shields.io/badge/version-0.1.1-blue)
![node version](https://img.shields.io/node/v/xml-to-html-converter)
![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![XML](https://img.shields.io/badge/input-XML-orange)
![HTML](https://img.shields.io/badge/output-HTML-red)

A zero-dependency Node.js package for converting XML to HTML. Currently in pre-1.0.0 development, building the foundation one functional part at a time. Full XML-to-HTML conversion is the goal of `v1.0.0`, but for now, I will be building 0 dependency tools that will eventually be used to convert an xml to html.

---

> **Where I am right now**
>
> The goal of this package is to take any XML document and convert it to HTML. Currently, I am building the foundation which is taking an xml doc of any kind, and turning it into a json object otherwise known as a document node.
>
> What `v0.x` builds is the foundation that makes `v1.0.0` possible:
>
> - **A parser** takes any XML string and returns a plain JS document tree
> - **A fault-tolerant verifier** flags every broken node with `malformed: true` in-place, giving you a complete map of exactly where and what broke
> - **An intermediate representation** is a plain JS object tree that the HTML converter will walk when it's built
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
import { parse } from "xml-to-html-converter";

const tree = parse(`
  <?xml version="1.0" encoding="UTF-8"?>
  <bookstore>
    <book category="cooking">
      <title lang="en">Everyday Italian</title>
      <author>Giada De Laurentiis</author>
    </book>
  </bookstore>
`);
```

`parse` returns a document node wrapping the full tree:

```json
{
  "type": "document",
  "children": [
    {
      "type": "processing-instruction",
      "target": "xml",
      "attributes": { "version": "1.0", "encoding": "UTF-8" }
    },
    {
      "type": "element",
      "tag": "bookstore",
      "attributes": {},
      "children": [
        {
          "type": "element",
          "tag": "book",
          "attributes": { "category": "cooking" },
          "children": [
            {
              "type": "element",
              "tag": "title",
              "attributes": { "lang": "en" },
              "children": [{ "type": "text", "value": "Everyday Italian" }]
            },
            {
              "type": "element",
              "tag": "author",
              "attributes": {},
              "children": [{ "type": "text", "value": "Giada De Laurentiis" }]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Node Types

Every node in the tree has a `type` field.

| Type                     | Properties                      |
| ------------------------ | ------------------------------- |
| `document`               | `children`                      |
| `element`                | `tag`, `attributes`, `children` |
| `text`                   | `value`                         |
| `comment`                | `value`                         |
| `cdata`                  | `value`                         |
| `processing-instruction` | `target`, `attributes`          |
| `malformed`              | `raw`, `malformed: true`        |

---

## Malformed XML

The parser never throws. No matter what the input looks like, it always returns a complete document tree. I built this because when working with QTI and xsd validation, it was a pain to get things to work and I could never get past the current industries package standards. Additionally, falling down a Java rabbit hole was not something I enjoyed AT ALL. Therefore, malformed structures are flagged with `malformed: true` in-place and the walk continues. The tree is built no matter what your xml looks like.

Three types of malformed input are caught:

- **Unclosed tags** - a tag that opens but never closes gets `malformed: true`, its children are still collected normally
- **Stray closing tags** - a `</tag>` with no matching open becomes a `{ type: 'malformed', raw: '...</tag>', malformed: true }` node at that position
- **Unclosed brackets** - a `<` with no matching `>` before end of string captures the remainder as a malformed node

```js
const tree = parse("<root><unclosed><valid>text</valid></root>");
```

```json
{
  "type": "document",
  "children": [
    {
      "type": "element",
      "tag": "root",
      "attributes": {},
      "children": [
        {
          "type": "element",
          "tag": "unclosed",
          "attributes": {},
          "malformed": true,
          "children": [
            {
              "type": "element",
              "tag": "valid",
              "attributes": {},
              "children": [{ "type": "text", "value": "text" }]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Requirements

Node.js `>=18.0.0`

---

![license](https://img.shields.io/badge/license-ISC-green)
