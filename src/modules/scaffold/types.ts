export type XmlNodeRole =
  | "openTag"
  | "closeTag"
  | "selfTag"
  | "processingInstruction"
  | "comment"
  | "textLeaf";

export interface XmlNode {
  role: XmlNodeRole;
  raw: string;
  globalIndex: number;
  localIndex: number;
  children?: XmlNode[];
  malformed?: true;
}

export interface XmlNodeData {
  raw: string;
  role: XmlNode["role"];
  tag: string;
  end: number;
  malformed?: true;
}
