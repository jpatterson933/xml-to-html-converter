const TokenType = {
  PROCESSING_INSTRUCTION: 'processing-instruction',
  ELEMENT_OPEN: 'element-open',
  ELEMENT_CLOSE: 'element-close',
  SELF_CLOSING: 'self-closing',
  TEXT: 'text',
  COMMENT: 'comment',
  CDATA: 'cdata',
  MALFORMED: 'malformed',
} as const;

type TokenTypeValue = typeof TokenType[keyof typeof TokenType];

export interface ProcessingInstructionToken {
  type: typeof TokenType.PROCESSING_INSTRUCTION;
  target: string;
  attributes: Record<string, string>;
}

export interface ElementOpenToken {
  type: typeof TokenType.ELEMENT_OPEN;
  tag: string;
  attributes: Record<string, string>;
}

export interface ElementCloseToken {
  type: typeof TokenType.ELEMENT_CLOSE;
  tag: string;
}

export interface SelfClosingToken {
  type: typeof TokenType.SELF_CLOSING;
  tag: string;
  attributes: Record<string, string>;
}

export interface TextToken {
  type: typeof TokenType.TEXT;
  value: string;
}

export interface CommentToken {
  type: typeof TokenType.COMMENT;
  value: string;
}

export interface CDataToken {
  type: typeof TokenType.CDATA;
  value: string;
}

export interface MalformedToken {
  type: typeof TokenType.MALFORMED;
  raw: string;
}

export type Token =
  | ProcessingInstructionToken
  | ElementOpenToken
  | ElementCloseToken
  | SelfClosingToken
  | TextToken
  | CommentToken
  | CDataToken
  | MalformedToken;

const WHITESPACE = /\s/;

function parseAttributes(raw: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /(\S+?)\s*=\s*["']([^"']*)["']/g;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

function nextToken(xml: string, position: number): { token: Token | null; end: number } {
  if (xml[position] !== '<') {
    const end = xml.indexOf('<', position);
    const value = xml.slice(position, end === -1 ? xml.length : end);
    return { token: value.trim() ? { type: TokenType.TEXT, value } : null, end: end === -1 ? xml.length : end };
  }

  const next = xml[position + 1];

  if (next === '?') {
    const closeIndex = xml.indexOf('?>', position);
    if (closeIndex === -1) return { token: { type: TokenType.MALFORMED, raw: xml.slice(position) }, end: xml.length };
    const end = closeIndex + 2;
    const inner = xml.slice(position + 2, end - 2).trim();
    const space = inner.search(WHITESPACE);
    return { token: { type: TokenType.PROCESSING_INSTRUCTION, target: space === -1 ? inner : inner.slice(0, space), attributes: parseAttributes(inner) }, end };
  }

  if (next === '!' && xml[position + 2] === '-') {
    const closeIndex = xml.indexOf('-->', position);
    if (closeIndex === -1) return { token: { type: TokenType.MALFORMED, raw: xml.slice(position) }, end: xml.length };
    const end = closeIndex + 3;
    return { token: { type: TokenType.COMMENT, value: xml.slice(position + 4, end - 3) }, end };
  }

  if (next === '!' && xml[position + 2] === '[') {
    const closeIndex = xml.indexOf(']]>', position);
    if (closeIndex === -1) return { token: { type: TokenType.MALFORMED, raw: xml.slice(position) }, end: xml.length };
    const end = closeIndex + 3;
    return { token: { type: TokenType.CDATA, value: xml.slice(position + 9, end - 3) }, end };
  }

  const end = xml.indexOf('>', position) + 1;
  if (!end) return { token: { type: TokenType.MALFORMED, raw: xml.slice(position) }, end: xml.length };

  const raw = xml.slice(position + 1, end - 1).trim();
  if (raw[0] === '/') return { token: { type: TokenType.ELEMENT_CLOSE, tag: raw.slice(1).trim() }, end };

  const selfClosing = raw[raw.length - 1] === '/';
  const inner = selfClosing ? raw.slice(0, -1).trim() : raw;
  const space = inner.search(WHITESPACE);
  const tag = space === -1 ? inner : inner.slice(0, space);
  const type = selfClosing ? TokenType.SELF_CLOSING : TokenType.ELEMENT_OPEN;

  return { token: { type, tag, attributes: parseAttributes(inner) }, end };
}

function tokenize(xml: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;

  while (position < xml.length) {
    const { token, end } = nextToken(xml, position);
    if (token) tokens.push(token);
    position = end;
  }

  return tokens;
}

export { tokenize, TokenType, type TokenTypeValue };
