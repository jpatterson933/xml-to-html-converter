export type XmlNodeRole =
  | "closeTag"
  | "comment"
  | "doctype"
  | "openTag"
  | "processingInstruction"
  | "selfTag"
  | "textLeaf";

export interface XmlNode {
  role: XmlNodeRole;
  raw: string;
  globalIndex: number;
  localIndex: number;
  children?: XmlNode[];
  malformed?: true;
}

export type MalformedXmlNode = XmlNode & { malformed: true };

export function isMalformed(node: XmlNode): node is MalformedXmlNode {
  return node.malformed === true;
}
