// Conservative uppercase widths covering Nunito Bold and legacy Helvetica
// exports, so every word keeps the same size across all cells and renderers.
const advances = [744, 722, 722, 762, 667, 611, 778, 773, 282, 556, 722, 611, 868, 748, 785, 667, 785, 722, 667, 621, 738, 713, 1113, 672, 667, 611];
function width(text: string) {
  return [...text].reduce((sum, letter) => sum + (letter === "-" ? 434 : advances[letter.charCodeAt(0) - 65] ?? 1000), 0) / 1000 * 1.03;
}

export function sudokuTypography(words: string[], availableWidth: number) {
  const size = Math.max(9.5, Math.min(11, availableWidth / Math.max(...words.map(width), 1)));
  const lines = words.map(word => {
    const result: string[] = [];
    let rest = word;
    while (width(rest) * size > availableWidth && rest.length > 1) {
      let count = rest.length - 1;
      while (count > 1 && width(`${rest.slice(0, count)}-`) * size > availableWidth) count--;
      result.push(`${rest.slice(0, count)}-`);
      rest = rest.slice(count);
    }
    result.push(rest);
    return result;
  });
  return { size, lines };
}
