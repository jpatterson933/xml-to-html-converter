import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parse } from '../src/index';
import type { ElementNode, CommentNode, TextNode, CDataNode } from '../src/index';

function loadFixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

describe('parser', () => {
  it('returns a document node as the root', () => {
    const tree = parse('<root/>');
    expect(tree.type).toBe('document');
    expect(Array.isArray(tree.children)).toBe(true);
  });

  it('parses well-formed XML into the correct tree shape', () => {
    const tree = parse(loadFixture('well-formed.xml'));
    const bookstore = tree.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'bookstore') as ElementNode;

    expect(bookstore).toBeTruthy();
    expect(bookstore.type).toBe('element');

    const books = bookstore.children.filter(n => n.type === 'element' && (n as ElementNode).tag === 'book') as ElementNode[];
    expect(books.length).toBe(3);

    expect(books[0].attributes.category).toBe('cooking');
    expect(books[1].attributes.category).toBe('children');
    expect(books[2].attributes.category).toBe('web');

    const firstBookTitle = books[0].children.find(n => n.type === 'element' && (n as ElementNode).tag === 'title') as ElementNode;
    expect((firstBookTitle.children[0] as TextNode).value).toBe('Everyday Italian');
  });

  it('places the XML processing instruction as a document child', () => {
    const tree = parse(loadFixture('well-formed.xml'));
    const pi = tree.children.find(n => n.type === 'processing-instruction');

    expect(pi).toBeTruthy();
    if (pi?.type === 'processing-instruction') {
      expect(pi.target).toBe('xml');
      expect(pi.attributes.version).toBe('1.0');
      expect(pi.attributes.encoding).toBe('UTF-8');
    }
  });

  it('parses comments into comment nodes at the correct position', () => {
    const tree = parse(loadFixture('comments.xml'));
    const topLevelComment = tree.children.find(n => n.type === 'comment') as CommentNode;

    expect(topLevelComment).toBeTruthy();
    expect(topLevelComment.value).toContain('top-level comment');

    const library = tree.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'library') as ElementNode;
    const sectionComment = library.children.find(n => n.type === 'comment') as CommentNode;
    expect(sectionComment.value).toContain('fiction');
  });

  it('parses cdata sections preserving raw content', () => {
    const tree = parse(loadFixture('cdata.xml'));
    const doc = tree.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'document') as ElementNode;
    const code = doc.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'code') as ElementNode;
    const cdataNode = code.children.find(n => n.type === 'cdata') as CDataNode;

    expect(cdataNode.value).toContain('<h1>');
    expect(cdataNode.value).toContain('function greet');
  });

  it('parses self-closing tags as element nodes with empty children', () => {
    const tree = parse(loadFixture('self-closing.xml'));
    const page = tree.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'page') as ElementNode;
    const meta = page.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'meta') as ElementNode;

    expect(meta.type).toBe('element');
    expect(meta.children).toEqual([]);
    expect(meta.attributes.charset).toBe('UTF-8');
  });

  it('marks unclosed elements as malformed but still builds the tree', () => {
    const tree = parse(loadFixture('malformed.xml'));

    expect(tree.type).toBe('document');
    expect(tree.children.length).toBeGreaterThan(0);

    const root = tree.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'root') as ElementNode;
    expect(root).toBeTruthy();
  });

  it('never throws on malformed input', () => {
    expect(() => parse('')).not.toThrow();
    expect(() => parse('<')).not.toThrow();
    expect(() => parse('<unclosed>')).not.toThrow();
    expect(() => parse('</no-open>')).not.toThrow();
    expect(() => parse('<a><b></a></b>')).not.toThrow();
    expect(() => parse('not xml at all')).not.toThrow();
  });

  it('handles deeply nested elements', () => {
    const tree = parse(loadFixture('deeply-nested.xml'));
    const l1 = tree.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'l1') as ElementNode;
    const l2 = l1.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'l2') as ElementNode;
    const l3 = l2.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'l3') as ElementNode;
    const l4 = l3.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'l4') as ElementNode;
    const l5 = l4.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'l5') as ElementNode;
    const l6 = l5.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'l6') as ElementNode;
    const l7 = l6.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'l7') as ElementNode;
    const l8 = l7.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'l8') as ElementNode;
    const l9 = l8.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'l9') as ElementNode;
    const l10 = l9.children.find(n => n.type === 'element' && (n as ElementNode).tag === 'l10') as ElementNode;

    expect(l10).toBeTruthy();
    expect((l10.children[0] as TextNode).value).toBe('deepest leaf');
  });
});
