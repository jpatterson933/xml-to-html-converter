import { XmlNode } from "../scaffold/types";

function walk(nodes: XmlNode[], visitor: (node: XmlNode) => void): void {
  for (const node of nodes) {
    visitor(node);
    if (node.children) walk(node.children, visitor);
  }
}

export { walk };
