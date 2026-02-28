import { tokenize, TokenType } from './tokenizer.js';

function parse(xml) {
  const tokens = tokenize(xml);
  const cursor = { position: 0 };
  const children = collectChildren(tokens, cursor, null);
  return { type: 'document', children };
}

function collectChildren(tokens, cursor, parentTag) {
  const children = [];

  while (cursor.position < tokens.length) {
    const token = tokens[cursor.position];
    cursor.position++;

    if (token.type === TokenType.ELEMENT_CLOSE) {
      if (token.tag === parentTag) return children;
      children.push({ type: 'malformed', raw: `</${token.tag}>`, malformed: true });
      continue;
    }

    if (token.type === TokenType.ELEMENT_OPEN) {
      const node = { type: 'element', tag: token.tag, attributes: token.attributes, children: collectChildren(tokens, cursor, token.tag) };
      children.push(node);
      continue;
    }

    children.push(tokenToNode(token));
  }

  if (parentTag !== null) {
    children.forEach(child => { child.malformed = true; });
  }

  return children;
}

function tokenToNode(token) {
  if (token.type === TokenType.TEXT) return { type: 'text', value: token.value };
  if (token.type === TokenType.COMMENT) return { type: 'comment', value: token.value };
  if (token.type === TokenType.CDATA) return { type: 'cdata', value: token.value };
  if (token.type === TokenType.SELF_CLOSING) return { type: 'element', tag: token.tag, attributes: token.attributes, children: [] };
  if (token.type === TokenType.PROCESSING_INSTRUCTION) return { type: 'processing-instruction', target: token.target, attributes: token.attributes };
  return { type: 'malformed', raw: token.raw, malformed: true };
}

export { parse };
