interface XmlToken {
  type: "markup" | "text";
  value: string;
}

function minify(xml: string): string {
  const input = xml.trim();
  if (input === "") return "";
  const tokens = tokenize(input);
  return tokens
    .filter((token, index) => !isRemovableWhitespace(token, tokens, index))
    .map((token) => token.value)
    .join("");
}

function isRemovableWhitespace(
  token: XmlToken,
  tokens: XmlToken[],
  index: number,
): boolean {
  if (token.type !== "text") return false;
  if (!/^\s+$/.test(token.value)) return false;
  if (!token.value.includes("\n") && !token.value.includes("\r")) return false;
  const previous = tokens[index - 1];
  const next = tokens[index + 1];
  return previous?.type === "markup" && next?.type === "markup";
}

function tokenize(xml: string): XmlToken[] {
  const tokens: XmlToken[] = [];
  let position = 0;

  while (position < xml.length) {
    if (xml[position] !== "<") {
      const nextMarkup = xml.indexOf("<", position);
      const end = nextMarkup === -1 ? xml.length : nextMarkup;
      tokens.push({ type: "text", value: xml.slice(position, end) });
      position = end;
      continue;
    }

    const end = findMarkupEnd(xml, position);
    tokens.push({ type: "markup", value: xml.slice(position, end) });
    position = end;
  }

  return tokens;
}

function findMarkupEnd(xml: string, start: number): number {
  if (xml.startsWith("<!--", start)) {
    const end = xml.indexOf("-->", start + 4);
    return end === -1 ? xml.length : end + 3;
  }

  if (xml.startsWith("<![CDATA[", start)) {
    const end = xml.indexOf("]]>", start + 9);
    return end === -1 ? xml.length : end + 3;
  }

  if (xml.startsWith("<?", start)) {
    const end = xml.indexOf("?>", start + 2);
    return end === -1 ? xml.length : end + 2;
  }

  if (xml.startsWith("<!DOCTYPE", start)) {
    const bracketOpen = xml.indexOf("[", start);
    const firstClose = xml.indexOf(">", start);
    if (bracketOpen !== -1 && bracketOpen < firstClose) {
      const bracketClose = xml.indexOf("]>", bracketOpen + 1);
      return bracketClose === -1 ? xml.length : bracketClose + 2;
    }
    return firstClose === -1 ? xml.length : firstClose + 1;
  }

  let i = start + 1;
  while (i < xml.length) {
    const ch = xml[i];
    if (ch === '"' || ch === "'") {
      const closeQuote = xml.indexOf(ch, i + 1);
      if (closeQuote === -1) return xml.length;
      i = closeQuote + 1;
      continue;
    }
    if (ch === ">") return i + 1;
    i++;
  }

  return xml.length;
}

export { minify };
