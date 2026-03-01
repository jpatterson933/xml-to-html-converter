import { XmlNode } from "../scaffold/types";

function render(nodes: XmlNode[]): string {
  return nodes.map(renderNode).join("");
}

function renderNode(node: XmlNode): string {
  if (node.role === "textLeaf") return node.raw;
  if (node.role === "comment") return node.raw;
  if (node.role === "processingInstruction") return "";
  if (node.role === "doctype") return "";
  if (node.role === "closeTag") return "";

  const tag = node.xmlTag ?? "";
  const attrs = buildDataAttrs(node);
  const attrsHtml = attrs ? ` ${attrs}` : "";

  if (node.role === "selfTag") {
    return `<div data-tag="${tag}"${attrsHtml}></div>`;
  }

  const children = render(node.children ?? []);
  return `<div data-tag="${tag}"${attrsHtml}>${children}</div>`;
}

function buildDataAttrs(node: XmlNode): string {
  if (!node.xmlAttributes || node.xmlAttributes.length === 0) return "";
  return node.xmlAttributes
    .map(({ name, value }) => `data-attrs-${name}="${value}"`)
    .join(" ");
}

export { render };
