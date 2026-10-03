import type { Scene } from "./scene";

const palettes: Record<string, [string, string]> = {
  "word-search": ["#167568", "#edf8f2"], crossword: ["#4854a5", "#f0f1fc"],
  "math-maze": ["#176e96", "#edf7fc"], "secret-code": ["#8150a0", "#f7effb"],
  "picture-sudoku": ["#b0506e", "#fff0f4"], "i-spy": ["#a65c20", "#fff5e8"],
  "color-by-code": ["#247b75", "#edf9f6"], "logic-puzzle": ["#5c639c", "#f2f2fc"],
};

/** Shared print-safe decoration for SVG previews, PNGs, and embedded-font PDFs. */
export function decoratePage(content: Scene, key: string, role: string): Scene {
  const [accent, pale] = palettes[key] ?? palettes["word-search"]!;
  const cover = role === "FRONT_MATTER";
  const scene: Scene = [];
  const box = (x: number, y: number, w: number, h: number, fill: string) => {
    const r = Math.min(14, w / 2, h / 2);
    scene.push({ kind: "path", x, y, scale: 1, angle: 0, fill, stroke: fill, weight: 0,
      path: `M ${r} 0 H ${w-r} Q ${w} 0 ${w} ${r} V ${h-r} Q ${w} ${h} ${w-r} ${h} H ${r} Q 0 ${h} 0 ${h-r} V ${r} Q 0 0 ${r} 0 Z` });
  };
  const label = (text: string, x: number, y: number, size: number, color = accent, center = false) =>
    scene.push({ kind: "text", text, x, y, size, color, center, bold: true, width: 450 });
  const star = (x: number, y: number, size: number) => scene.push({ kind: "path", x, y,
    path: "M 0 -1 L .25 -.25 L 1 0 L .25 .25 L 0 1 L -.25 .25 L -1 0 L -.25 -.25 Z",
    scale: size, angle: 0, fill: "none", stroke: accent, weight: 1.3 / size });
  if (cover) {
    box(54, 72, 504, 640, pale);
    box(78, 96, 456, 5, accent);
    box(78, 186, 456, 260, "#ffffff");
    star(105, 225, 13); star(508, 414, 16); star(493, 219, 8);
    label("A LITTLE CURIOSITY. A BIG ADVENTURE.", 306, 118, 10, accent, true);
    label("THIS BOOK BELONGS TO", 306, 589, 9, accent, true);
    scene.push({ kind: "line", x: 172, y: 616, x2: 440, y2: 616, color: accent, weight: .7 });
    star(145, 642, 8); star(467, 642, 8);
  } else {
    box(54, 38, 504, 65, pale);
    box(54, 38, 4, 65, accent);
    star(544, 51, 7);
    label(role === "ANSWER" ? "NICE WORK, EXPLORER!" : "READY, SET, DISCOVER!", 54, 29, 8);
    if (key === "picture-sudoku") box(74, 599, 464, 111, pale);
    if (key === "color-by-code") box(54, 605, 504, 89, pale);
    if (key === "i-spy") box(54, 625, 504, 96, pale);
    if (key === "math-maze") box(54, 658, 504, 65, pale);
    if (key === "secret-code") box(54, 130, 504, 25, pale);
  }
  for (const op of content) {
    if (cover && op.kind === "rect") continue;
    if (op.kind === "text") {
      const heading = cover ? op.bold && op.size >= 15 : op.y === 67;
      scene.push({ ...op, color: heading || op.bold && op.size <= 12 ? accent : "#263448",
        ...(heading ? { display: true } : {}),
        ...(!cover && (op.y === 67 || op.y === 94) ? { x: 70, width: 461 } : {}),
        ...(cover && op.size === 28 ? { size: 32 } : {}) });
    } else if (op.kind === "line" && op.y === 741) {
      scene.push({ ...op, color: accent });
    } else scene.push(op);
  }
  label(role === "ANSWER" ? "CHECK. LEARN. TRY AGAIN." : "EVERY LITTLE DISCOVERY COUNTS.", 54, 756, 7.5);
  label("PUZZLE CLUB", 465, 756, 8);
  return scene;
}
