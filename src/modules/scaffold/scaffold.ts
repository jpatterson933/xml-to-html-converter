import { XmlAttribute, XmlNode } from "./types";

interface XmlNodeData {
  raw: string;
  role: XmlNode["role"];
  tag: string;
  xmlInner?: string;
  xmlAttributes?: XmlAttribute[];
  end: number;
  malformed?: true;
}

function parseXmlAttributes(xmlInner: string): XmlAttribute[] | undefined {
  const attributes: XmlAttribute[] = [];
  let i = 0;
  const s = xmlInner.trim();

  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i]!)) i++;
    if (i >= s.length) break;

    const nameStart = i;
    while (i < s.length && s[i] !== "=" && !/\s/.test(s[i]!)) i++;
    const name = s.slice(nameStart, i).trim();
    if (!name) break;

    while (i < s.length && /\s/.test(s[i]!)) i++;
    if (s[i] !== "=") break;
    i++;
    while (i < s.length && /\s/.test(s[i]!)) i++;

    const quote = s[i];
    if (quote !== '"' && quote !== "'") break;
    i++;
    const valueStart = i;
    while (i < s.length && s[i] !== quote) i++;
    const value = s.slice(valueStart, i);
    i++;

    attributes.push({ name, value });
  }

  return attributes.length > 0 ? attributes : undefined;
}

interface CollectResult {
  xmlNodes: XmlNode[];
  position: number;
  closed: boolean;
}

const MAX_DEPTH = 500;

function scaffold(xml: string): XmlNode[] {
  const counter = { value: 0 };
  const { xmlNodes } = collectXmlNodes(xml, 0, null, counter, 0);
  return xmlNodes;
}

function collectXmlNodes(
  xml: string,
  position: number,
  parentTag: string | null,
  counter: { value: number },
  depth: number,
): CollectResult {
  if (depth > MAX_DEPTH) return { xmlNodes: [], position, closed: false };

  const xmlNodes: XmlNode[] = [];

  while (position < xml.length) {
    const xmlNodeData = extractXmlNodes(xml, position);

    if (xmlNodeData.role === "textLeaf" && xmlNodeData.raw.trim() === "") {
      position = xmlNodeData.end;
      continue;
    }

    if (xmlNodeData.role === "closeTag") {
      if (xmlNodeData.tag === parentTag)
        return { xmlNodes, position: xmlNodeData.end, closed: true };

      xmlNodes.push({
        role: "closeTag",
        raw: xmlNodeData.raw,
        xmlTag: xmlNodeData.tag || undefined,
        xmlInner: xmlNodeData.xmlInner,
        globalIndex: counter.value++,
        localIndex: xmlNodes.length,
        malformed: true,
      });
      position = xmlNodeData.end;
      continue;
    }

    if (xmlNodeData.role === "openTag" && !xmlNodeData.malformed) {
      const globalIndex = counter.value++;
      const localIndex = xmlNodes.length;
      const nested = collectXmlNodes(
        xml,
        xmlNodeData.end,
        xmlNodeData.tag,
        counter,
        depth + 1,
      );
      const xmlNode: XmlNode = {
        role: "openTag",
        raw: xmlNodeData.raw,
        xmlTag: xmlNodeData.tag || undefined,
        xmlInner: xmlNodeData.xmlInner,
        xmlAttributes: xmlNodeData.xmlAttributes,
        globalIndex,
        localIndex,
        children: nested.xmlNodes,
      };
      if (!nested.closed) xmlNode.malformed = true;
      xmlNodes.push(xmlNode);
      position = nested.position;
      continue;
    }

    const xmlNode: XmlNode = {
      role: xmlNodeData.role,
      raw: xmlNodeData.raw,
      xmlTag: xmlNodeData.tag || undefined,
      xmlInner: xmlNodeData.xmlInner,
      xmlAttributes: xmlNodeData.xmlAttributes,
      globalIndex: counter.value++,
      localIndex: xmlNodes.length,
    };
    if (xmlNodeData.malformed) xmlNode.malformed = true;
    if (xmlNodeData.role === "openTag") xmlNode.children = [];
    xmlNodes.push(xmlNode);
    position = xmlNodeData.end;
  }

  return { xmlNodes, position, closed: parentTag === null };
}

function findTagClose(xml: string, position: number): number {
  let i = position;
  while (i < xml.length) {
    const ch = xml[i];
    if (ch === '"' || ch === "'") {
      const closeQuote = xml.indexOf(ch, i + 1);
      i = closeQuote === -1 ? xml.length : closeQuote + 1;
      continue;
    }
    if (ch === ">") return i;
    i++;
  }
  return -1;
}

function extractXmlNodes(xml: string, position: number): XmlNodeData {
  if (xml[position] !== "<") {
    const end = xml.indexOf("<", position);
    return {
      raw: xml.slice(position, end === -1 ? xml.length : end),
      role: "textLeaf",
      tag: "",
      end: end === -1 ? xml.length : end,
    };
  }

  if (xml[position + 1] === "?") {
    const end = xml.indexOf("?>", position + 2);
    return end === -1
      ? {
          raw: xml.slice(position),
          role: "processingInstruction",
          tag: "",
          end: xml.length,
        }
      : {
          raw: xml.slice(position, end + 2),
          role: "processingInstruction",
          tag: "",
          end: end + 2,
        };
  }

  if (xml[position + 1] === "!" && xml[position + 2] === "[") {
    const end = xml.indexOf("]]>", position + 3);
    return end === -1
      ? { raw: xml.slice(position), role: "textLeaf", tag: "", end: xml.length }
      : {
          raw: xml.slice(position, end + 3),
          role: "textLeaf",
          tag: "",
          end: end + 3,
        };
  }

  if (
    xml[position + 1] === "!" &&
    xml[position + 2] === "-" &&
    xml[position + 3] === "-"
  ) {
    const end = xml.indexOf("-->", position + 4);
    return end === -1
      ? { raw: xml.slice(position), role: "comment", tag: "", end: xml.length }
      : {
          raw: xml.slice(position, end + 3),
          role: "comment",
          tag: "",
          end: end + 3,
        };
  }

  if (xml.startsWith("<!DOCTYPE", position)) {
    const bracketOpen = xml.indexOf("[", position);
    const firstClose = xml.indexOf(">", position);
    const hasBracket = bracketOpen !== -1 && bracketOpen < firstClose;
    if (hasBracket) {
      const bracketClose = xml.indexOf("]>", bracketOpen);
      const end = bracketClose === -1 ? xml.length : bracketClose + 2;
      return { raw: xml.slice(position, end), role: "doctype", tag: "", end };
    }
    const end = firstClose === -1 ? xml.length : firstClose + 1;
    return { raw: xml.slice(position, end), role: "doctype", tag: "", end };
  }

  const closeAt = findTagClose(xml, position + 1);
  if (closeAt === -1)
    return {
      raw: xml.slice(position),
      role: "openTag",
      tag: "",
      end: xml.length,
      malformed: true,
    };

  const raw = xml.slice(position, closeAt + 1);
  const end = closeAt + 1;
  const inner = xml.slice(position + 1, closeAt).trim();

  if (inner.startsWith("/")) {
    const tag = inner.slice(1).trim().split(/\s/)[0] ?? "";
    const xmlInner =
      inner.slice(1).trim().slice(tag.length).trim() || undefined;
    return { raw, role: "closeTag", tag, xmlInner, end };
  }

  if (inner.endsWith("/")) {
    const trimmed = inner.slice(0, -1).trim();
    const tag = trimmed.split(/\s/)[0] ?? "";
    const xmlInner = trimmed.slice(tag.length).trim() || undefined;
    const xmlAttributes = xmlInner ? parseXmlAttributes(xmlInner) : undefined;
    return { raw, role: "selfTag", tag, xmlInner, xmlAttributes, end };
  }

  const tag = inner.split(/\s/)[0] ?? "";
  const xmlInner = inner.slice(tag.length).trim() || undefined;
  const xmlAttributes = xmlInner ? parseXmlAttributes(xmlInner) : undefined;
  return { raw, role: "openTag", tag, xmlInner, xmlAttributes, end };
}

export { scaffold };
