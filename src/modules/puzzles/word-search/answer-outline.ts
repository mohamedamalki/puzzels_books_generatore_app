import type { Placement } from "./engine";

export const answerInstruction = "Each outlined word is a separate answer; outlines may cross.";

/** A capsule around one word, in grid-cell coordinates with a top-left origin. */
export function answerOutline(p: Placement): string {
  const x = p.column + .5, y = p.row + .5;
  const ex = x + p.dc * (p.word.length - 1), ey = y + p.dr * (p.word.length - 1);
  const length = Math.hypot(p.dc, p.dr), radius = .39;
  const nx = -p.dr / length * radius, ny = p.dc / length * radius;
  // The inset leaves a visible gap even between words that touch end to end.
  return `M ${x + nx} ${y + ny} L ${ex + nx} ${ey + ny} A ${radius} ${radius} 0 0 0 ${ex - nx} ${ey - ny} L ${x - nx} ${y - ny} A ${radius} ${radius} 0 0 0 ${x + nx} ${y + ny} Z`;
}
