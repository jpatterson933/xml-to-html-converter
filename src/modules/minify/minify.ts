function minify(xml: string): string {
  return xml
    .replace(/>(\s+)</g, (_, gap) => (gap.trim() === "" ? "><" : `>${gap}<`))
    .trim();
}

export { minify };
