import { Token } from "./types";

function scaffold(xml: string): Token[] {
  const counter = { value: 0 };
  const { tokens } = collectTokens(xml, 0, null, counter);
  return tokens;
}

function collectTokens(
  xml: string,
  position: number,
  parentTag: string | null,
  counter: { value: number },
): { tokens: Token[]; position: number; closed: boolean } {
  const tokens: Token[] = [];

  while (position < xml.length) {
    const scanned = scanNext(xml, position);

    if (scanned.role === "closeTag") {
      if (scanned.tag === parentTag)
        return { tokens, position: scanned.end, closed: true };

      tokens.push({
        role: "closeTag",
        raw: scanned.raw,
        globalIndex: counter.value++,
        localIndex: tokens.length,
        malformed: true,
      });
      position = scanned.end;
      continue;
    }

    if (scanned.role === "openTag" && !scanned.malformed) {
      const globalIndex = counter.value++;
      const localIndex = tokens.length;
      const nested = collectTokens(xml, scanned.end, scanned.tag, counter);
      const token: Token = {
        role: "openTag",
        raw: scanned.raw,
        globalIndex,
        localIndex,
        children: nested.tokens,
      };
      if (!nested.closed) token.malformed = true;
      tokens.push(token);
      position = nested.position;
      continue;
    }

    const token: Token = {
      role: scanned.role,
      raw: scanned.raw,
      globalIndex: counter.value++,
      localIndex: tokens.length,
    };
    if (scanned.malformed) token.malformed = true;
    if (scanned.role === "openTag") token.children = [];
    tokens.push(token);
    position = scanned.end;
  }

  return { tokens, position, closed: parentTag === null };
}

function scanNext(
  xml: string,
  position: number,
): {
  raw: string;
  role: Token["role"];
  tag: string;
  end: number;
  malformed?: true;
} {
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
