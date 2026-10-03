import { decoratePage } from "./page-design";
import { templateName } from "./catalog";
import { sudokuTypography } from "./sudoku-typography";
import type { TemplatePuzzle, LogicClue } from "./types";

export type Draw =
  | { kind: "text"; x: number; y: number; text: string; size: number; bold: boolean; center: boolean; width: number; color: string; fitted?: boolean; display?: boolean }
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: string; stroke: string; weight: number }
  | { kind: "line"; x: number; y: number; x2: number; y2: number; color: string; weight: number }
  | { kind: "path"; x: number; y: number; path: string; scale: number; angle: number; fill: string; stroke: string; weight: number };
export type Scene = Draw[];
export const pictureSymbols = [
  { name: "Star", path: "M 0 -1 L .235 -.324 L .951 -.309 L .38 .124 L .588 .809 L 0 .4 L -.588 .809 L -.38 .124 L -.951 -.309 L -.235 -.324 Z" },
  { name: "Heart", path: "M 0 .9 C -1 .25 -1 -.4 -.55 -.65 C -.25 -.85 0 -.5 0 -.4 C 0 -.5 .25 -.85 .55 -.65 C 1 -.4 1 .25 0 .9 Z" },
  { name: "Leaf", path: "M -.7 .8 C -1 -.3 -.3 -1 .8 -.8 C 1 .3 .3 1 -.7 .8 Z M -.7 .8 L .55 -.55" },
  { name: "Moon", path: "M .5 -.85 C -.1 -.4 -.1 .4 .5 .85 C -.8 1.1 -1 -1 .5 -.85 Z" },
  { name: "Flower", path: "M 0 -.4 C -.6 -1.4 -1.3 -.3 -.4 0 C -1.4 .6 -.3 1.3 0 .4 C .6 1.4 1.3 .3 .4 0 C 1.4 -.6 .3 -1.3 0 -.4 Z" },
  { name: "Diamond", path: "M 0 -1 L .8 0 L 0 1 L -.8 0 Z" },
];
export function logicClueText(clue: LogicClue, people: string[], pets: string[], foods: string[], vocabulary = false) {
  if (vocabulary) {
    switch (clue.kind) {
      case "pet": return `${people[clue.a]} chose ${pets[clue.b]} from set 1.`;
      case "food": return `${people[clue.a]} chose ${foods[clue.b]} from set 2.`;
      case "not-pet": return `${people[clue.a]} did not choose ${pets[clue.b]}.`;
      case "not-food": return `${people[clue.a]} did not choose ${foods[clue.b]}.`;
      case "pair": return `The person with ${pets[clue.a]} also chose ${foods[clue.b]}.`;
    }
  }
  switch (clue.kind) {
    case "pet": return `${people[clue.a]} owns the ${pets[clue.b]}.`;
    case "food": return `${people[clue.a]}'s snack is ${foods[clue.b]}.`;
    case "not-pet": return `${people[clue.a]} does not own the ${pets[clue.b]}.`;
    case "not-food": return `${people[clue.a]}'s snack is not ${foods[clue.b]}.`;
    case "pair": return `The ${pets[clue.a]} owner chose ${foods[clue.b]}.`;
  }
}

export function templateScene(book: { title: string; theme: string; activityPages: number; templateKey?: string; words?: string[] }, pageNumber: number, role: string, puzzle?: Pick<TemplatePuzzle, "data" | "solution"> | null): Scene {
  const scene: Scene = [], ink = "#202020";
  const text = (value: string, x: number, y: number, size = 12, bold = false, center = false, width = 504) => scene.push({ kind: "text", x, y, text: value, size, bold, center, width, color: ink });
  const rect = (x: number, y: number, w: number, h: number, fill = "none", weight = .8, stroke = "#666666") => scene.push({ kind: "rect", x, y, w, h, fill, stroke, weight });
  const line = (x: number, y: number, x2: number, y2: number, weight = 1, color = ink) => scene.push({ kind: "line", x, y, x2, y2, color, weight });
  const icon = (symbol: number, x: number, y: number, scale: number, angle = 0) => scene.push({ kind: "path", x, y, path: pictureSymbols[symbol]!.path, scale, angle, fill: "none", stroke: ink, weight: 1.4 / scale });
  const wrap = (value: string, max = 40) => {
    const result: string[] = []; let current = "";
    const words = value.split(/\s+/).flatMap(word => word.match(new RegExp(`.{1,${max}}`, "g")) ?? []);
    for (const word of words) { if (current && current.length + word.length + 1 > max) { result.push(current); current = word; } else current += `${current ? " " : ""}${word}`; }
    if (current) result.push(current); return result;
  };
  line(54, 741, 558, 741, .5, "#bbbbbb"); text(String(pageNumber), 306, 756, 9, false, true);
  if (role === "FRONT_MATTER") {
    rect(54, 72, 504, 640);
    text(templateName(book.templateKey, !!book.words?.length).toUpperCase(), 306, 150, 15, true, true, 450);
    const titleLines = wrap(book.title, 25);
    titleLines.forEach((part, i) => text(part, 306, 330 - (titleLines.length - 1) * 19 + i * 38, 28, true, true, 450));
    wrap(book.theme, 46).forEach((part, i) => text(part, 306, 490 + i * 23, 16, false, true, 450));
    text(`${book.activityPages} ${book.activityPages === 1 ? "activity" : "activities"} + complete answer keys`, 306, 560, 15, false, true, 450);
    text("Explore. Think. Solve.", 306, 640, 16, false, true);
    return decoratePage(scene, book.templateKey ?? (puzzle?.data.kind ?? "word-search"), role);
  }
  if (!puzzle) return decoratePage(scene, book.templateKey ?? "word-search", role);
  const answer = role === "ANSWER", d = puzzle.data, s = puzzle.solution;
  const index = answer ? pageNumber - book.activityPages - 1 : pageNumber - 1;
  text(`${answer ? "Answer key" : templateName(d.kind, "words" in d && !!d.words)} ${index}`, 54, 67, 23, true);
  text(book.theme, 54, 94, 12);
  switch (d.kind) {
    case "crossword": {
      text(answer ? "Completed grid and answers for every clue." : "Read the clues. Write one letter in each white square.", 54, 117, 11);
      const cell = 20, left = 156, top = 140;
      d.grid.forEach((row, r) => row.forEach((letter, c) => {
        rect(left + c * cell, top + r * cell, cell, cell, letter ? "#ffffff" : "#303030", .5);
        const entry = d.entries.find(e => e.row === r && e.column === c);
        if (entry) text(String(entry.number), left + c * cell + 2, top + r * cell + 7, 6);
        if (answer && letter) text(letter, left + (c + .5) * cell, top + r * cell + 17, 13, true, true);
      }));
      (["across", "down"] as const).forEach((direction, column) => {
        const x = 54 + column * 260;
        text(direction.toUpperCase(), x, 467, 12, true, false, 244);
        line(x, 475, x + 244, 475, .6);
        const clues = d.entries.filter(entry => entry.direction === direction).map(entry => ({
          entry, lines: wrap(entry.clue, 42),
        }));
        const units = clues.reduce((total, clue) => total + 1 + clue.lines.length, 0);
        const leading = Math.min(13, 240 / Math.max(units, 1));
        let y = 491;
        clues.forEach(({ entry, lines }) => {
          text(`${entry.number}. ${answer ? entry.word : `(${entry.word.length} letters)`}`, x, y, Math.min(11, leading), true, false, 244);
          lines.forEach((part, n) => text(part, x, y + (n + 1) * leading, Math.min(10.5, leading - 1), false, false, 244));
          y += (lines.length + 1) * leading;
        });
      }); break;
    }
    case "math-maze": {
      text("Follow the openings from START to FINISH. Solve each problem on your route.", 54, 117, 10.5);
      const cell = 444 / d.size, left = 84, top = 168;
      text("START", left + cell / 2, top - 12, 11, true, true);
      text("FINISH", left + 444 - cell / 2, top + 464, 11, true, true);
      if (answer) for (let i = 1; i < s.route.length; i++) {
        const a = s.route[i - 1]!, b = s.route[i]!;
        line(left + (a % d.size + .5) * cell, top + (Math.floor(a / d.size) + .65) * cell, left + (b % d.size + .5) * cell, top + (Math.floor(b / d.size) + .65) * cell, 9, "#cccccc");
      }
      d.walls.forEach((walls, i) => {
        const x = left + i % d.size * cell, y = top + Math.floor(i / d.size) * cell;
        if (walls[0] && i !== 0) line(x, y, x + cell, y, 1.5);
        if (walls[1]) line(x + cell, y, x + cell, y + cell, 1.5);
        if (walls[2] && i !== d.size ** 2 - 1) line(x, y + cell, x + cell, y + cell, 1.5);
        if (walls[3]) line(x, y, x, y + cell, 1.5);
        if (d.words) text(d.words[i]!, x + cell / 2, y + cell * .19, 10, true, true, cell - 10);
        text(d.expressions[i]!, x + cell / 2, y + cell * (d.words ? .43 : .36), 12, true, true, cell - 10);
        if (answer) text(String(s.values[i]), x + cell / 2, y + cell * .72, 13, true, true);
        else line(x + cell * .27, y + cell * .74, x + cell * .73, y + cell * .74, .6);
      });
      text(answer ? "The highlighted route connects the two openings." : "Write each answer on its line. Watch for dead ends!", 306, 681, 12, false, true);
      if (d.words) text("Read the topic words along the route, from start to finish.", 306, 706, 11, false, true);
      break;
    }
    case "secret-code": {
      text("Use the code key to turn each number into a letter.", 54, 117, 11);
      text("CODE KEY", 54, 147, 11, true);
      [...d.alphabet].forEach((letter, i) => {
        const x = 54 + i % 13 * 38.7, y = 163 + Math.floor(i / 13) * 46;
        rect(x, y, 38.7, 46); text(String(i + 1), x + 19.35, y + 17, 9, false, true); text(letter, x + 19.35, y + 36, 14, true, true);
      });
      d.encoded.forEach((codes, i) => {
        const y = 292 + i * 42, cell = Math.min(28, 450 / codes.length);
        text(`${i + 1}.`, 54, y + 15, 11, true);
        codes.forEach((code, c) => { const x = 88 + c * cell; line(x, y + 19, x + cell - 4, y + 19, .8); text(String(code), x + (cell - 4) / 2, y + 33, 8, false, true); if (answer) text(s.text[i]![c]!, x + (cell - 4) / 2, y + 15, 13, true, true); });
      }); break;
    }
    case "picture-sudoku": {
      text(`Use each ${d.words ? "word" : "picture"} once in every row, column, and bold 2 x 2 box.`, 54, 117, 11);
      const left = 90, top = 153, cell = 108, grid = answer ? s.grid : d.grid;
      const typography = d.words ? sudokuTypography(d.words, cell - 24) : null;
      grid.forEach((row, r) => row.forEach((value, c) => {
        rect(left + c * cell, top + r * cell, cell, cell);
        if (value && typography) {
          const lines = typography.lines[value - 1]!, size = typography.size, leading = size * 1.4;
          lines.forEach((part, i) => scene.push({ kind: "text", text: part,
            x: left + (c + .5) * cell, y: top + (r + .5) * cell + size * .35 + (i - (lines.length - 1) / 2) * leading,
            size, bold: true, center: true, width: cell - 24, color: ink, fitted: true }));
        }
        else if (value) icon(d.symbols[value - 1]!, left + (c + .5) * cell, top + (r + .5) * cell, 23);
      }));
      for (let i = 0; i <= 4; i += 2) { line(left + i * cell, top, left + i * cell, top + 4 * cell, 2); line(left, top + i * cell, left + 4 * cell, top + i * cell, 2); }
      text(d.words ? "WORD BANK" : "YOUR FOUR PICTURES", 306, 617, 10, true, true);
      d.symbols.forEach((symbol, i) => {
        if (d.words) scene.push({ kind: "text", text: d.words[i]!, x: 198 + i % 2 * 216,
          y: 648 + Math.floor(i / 2) * 27, size: 11, bold: true, center: true, width: 192, color: ink, fitted: true });
        else { icon(symbol, 156 + i * 100, 651, 18); text(pictureSymbols[symbol]!.name, 156 + i * 100, 687, 11, false, true); }
      }); break;
    }
    case "i-spy": {
      text(d.words ? "Find and count each topic word. Write the totals below." : "Find and count each kind of picture. Write the totals below.", 54, 117, 11);
      const rows = d.icons.length / d.columns, cellY = 454 / rows;
      rect(54, 143, 504, 474);
      d.icons.forEach((symbol, i) => {
        const x = 96 + i % 6 * 84, y = 154 + (Math.floor(i / 6) + .5) * cellY;
        if (d.words) text(d.words[symbol]!, x, y + 4, 11, false, true, 74);
        else icon(symbol, x, y, Math.min(18, cellY * .32), d.rotations[i]!);
      });
      pictureSymbols.forEach((symbol, i) => {
        const x = 78 + i % 3 * 170, y = 651 + Math.floor(i / 3) * 47;
        if (d.words) text(`${d.words[i]}: ${answer ? s.values[i] : "____"}`, x - 20, y, 11, true, false, 158);
        else { icon(i, x, y - 5, 12); text(`${symbol.name}: ${answer ? s.values[i] : "____"}`, x + 22, y, 11); }
      }); break;
    }
    case "color-by-code": {
      text(d.words ? "Match each word to its color in the key. Color the tiles to reveal the picture." : "Solve each problem. Use the color key to reveal the mystery picture.", 54, 117, 10.5);
      const cell = 432 / d.size, left = 90, top = 159;
      d.expressions.forEach((expression, i) => { const x = left + i % d.size * cell, y = top + Math.floor(i / d.size) * cell; rect(x, y, cell, cell, answer ? d.palette[s.values[i]!]!.hex : "#ffffff", .5, "#888888"); if (!answer) text(expression, x + cell / 2, y + cell / 2 + 3, d.words ? 12 : 8, false, true, cell - 8); });
      text("COLOR KEY", 306, 627, 12, true, true);
      d.palette.forEach((color, i) => {
        const x = 54 + i * 102;
        rect(x, 648, 16, 18, color.hex);
        text(d.words ? color.name : `${color.value ?? i} = ${color.name}`, x + 21, 661, 9, false, false, 75);
        if (d.words) text(d.words[i]!, x + 46, 685, 10, true, true, 94);
      });
      text(answer ? `Revealed picture: ${d.picture}` : d.words ? `Leave ${d.words[0]} tiles white.` : `Leave squares with answer ${d.palette[0]!.value ?? 0} white.`, 306, 714, 12, false, true); break;
    }
    case "logic-puzzle": {
      text(d.vocabulary ? "Each person chose one word from each set. Each word is used once." : "Each person has a different pet and snack. Use all clues to find the matches.", 54, 117, 10);
      d.clues.forEach((clue, i) => text(`${i + 1}. ${logicClueText(clue, d.people, d.pets, d.foods, d.vocabulary)}`, 54, 154 + i * 21, 12));
      const top = Math.max(365, 175 + d.clues.length * 21), cell = 43;
      [d.pets, d.foods].forEach((labels, group) => {
        const left = 54 + group * 260;
        text(d.vocabulary ? `WORD SET ${group + 1}` : group === 0 ? "PETS" : "SNACKS", left, top - 31, 12, true);
        labels.forEach((label, c) => text(d.vocabulary ? "ABCDEFGH"[group * 4 + c]! : label, left + 65 + (c + .5) * cell, top - 10, 9, false, true, 41));
        d.people.forEach((person, r) => { text(person, left, top + r * cell + 27, 11, true, false, 62); labels.forEach((_, c) => { rect(left + 65 + c * cell, top + r * cell, cell, cell); if (answer) text(s.values[r + group * 4] === c ? "YES" : "-", left + 65 + (c + .5) * cell, top + r * cell + 27, 10, true, true); }); });
      });
      const summaryY = top + 202;
      if (d.vocabulary) {
        text("WORD KEY", 54, summaryY, 11, true);
        [d.pets, d.foods].forEach((group, column) => group.forEach((word, row) => text(`${"ABCDEFGH"[column * 4 + row]} = ${word}`, 54 + column * 260, summaryY + 23 + row * 23, 11, false, false, 244)));
        break;
      }
      text(answer ? "COMPLETE MATCHES" : "YOUR MATCHES", 54, summaryY, 11, true);
      d.people.forEach((person, i) => text(answer ? `${person}: ${d.pets[s.values[i]!]} / ${d.foods[s.values[i + 4]!]}` : `${person}: pet __________  snack __________`, 54 + i % 2 * 260, summaryY + 23 + Math.floor(i / 2) * 26, 10, false, false, 244));
      break;
    }
  }
  return decoratePage(scene, book.templateKey ?? (puzzle?.data.kind ?? "word-search"), role);
}
