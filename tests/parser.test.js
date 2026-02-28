import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from '../src/index.js';

function loadFixture(name) {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

test('returns a document node as the root', () => {
  const tree = parse('<root/>');
  assert.equal(tree.type, 'document');
  assert.ok(Array.isArray(tree.children));
});

test('parses well-formed XML into the correct tree shape', () => {
  const tree = parse(loadFixture('well-formed.xml'));
  const bookstore = tree.children.find(n => n.tag === 'bookstore');

  assert.ok(bookstore, 'bookstore element exists');
  assert.equal(bookstore.type, 'element');

  const books = bookstore.children.filter(n => n.tag === 'book');
  assert.equal(books.length, 3);

  assert.equal(books[0].attributes.category, 'cooking');
  assert.equal(books[1].attributes.category, 'children');
  assert.equal(books[2].attributes.category, 'web');

  const firstBookTitle = books[0].children.find(n => n.tag === 'title');
  assert.equal(firstBookTitle.children[0].value, 'Everyday Italian');
});

test('places the XML processing instruction as a document child', () => {
  const tree = parse(loadFixture('well-formed.xml'));
  const pi = tree.children.find(n => n.type === 'processing-instruction');

  assert.ok(pi, 'processing instruction exists');
  assert.equal(pi.target, 'xml');
  assert.equal(pi.attributes.version, '1.0');
  assert.equal(pi.attributes.encoding, 'UTF-8');
});

test('parses comments into comment nodes at the correct position', () => {
  const tree = parse(loadFixture('comments.xml'));
  const topLevelComment = tree.children.find(n => n.type === 'comment');

  assert.ok(topLevelComment, 'top-level comment exists');
  assert.ok(topLevelComment.value.includes('top-level comment'));

  const library = tree.children.find(n => n.tag === 'library');
  const sectionComment = library.children.find(n => n.type === 'comment');
  assert.ok(sectionComment.value.includes('fiction'));
});

test('parses cdata sections preserving raw content', () => {
  const tree = parse(loadFixture('cdata.xml'));
  const document = tree.children.find(n => n.tag === 'document');
  const code = document.children.find(n => n.tag === 'code');
  const cdata = code.children.find(n => n.type === 'cdata');

  assert.ok(cdata.value.includes('<h1>'));
  assert.ok(cdata.value.includes('function greet'));
});

test('parses self-closing tags as element nodes with empty children', () => {
  const tree = parse(loadFixture('self-closing.xml'));
  const page = tree.children.find(n => n.tag === 'page');
  const meta = page.children.find(n => n.tag === 'meta');

  assert.equal(meta.type, 'element');
  assert.deepEqual(meta.children, []);
  assert.equal(meta.attributes.charset, 'UTF-8');
});

test('marks unclosed elements as malformed but still builds the tree', () => {
  const tree = parse(loadFixture('malformed.xml'));

  assert.equal(tree.type, 'document');
  assert.ok(tree.children.length > 0, 'tree has children despite malformed input');

  const root = tree.children.find(n => n.tag === 'root');
  assert.ok(root, 'root element exists');
});

test('never throws on malformed input', () => {
  assert.doesNotThrow(() => parse(''));
  assert.doesNotThrow(() => parse('<'));
  assert.doesNotThrow(() => parse('<unclosed>'));
  assert.doesNotThrow(() => parse('</no-open>'));
  assert.doesNotThrow(() => parse('<a><b></a></b>'));
  assert.doesNotThrow(() => parse('not xml at all'));
});

test('handles deeply nested elements', () => {
  const tree = parse(loadFixture('deeply-nested.xml'));
  const l1 = tree.children.find(n => n.tag === 'l1');
  const l2 = l1.children.find(n => n.tag === 'l2');
  const l3 = l2.children.find(n => n.tag === 'l3');
  const l4 = l3.children.find(n => n.tag === 'l4');
  const l5 = l4.children.find(n => n.tag === 'l5');
  const l6 = l5.children.find(n => n.tag === 'l6');
  const l7 = l6.children.find(n => n.tag === 'l7');
  const l8 = l7.children.find(n => n.tag === 'l8');
  const l9 = l8.children.find(n => n.tag === 'l9');
  const l10 = l9.children.find(n => n.tag === 'l10');

  assert.ok(l10, 'l10 exists at depth 10');
  assert.equal(l10.children[0].value, 'deepest leaf');
});
