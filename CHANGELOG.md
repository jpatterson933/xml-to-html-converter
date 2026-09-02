# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [Semantic Versioning](https://semver.org/).

## [0.5.0] - Unreleased

This release changes the default output of `scaffold` for pretty-printed input. Read the **Changed** section before upgrading.

### Changed

#### `scaffold` no longer drops whitespace-only text nodes

**Before 0.5.0.** `scaffold` silently discarded every text node that consisted only of whitespace, whether or not you had called `minify`. Indentation between tags was dropped, but so was a single space between inline elements and the content of an element that held only spaces.

```js
scaffold("<p>Hello <b>big</b> <i>world</i></p>")[0].children.map((c) => c.raw);
// 0.4.x: ["Hello ", "<b>", "<i>"]        the space between </b> and <i> is lost
// 0.5.0: ["Hello ", "<b>", " ", "<i>"]

scaffold("<pre>   </pre>")[0].children.length;
// 0.4.x: 0
// 0.5.0: 1                                a textLeaf with raw "   "
```

**From 0.5.0.** `scaffold` keeps every text node. Whitespace-only text between tags becomes a `textLeaf` like any other text. Removing prettification whitespace is now the sole job of `minify`, which is opt-in exactly as the README has always described.

**What you will see if you parse pretty-printed XML without `minify`:**

- New `textLeaf` nodes appear between elements, holding the line breaks and indentation.
- `globalIndex` values shift for every node after the first whitespace node.
- `localIndex` values and `children` positions shift. Code that indexes into `children[n]` on pretty-printed input will point at different nodes.
- Leading and trailing whitespace of the whole document appears as root-level `textLeaf` nodes.
- `render` output for pretty-printed input now contains the original line breaks and indentation between `<div>` elements. This is harmless in a browser but the string is no longer compact.

**How to keep the previous tree shape.** Pass the input through `minify` first:

```js
const tree = scaffold(minify(xml));
```

For pretty-printed input, where every whitespace-only run between tags contains a line break, this produces the same tree that `scaffold(xml)` produced in 0.4.x. Two inputs differ:

- Whitespace-only text without a line break, such as the space in `</b> <i>` or the content of `<pre>   </pre>`, is kept by `minify` and was dropped by 0.4.x `scaffold`. This is the whitespace that belongs to the document, and keeping it is the point of this release.
- `minify` also trims leading and trailing whitespace from the whole document, which 0.4.x `scaffold` did as a side effect of dropping whitespace nodes.

### Fixed

#### `render` no longer emits CDATA wrappers into HTML

HTML has no CDATA sections outside foreign content. A browser reads `<![CDATA[` as the start of a bogus comment that runs to the next `>`, so CDATA content was split, partly hidden inside a comment, and partly leaked as text.

```js
render(scaffold("<code><![CDATA[x < y && y > z]]></code>"));
// 0.4.x: <div data-tag="code"><![CDATA[x < y && y > z]]></div>
//        a browser sees a comment "[CDATA[x < y && y " and the text " z]]>"
// 0.5.0: <div data-tag="code">x &lt; y &amp;&amp; y &gt; z</div>
//        a browser sees the text "x < y && y > z"
```

`render` now unwraps CDATA and escapes `<`, `>`, and `&` in the content so it displays literally. This applies only to `textLeaf` nodes whose raw string begins with `<![CDATA[`. All other text is emitted verbatim as before. The `scaffold` tree is unchanged: `textLeaf.raw` still holds the full `<![CDATA[...]]>` string.

#### `render` escapes double quotes in attribute values

Valid XML may carry a double quote inside a single-quoted attribute. `render` always writes attribute values inside double quotes, so the value was cut short and the remainder became a junk attribute.

```js
render(scaffold(`<a title='say "hi"'/>`));
// 0.4.x: <div data-tag="a" data-attrs-title="say "hi""></div>
//        a browser sees data-attrs-title="say " plus a junk attribute named hi""
// 0.5.0: <div data-tag="a" data-attrs-title="say &quot;hi&quot;"></div>
```

Only `"` is escaped. Single quotes and existing entities such as `&amp;` are written verbatim as before.

#### TypeScript types resolve correctly for CommonJS consumers

The build already emitted `dist/index.d.cts`, but the `exports` map pointed every consumer at the ESM declaration file. TypeScript projects using `require` with `moduleResolution: node16` or `nodenext` saw a module masquerading as ESM. The `require` condition now points at `dist/index.d.cts`. No change for ESM or bundler consumers.

### Added

- `CHANGELOG.md`, this file.
- Tests covering whitespace preservation in `scaffold`, CDATA and attribute quoting in `render`, and the difference in output with and without `minify`.

### Migration checklist

- [ ] If you call `scaffold` on XML read from a file or an API, decide whether you want the whitespace nodes. If not, change `scaffold(xml)` to `scaffold(minify(xml))`.
- [ ] If you index into `children[n]` or compare `globalIndex` values on pretty-printed input, re-check those positions or minify first.
- [ ] If you post-process `render` output to strip `<![CDATA[` and `]]>`, remove that step.
- [ ] If you are a TypeScript CommonJS consumer, no action is needed. Types now resolve without workarounds.
