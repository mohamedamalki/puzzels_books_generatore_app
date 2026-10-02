/** Keep title words intact in both print renderers, including unusually long words. */
export function layoutBookTitle(title: string, measure: (text: string, size: number) => number, maxWidth = 464, preferredSize = 34, maxLines = 5) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const widestWord = Math.max(1, ...words.map(word => measure(word, 1)));
  let size = Math.min(preferredSize, maxWidth / widestWord);
  function wrap() {
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && measure(candidate, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    return lines;
  }
  let lines = wrap();
  while (lines.length > maxLines) {
    size *= .95;
    lines = wrap();
  }
  return { lines, size };
}
