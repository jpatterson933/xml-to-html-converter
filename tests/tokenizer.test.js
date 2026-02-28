import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, TokenType } from '../src/tokenizer.js';

test('tokenizes a processing instruction', () => {
  const tokens = tokenize('<?xml version="1.0" encoding="UTF-8"?>');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.PROCESSING_INSTRUCTION);
  assert.equal(tokens[0].target, 'xml');
  assert.equal(tokens[0].attributes.version, '1.0');
  assert.equal(tokens[0].attributes.encoding, 'UTF-8');
});

test('tokenizes an element open tag', () => {
  const tokens = tokenize('<bookstore>');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.ELEMENT_OPEN);
  assert.equal(tokens[0].tag, 'bookstore');
});

test('tokenizes an element open tag with attributes', () => {
  const tokens = tokenize('<book category="cooking">');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.ELEMENT_OPEN);
  assert.equal(tokens[0].tag, 'book');
  assert.equal(tokens[0].attributes.category, 'cooking');
});

test('tokenizes an element close tag', () => {
  const tokens = tokenize('</bookstore>');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.ELEMENT_CLOSE);
  assert.equal(tokens[0].tag, 'bookstore');
});

test('tokenizes a self-closing tag', () => {
  const tokens = tokenize('<br/>');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.SELF_CLOSING);
  assert.equal(tokens[0].tag, 'br');
});

test('tokenizes a self-closing tag with attributes', () => {
  const tokens = tokenize('<img src="photo.jpg" alt="A photo"/>');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.SELF_CLOSING);
  assert.equal(tokens[0].tag, 'img');
  assert.equal(tokens[0].attributes.src, 'photo.jpg');
  assert.equal(tokens[0].attributes.alt, 'A photo');
});

test('tokenizes a text node', () => {
  const tokens = tokenize('<title>Everyday Italian</title>');
  assert.equal(tokens.length, 3);
  assert.equal(tokens[1].type, TokenType.TEXT);
  assert.equal(tokens[1].value, 'Everyday Italian');
});

test('tokenizes a comment', () => {
  const tokens = tokenize('<!-- this is a comment -->');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.COMMENT);
  assert.equal(tokens[0].value, ' this is a comment ');
});

test('tokenizes a cdata section', () => {
  const tokens = tokenize('<![CDATA[x < y && y > z]]>');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.CDATA);
  assert.equal(tokens[0].value, 'x < y && y > z');
});

test('tokenizes a sequence of mixed tokens', () => {
  const tokens = tokenize('<root><child>text</child></root>');
  assert.equal(tokens.length, 5);
  assert.equal(tokens[0].type, TokenType.ELEMENT_OPEN);
  assert.equal(tokens[1].type, TokenType.ELEMENT_OPEN);
  assert.equal(tokens[2].type, TokenType.TEXT);
  assert.equal(tokens[3].type, TokenType.ELEMENT_CLOSE);
  assert.equal(tokens[4].type, TokenType.ELEMENT_CLOSE);
});

test('produces a malformed token for an unclosed tag bracket', () => {
  const tokens = tokenize('<unclosed');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.MALFORMED);
});

test('never throws on any input', () => {
  assert.doesNotThrow(() => tokenize(''));
  assert.doesNotThrow(() => tokenize('<'));
  assert.doesNotThrow(() => tokenize('<<>>'));
  assert.doesNotThrow(() => tokenize('<!-'));
  assert.doesNotThrow(() => tokenize('<![CDATA[no close'));
  assert.doesNotThrow(() => tokenize('<?no close'));
  assert.doesNotThrow(() => tokenize('random text with no tags'));
});

test('tokenizes text with no following tag as a text node', () => {
  const tokens = tokenize('just some text');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.TEXT);
  assert.equal(tokens[0].value, 'just some text');
});

test('skips whitespace-only text between tags', () => {
  const tokens = tokenize('<a>   </a>');
  const textTokens = tokens.filter(t => t.type === TokenType.TEXT);
  assert.equal(textTokens.length, 0);
});

test('tokenizes a processing instruction with no attributes', () => {
  const tokens = tokenize('<?xml?>');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.PROCESSING_INSTRUCTION);
  assert.equal(tokens[0].target, 'xml');
});

test('tokenizes an unclosed processing instruction as malformed', () => {
  const tokens = tokenize('<?xml no closing');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.MALFORMED);
  assert.equal(tokens[0].raw, '<?xml no closing');
});

test('tokenizes an unclosed comment as malformed', () => {
  const tokens = tokenize('<!-- no closing');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.MALFORMED);
  assert.equal(tokens[0].raw, '<!-- no closing');
});

test('tokenizes an unclosed cdata section as malformed', () => {
  const tokens = tokenize('<![CDATA[no closing');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, TokenType.MALFORMED);
  assert.equal(tokens[0].raw, '<![CDATA[no closing');
});
