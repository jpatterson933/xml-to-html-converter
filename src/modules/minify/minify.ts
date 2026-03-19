function minify(xml: string): string {
  return xml
    .replace(/>(\s+)</g, "><")
    .trim();
}

export { minify };
