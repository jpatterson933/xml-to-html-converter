import { XmlNode, XmlNodeData } from "./types";

function scaffold(xml: string): XmlNode[] {
  const counter = { value: 0 };
  const { xmlNodes } = collectXmlNodes(xml, 0, null, counter);
  return xmlNodes;
}

function collectXmlNodes(
  xml: string,
  position: number,
  parentTag: string | null,
  counter: { value: number },
): { xmlNodes: XmlNode[]; position: number; closed: boolean } {
  const xmlNodes: XmlNode[] = [];

  while (position < xml.length) {
    const xmlNodeData = extractXmlNodes(xml, position);

    if (xmlNodeData.role === "closeTag") {
      if (xmlNodeData.tag === parentTag)
        return { xmlNodes, position: xmlNodeData.end, closed: true };

      xmlNodes.push({
        role: "closeTag",
        raw: xmlNodeData.raw,
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
      );
      const xmlNode: XmlNode = {
        role: "openTag",
        raw: xmlNodeData.raw,
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

  if (xml[position + 1] === "!" && xml[position + 2] === "-") {
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

  const closeAt = xml.indexOf(">", position);
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
    return { raw, role: "closeTag", tag, end };
  }

  if (inner.endsWith("/")) {
    const tag = inner.slice(0, -1).trim().split(/\s/)[0] ?? "";
    return { raw, role: "selfTag", tag, end };
  }

  const tag = inner.split(/\s/)[0] ?? "";
  return { raw, role: "openTag", tag, end };
}

export { scaffold };
