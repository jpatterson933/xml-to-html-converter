import { tokenize, TokenType, Token } from './tokenizer';

export interface DocumentNode {
  type: 'document';
  children: Node[];
}

export interface ElementNode {
  type: 'element';
  tag: string;
  attributes: Record<string, string>;
  children: Node[];
  malformed?: true;
}

export interface TextNode {
  type: 'text';
  value: string;
}

export interface CommentNode {
  type: 'comment';
  value: string;
}

export interface CDataNode {
  type: 'cdata';
  value: string;
}

export interface ProcessingInstructionNode {
  type: 'processing-instruction';
  target: string;
  attributes: Record<string, string>;
}

export interface MalformedNode {
  type: 'malformed';
  raw: string;
  malformed: true;
}

export type Node =
  | ElementNode
  | TextNode
  | CommentNode
  | CDataNode
  | ProcessingInstructionNode
  | MalformedNode;

function parse(xml: string): DocumentNode {
  const tokens = tokenize(xml);
  const cursor = { position: 0 };
  const children = collectChildren(tokens, cursor, null);
  return { type: 'document', children };
}

function collectChildren(tokens: Token[], cursor: { position: number }, parentTag: string | null): Node[] {
  const children: Node[] = [];

  while (cursor.position < tokens.length) {
    const token = tokens[cursor.position];
    cursor.position++;

    if (token.type === TokenType.ELEMENT_CLOSE) {
      if (token.tag === parentTag) return children;
      children.push({ type: 'malformed', raw: `</${token.tag}>`, malformed: true });
      continue;
    }

    if (token.type === TokenType.ELEMENT_OPEN) {
      const node: ElementNode = { type: 'element', tag: token.tag, attributes: token.attributes, children: collectChildren(tokens, cursor, token.tag) };
      children.push(node);
      continue;
    }

    children.push(tokenToNode(token));
  }

  if (parentTag !== null) {
    children.forEach(child => { (child as ElementNode).malformed = true; });
  }

  return children;
}

function tokenToNode(token: Token): Node {
  if (token.type === TokenType.TEXT) return { type: 'text', value: token.value };
  if (token.type === TokenType.COMMENT) return { type: 'comment', value: token.value };
  if (token.type === TokenType.CDATA) return { type: 'cdata', value: token.value };
  if (token.type === TokenType.SELF_CLOSING) return { type: 'element', tag: token.tag, attributes: token.attributes, children: [] };
  if (token.type === TokenType.PROCESSING_INSTRUCTION) return { type: 'processing-instruction', target: token.target, attributes: token.attributes };
  if (token.type === TokenType.MALFORMED) return { type: 'malformed', raw: token.raw, malformed: true };
  return { type: 'malformed', raw: `<${token.tag}>`, malformed: true };
}

export { parse };
