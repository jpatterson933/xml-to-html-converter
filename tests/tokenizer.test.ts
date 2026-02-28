import { describe, it, expect } from 'vitest';
import { tokenize, TokenType } from '../src/tokenizer';

describe('tokenizer', () => {
  it('tokenizes a processing instruction', () => {
    const tokens = tokenize('<?xml version="1.0" encoding="UTF-8"?>');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.PROCESSING_INSTRUCTION);
    if (tokens[0].type === TokenType.PROCESSING_INSTRUCTION) {
      expect(tokens[0].target).toBe('xml');
      expect(tokens[0].attributes.version).toBe('1.0');
      expect(tokens[0].attributes.encoding).toBe('UTF-8');
    }
  });

  it('tokenizes an element open tag', () => {
    const tokens = tokenize('<bookstore>');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.ELEMENT_OPEN);
    if (tokens[0].type === TokenType.ELEMENT_OPEN) {
      expect(tokens[0].tag).toBe('bookstore');
    }
  });

  it('tokenizes an element open tag with attributes', () => {
    const tokens = tokenize('<book category="cooking">');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.ELEMENT_OPEN);
    if (tokens[0].type === TokenType.ELEMENT_OPEN) {
      expect(tokens[0].tag).toBe('book');
      expect(tokens[0].attributes.category).toBe('cooking');
    }
  });

  it('tokenizes an element close tag', () => {
    const tokens = tokenize('</bookstore>');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.ELEMENT_CLOSE);
    if (tokens[0].type === TokenType.ELEMENT_CLOSE) {
      expect(tokens[0].tag).toBe('bookstore');
    }
  });

  it('tokenizes a self-closing tag', () => {
    const tokens = tokenize('<br/>');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.SELF_CLOSING);
    if (tokens[0].type === TokenType.SELF_CLOSING) {
      expect(tokens[0].tag).toBe('br');
    }
  });

  it('tokenizes a self-closing tag with attributes', () => {
    const tokens = tokenize('<img src="photo.jpg" alt="A photo"/>');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.SELF_CLOSING);
    if (tokens[0].type === TokenType.SELF_CLOSING) {
      expect(tokens[0].tag).toBe('img');
      expect(tokens[0].attributes.src).toBe('photo.jpg');
      expect(tokens[0].attributes.alt).toBe('A photo');
    }
  });

  it('tokenizes a text node', () => {
    const tokens = tokenize('<title>Everyday Italian</title>');
    expect(tokens.length).toBe(3);
    expect(tokens[1].type).toBe(TokenType.TEXT);
    if (tokens[1].type === TokenType.TEXT) {
      expect(tokens[1].value).toBe('Everyday Italian');
    }
  });

  it('tokenizes a comment', () => {
    const tokens = tokenize('<!-- this is a comment -->');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.COMMENT);
    if (tokens[0].type === TokenType.COMMENT) {
      expect(tokens[0].value).toBe(' this is a comment ');
    }
  });

  it('tokenizes a cdata section', () => {
    const tokens = tokenize('<![CDATA[x < y && y > z]]>');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.CDATA);
    if (tokens[0].type === TokenType.CDATA) {
      expect(tokens[0].value).toBe('x < y && y > z');
    }
  });

  it('tokenizes a sequence of mixed tokens', () => {
    const tokens = tokenize('<root><child>text</child></root>');
    expect(tokens.length).toBe(5);
    expect(tokens[0].type).toBe(TokenType.ELEMENT_OPEN);
    expect(tokens[1].type).toBe(TokenType.ELEMENT_OPEN);
    expect(tokens[2].type).toBe(TokenType.TEXT);
    expect(tokens[3].type).toBe(TokenType.ELEMENT_CLOSE);
    expect(tokens[4].type).toBe(TokenType.ELEMENT_CLOSE);
  });

  it('produces a malformed token for an unclosed tag bracket', () => {
    const tokens = tokenize('<unclosed');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.MALFORMED);
  });

  it('never throws on any input', () => {
    expect(() => tokenize('')).not.toThrow();
    expect(() => tokenize('<')).not.toThrow();
    expect(() => tokenize('<<>>')).not.toThrow();
    expect(() => tokenize('<!-')).not.toThrow();
    expect(() => tokenize('<![CDATA[no close')).not.toThrow();
    expect(() => tokenize('<?no close')).not.toThrow();
    expect(() => tokenize('random text with no tags')).not.toThrow();
  });

  it('tokenizes text with no following tag as a text node', () => {
    const tokens = tokenize('just some text');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.TEXT);
    if (tokens[0].type === TokenType.TEXT) {
      expect(tokens[0].value).toBe('just some text');
    }
  });

  it('skips whitespace-only text between tags', () => {
    const tokens = tokenize('<a>   </a>');
    const textTokens = tokens.filter(t => t.type === TokenType.TEXT);
    expect(textTokens.length).toBe(0);
  });

  it('tokenizes a processing instruction with no attributes', () => {
    const tokens = tokenize('<?xml?>');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.PROCESSING_INSTRUCTION);
    if (tokens[0].type === TokenType.PROCESSING_INSTRUCTION) {
      expect(tokens[0].target).toBe('xml');
    }
  });

  it('tokenizes an unclosed processing instruction as malformed', () => {
    const tokens = tokenize('<?xml no closing');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.MALFORMED);
    if (tokens[0].type === TokenType.MALFORMED) {
      expect(tokens[0].raw).toBe('<?xml no closing');
    }
  });

  it('tokenizes an unclosed comment as malformed', () => {
    const tokens = tokenize('<!-- no closing');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.MALFORMED);
    if (tokens[0].type === TokenType.MALFORMED) {
      expect(tokens[0].raw).toBe('<!-- no closing');
    }
  });

  it('tokenizes an unclosed cdata section as malformed', () => {
    const tokens = tokenize('<![CDATA[no closing');
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.MALFORMED);
    if (tokens[0].type === TokenType.MALFORMED) {
      expect(tokens[0].raw).toBe('<![CDATA[no closing');
    }
  });
});
