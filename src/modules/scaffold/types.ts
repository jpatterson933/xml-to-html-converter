export interface XmlAttribute {
  name: string;
  value: string;
}

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
  xmlTag?: string;
  xmlInner?: string;
  xmlAttributes?: XmlAttribute[];
  globalIndex: number;
  localIndex: number;
  children?: XmlNode[];
  malformed?: true;
}

export type MalformedXmlNode = XmlNode & { malformed: true };

export function isMalformed(node: XmlNode): node is MalformedXmlNode {
  return node.malformed === true;
}
