const TokenType = {
  PROCESSING_INSTRUCTION: 'processing-instruction',
  ELEMENT_OPEN: 'element-open',
  ELEMENT_CLOSE: 'element-close',
  SELF_CLOSING: 'self-closing',
  TEXT: 'text',
  COMMENT: 'comment',
  CDATA: 'cdata',
  MALFORMED: 'malformed',
};

const WHITESPACE = /\s/;
const ATTRIBUTE_PATTERN = /(\S+?)\s*=\s*["']([^"']*)["']/g;

function parseAttributes(raw) {
  const attributes = {};
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match;
  while ((match = ATTRIBUTE_PATTERN.exec(raw)) !== null) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

function nextToken(xml, position) {
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

function tokenize(xml) {
  const tokens = [];
  let position = 0;

  while (position < xml.length) {
    const { token, end } = nextToken(xml, position);
    if (token) tokens.push(token);
    position = end;
  }

  return tokens;
}

export { tokenize, TokenType };
