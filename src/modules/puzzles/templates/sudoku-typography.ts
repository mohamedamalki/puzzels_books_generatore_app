// Helvetica Bold uppercase advance widths (1/1000 em). Arial has compatible
// metrics. Keep a little extra space for browser font rendering differences.
const advances = [722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611];
function width(text: string) {
  return [...text].reduce((sum, letter) => sum + (letter === "-" ? 333 : advances[letter.charCodeAt(0) - 65] ?? 1000), 0) / 1000 * 1.03;
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
