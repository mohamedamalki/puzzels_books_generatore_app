import metrics from "./font-metrics.json";
import type { Draw } from "./scene";

/** Advance widths from the bundled Fontsource fonts, in thousandths of an em. */
export function pageTextSize(op: Extract<Draw, { kind: "text" }>): number {
  const widths = op.display ? metrics.display : op.bold ? metrics.bold : metrics.regular;
  const advance = [...op.text].reduce((total, char) => total + (widths[char.codePointAt(0)! - 32] ?? 1000), 0) / 1000;
  return Math.min(op.size, op.width / Math.max(advance, 1));
}
