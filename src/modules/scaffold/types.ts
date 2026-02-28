export type TokenRole =
  | "openTag"
  | "closeTag"
  | "selfTag"
  | "processingInstruction"
  | "comment"
  | "textLeaf";

export interface Token {
  role: TokenRole;
  raw: string;
  globalIndex: number;
  localIndex: number;
  children?: Token[];
  malformed?: true;
}
