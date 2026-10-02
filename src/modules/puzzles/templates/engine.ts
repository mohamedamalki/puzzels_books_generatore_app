import { seededRandom } from "../core/seed";
import { evaluateMath, mathExpression, mathTopicKeys } from "./math-topics";
import { shuffle } from "../word-search/engine";
import { DomainError } from "../../../lib/errors";
import { everydayClues, TEMPLATE_ENGINE_VERSION, type TemplateKey } from "./catalog";
import type { CrosswordEntry, LogicClue, TemplateData, TemplatePuzzle, TemplateSettings, TemplateSolution } from "./types";

export function solveSudoku(input: number[][], limit = 2): number[][][] {
  const grid = input.map(row => [...row]), solutions: number[][][] = [];
  function options(r: number, c: number) {
    return [1, 2, 3, 4].filter(n => !grid[r]!.includes(n) && !grid.some(row => row[c] === n) && ![0, 1, 2, 3].some(i => grid[Math.floor(r / 2) * 2 + Math.floor(i / 2)]![Math.floor(c / 2) * 2 + i % 2] === n));
  }
  if (grid.length !== 4 || grid.some(row => row.length !== 4 || row.some(n => !Number.isInteger(n) || n < 0 || n > 4))) return [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (grid[r]![c]) {
    const n = grid[r]![c]!; grid[r]![c] = 0;
    const valid = options(r, c).includes(n); grid[r]![c] = n;
    if (!valid) return [];
  }
  function visit() {
    if (solutions.length >= limit) return;
    let cell: [number, number] | null = null, candidates: number[] = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!grid[r]![c]) {
      const available = options(r, c);
      if (!available.length) return;
      if (!cell || available.length < candidates.length) { cell = [r, c]; candidates = available; }
    }
    if (!cell) { solutions.push(grid.map(row => [...row])); return; }
    const [r, c] = cell;
    for (const n of candidates) { grid[r]![c] = n; visit(); }
    grid[r]![c] = 0;
  }
  visit(); return solutions;
}

function permutations(items: number[]): number[][] {
  return items.length ? items.flatMap((n, i) => permutations(items.filter((_, j) => i !== j)).map(rest => [n, ...rest])) : [[]];
}
const orders = permutations([0, 1, 2, 3]);
export function satisfiesClue(values: number[], clue: LogicClue): boolean {
  switch (clue.kind) {
    case "pet": return values[clue.a] === clue.b;
    case "food": return values[clue.a + 4] === clue.b;
    case "not-pet": return values[clue.a] !== clue.b;
    case "not-food": return values[clue.a + 4] !== clue.b;
    case "pair": return values[values.slice(0, 4).indexOf(clue.a) + 4] === clue.b;
  }
}
export function solveLogic(clues: LogicClue[]): number[][] { return orders.flatMap(pets => orders.map(foods => [...pets, ...foods])).filter(values => clues.every(clue => satisfiesClue(values, clue))); }
export function arithmetic(expression: string): number {
  return evaluateMath(expression);
}
export function mazeRoute(size: number, walls: boolean[][]): number[] {
  const parent = new Map<number, number>([[0, -1]]), todo = [0];
  for (let i = 0; i < todo.length; i++) {
    const cell = todo[i]!;
    for (const [d, offset] of [-size, 1, size, -1].entries()) {
      const next = cell + offset;
      if (walls[cell]?.[d] !== false || next < 0 || next >= size * size || ((d === 1 || d === 3) && Math.floor(next / size) !== Math.floor(cell / size)) || parent.has(next)) continue;
      parent.set(next, cell); todo.push(next);
    }
  }
  if (!parent.has(size * size - 1)) return [];
  const path: number[] = [];
  for (let cell = size * size - 1; cell !== -1; cell = parent.get(cell)!) path.unshift(cell);
  return path;
}

function validMaze(size: number, walls: boolean[][]): boolean {
  if (!Number.isInteger(size) || size < 2 || walls.length !== size * size || walls.some(cell => cell.length !== 4)) return false;
  const reached = new Set([0]), stack = [0];
  while (stack.length) {
    const cell = stack.pop()!, r = Math.floor(cell / size), c = cell % size;
    for (const [d, [y, x]] of [[r - 1, c], [r, c + 1], [r + 1, c], [r, c - 1]].entries()) {
      if (walls[cell]![d]) continue;
      if (y! < 0 || y! >= size || x! < 0 || x! >= size) return false;
      const next = y! * size + x!;
      if (walls[next]![(d + 2) % 4] !== false) return false;
      if (!reached.has(next)) { reached.add(next); stack.push(next); }
    }
  }
  return reached.size === size * size && walls.reduce((n, cell) => n + cell.filter(wall => !wall).length, 0) === 2 * (size * size - 1);
}

function crossword(settings: TemplateSettings, random: () => number): Extract<TemplateData, { kind: "crossword" }> {
  const pool = settings.crosswordClues?.length ? settings.crosswordClues : settings.words.length ? settings.words.map(word => {
    let mixed = shuffle([...word], random).join("");
    if (mixed === word) {
      const different = [...word].findIndex(letter => letter !== word[0]);
      if (different > 0) mixed = word[different]! + word.slice(1, different) + word[0]! + word.slice(different + 1);
    }
    return { word, clue: mixed === word ? `Repeat the letter ${word[0]} ${word.length} times.` : `Unscramble: ${mixed}` };
  }) : everydayClues;
  const target = Math.min(pool.length, settings.difficulty === "easy" ? 8 : settings.difficulty === "medium" ? 10 : 12), size = 15;
  for (let attempt = 0; attempt < 40; attempt++) {
    const grid = Array.from({ length: size }, () => Array<string>(size).fill(""));
    const directions = Array.from({ length: size }, () => Array<number>(size).fill(0));
    const entries: CrosswordEntry[] = [];
    for (const item of shuffle(pool, random)) {
      if (entries.length >= target) break;
      const candidates: { row: number; column: number; direction: "across" | "down" }[] = [];
      for (const direction of ["across", "down"] as const) for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        const dr = direction === "down" ? 1 : 0, dc = 1 - dr, bit = dr ? 2 : 1;
        if (r + dr * (item.word.length - 1) >= size || c + dc * (item.word.length - 1) >= size) continue;
        if (!entries.length && (direction !== "across" || r !== 7 || c !== Math.floor((size - item.word.length) / 2))) continue;
        if (grid[r - dr]?.[c - dc] || grid[r + dr * item.word.length]?.[c + dc * item.word.length]) continue;
        let crosses = 0, valid = true;
        for (let i = 0; i < item.word.length; i++) {
          const y = r + dr * i, x = c + dc * i, current = grid[y]![x];
          if (current) { if (current !== item.word[i] || (directions[y]![x]! & bit)) { valid = false; break; } crosses++; }
          else if (grid[y - dc]?.[x - dr] || grid[y + dc]?.[x + dr]) { valid = false; break; }
        }
        if (valid && (!entries.length || crosses)) candidates.push({ row: r, column: c, direction });
      }
      if (!candidates.length) continue;
      const chosen = candidates[Math.floor(random() * candidates.length)]!;
      [...item.word].forEach((letter, i) => { const r = chosen.row + (chosen.direction === "down" ? i : 0), c = chosen.column + (chosen.direction === "across" ? i : 0); grid[r]![c] = letter; directions[r]![c]! |= chosen.direction === "across" ? 1 : 2; });
      entries.push({ ...item, ...chosen, number: 0 });
    }
    if (entries.length < Math.min(target, 6)) continue;
    const starts = [...new Set(entries.map(e => e.row * size + e.column))].sort((a, b) => a - b);
    entries.forEach(e => { e.number = starts.indexOf(e.row * size + e.column) + 1; });
    return { kind: "crossword", grid, entries: entries.sort((a, b) => a.number - b.number) };
  }
  throw new DomainError("CROSSWORD_PLACEMENT", "These answers do not form a connected crossword. Add more words with shared letters.");
}

const pictures: Record<string, string[]> = {
  heart: ["000000000000", "001100001100", "011110011110", "111111111111", "111111111111", "011111111110", "001111111100", "000111111000", "000011110000", "000001100000", "000000000000", "000000000000"],
  tree: ["000001100000", "000011110000", "000111111000", "000011110000", "000111111000", "001111111100", "000111111000", "001111111100", "011111111110", "000004400000", "000004400000", "000004400000"],
  flower: ["000022220000", "000222222000", "002222222200", "022233332220", "022233332220", "002233332200", "000222222000", "000001100000", "000111100000", "000001111000", "000001100000", "000001100000"],
  rocket: ["000003300000", "000033330000", "000222222000", "000222222000", "000220022000", "000220022000", "000222222000", "002222222200", "022222222220", "000333333000", "000033330000", "000003300000"],
};

export function generateTemplate(key: TemplateKey, settings: TemplateSettings, seed: string): TemplatePuzzle {
  const random = seededRandom(seed), int = (max: number) => Math.floor(random() * max);
  const solution: TemplateSolution = { grid: [], values: [], text: [], route: [] };
  let data: TemplateData;
  switch (key) {
    case "crossword": data = crossword(settings, random); solution.text = data.entries.map(e => e.word); break;
    case "math-maze": {
      const size = settings.difficulty === "easy" ? 5 : 6, walls = Array.from({ length: size * size }, () => [true, true, true, true]);
      const seen = new Set([0]), stack = [0];
      while (stack.length) {
        const cell = stack.at(-1)!, r = Math.floor(cell / size), c = cell % size;
        const neighbors = [[r - 1, c], [r, c + 1], [r + 1, c], [r, c - 1]].map(([y, x], d) => ({ y: y!, x: x!, d })).filter(n => n.y >= 0 && n.y < size && n.x >= 0 && n.x < size && !seen.has(n.y * size + n.x));
        if (!neighbors.length) { stack.pop(); continue; }
        const next = neighbors[int(neighbors.length)]!, index = next.y * size + next.x;
        walls[cell]![next.d] = false; walls[index]![(next.d + 2) % 4] = false; seen.add(index); stack.push(index);
      }
      const topics = shuffle(mathTopicKeys.filter(topic => topic !== "mixed"), random);
      const expressions = walls.map((_, i) => mathExpression(settings.mathTopic === "mixed" ? topics[i % topics.length]! : settings.mathTopic ?? "addition", settings.difficulty, int));
      data = { kind: key, size, walls, expressions };
      solution.values = expressions.map(arithmetic); solution.route = mazeRoute(size, walls);
      break;
    }
    case "secret-code": {
      const alphabet = shuffle([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"], random).join("");
      const words = shuffle(settings.words, random).slice(0, settings.difficulty === "easy" ? 6 : settings.difficulty === "medium" ? 8 : 10);
      data = { kind: key, alphabet, encoded: words.map(word => [...word].map(letter => alphabet.indexOf(letter) + 1)) }; solution.text = words; break;
    }
    case "picture-sudoku": {
      const symbols = shuffle([0, 1, 2, 3, 4, 5], random).slice(0, 4), digits = shuffle([1, 2, 3, 4], random);
      const order = () => shuffle([0, 1], random).flatMap(b => shuffle([b * 2, b * 2 + 1], random));
      const rows = order(), columns = order();
      const grid = rows.map(r => columns.map(c => digits[(r * 2 + Math.floor(r / 2) + c) % 4]!));
      solution.grid = grid.map(row => [...row]);
      let clues = 16; const minimum = settings.difficulty === "easy" ? 8 : settings.difficulty === "medium" ? 6 : 4;
      for (const cell of shuffle(Array.from({ length: 16 }, (_, i) => i), random)) {
        if (clues <= minimum) break;
        const r = Math.floor(cell / 4), c = cell % 4, value = grid[r]![c]!; grid[r]![c] = 0;
        if (solveSudoku(grid).length !== 1) grid[r]![c] = value; else clues--;
      }
      data = { kind: key, grid, symbols, ...(settings.words.length ? { words: shuffle(settings.words, random).slice(0, 4) } : {}) }; break;
    }
    case "i-spy": {
      const count = settings.difficulty === "easy" ? 36 : settings.difficulty === "medium" ? 48 : 60;
      const icons = shuffle([...Array.from({ length: 6 }, (_, i) => i), ...Array.from({ length: count - 6 }, () => int(6))], random);
      data = { kind: key, icons, rotations: icons.map(() => (int(5) - 2) * 8), columns: 6, ...(settings.words.length ? { words: shuffle(settings.words, random).slice(0, 6) } : {}) };
      solution.values = Array.from({ length: 6 }, (_, i) => icons.filter(icon => icon === i).length); break;
    }
    case "color-by-code": {
      const picture = settings.picture && pictures[settings.picture] ? settings.picture : shuffle(Object.keys(pictures), random)[0]!;
      const values = pictures[picture]!.join("").split("").map(Number).map(n => picture === "heart" && n === 1 ? 2 : n);
      // Positive, shuffled answers keep the background from being revealed by
      // an entire field of identical "0 + 0" cells in easy puzzles.
      const targets = shuffle(settings.difficulty === "easy" ? [5, 6, 7, 8, 9] : settings.difficulty === "medium" ? [10, 12, 14, 16, 18] : [20, 24, 28, 32, 36], random);
      const expressions = values.map(index => {
        const value = targets[index]!;
        if (settings.difficulty === "hard" && int(2)) {
          const factors = [2, 3, 4, 5, 6, 7, 8, 9].filter(n => value % n === 0), factor = factors[int(factors.length)]!;
          return `${factor} x ${value / factor}`;
        }
        const a = int(value - 1) + 1, offset = int(9) + 1;
        return settings.difficulty === "easy" ? `${a} + ${value - a}` : `${value + offset} - ${offset}`;
      });
      data = { kind: key, size: 12, expressions, picture, palette: [{ name: "White", hex: "#ffffff" }, { name: "Green", hex: "#49934c" }, { name: "Orange", hex: "#ed8539" }, { name: "Yellow", hex: "#f5ce42" }, { name: "Brown", hex: "#956542" }].map((color, i) => ({ ...color, value: targets[i]! })) };
      if (settings.words.length) {
        const words = shuffle(settings.words, random).slice(0, 5);
        data.words = words;
        // Larger word tiles keep even long vocabulary readable in print.
        const compact = Array.from({ length: 36 }, (_, i) => {
          const top = Math.floor(i / 6) * 24 + (i % 6) * 2;
          const block = [values[top]!, values[top + 1]!, values[top + 12]!, values[top + 13]!];
          return [...block].sort((a, b) => block.filter(n => n === b).length - block.filter(n => n === a).length)[0]!;
        });
        values.splice(0, values.length, ...compact);
        data.size = 6;
        data.expressions = values.map(index => words[index]!);
      }
      solution.values = values; break;
    }
    case "logic-puzzle": {
      const people = shuffle(["Alex", "Blair", "Casey", "Drew", "Erin", "Finn", "Jules", "Robin"], random).slice(0, 4);
      const vocabulary = settings.words.length ? shuffle(settings.words, random).slice(0, 8) : [];
      const pets = vocabulary.length ? vocabulary.slice(0, 4) : shuffle(["cat", "dog", "fish", "bird", "rabbit", "turtle"], random).slice(0, 4), foods = vocabulary.length ? vocabulary.slice(4, 8) : shuffle(["apple", "pear", "toast", "carrot", "banana", "yogurt"], random).slice(0, 4);
      solution.values = [...shuffle([0, 1, 2, 3], random), ...shuffle([0, 1, 2, 3], random)];
      const all: LogicClue[] = [];
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (const kind of ["pet", "food", "not-pet", "not-food", "pair"] as const) {
        const clue = { kind, a, b }; if (satisfiesClue(solution.values, clue)) all.push(clue);
      }
      const candidates = shuffle(all, random), clues: LogicClue[] = [];
      let remaining = solveLogic([]);
      while (remaining.length > 1) {
        const ranked = candidates.filter(c => !clues.includes(c)).map(clue => ({ clue, left: remaining.filter(v => satisfiesClue(v, clue)) })).filter(c => c.left.length < remaining.length).sort((a, b) => a.left.length - b.left.length);
        if (!ranked.length) throw new DomainError("LOGIC_GENERATION", "Could not produce a unique logic puzzle.");
        const selected = ranked[int(Math.min(settings.difficulty === "easy" ? 1 : 4, ranked.length))]!;
        clues.push(selected.clue); remaining = selected.left;
      }
      for (let i = clues.length - 1; i >= 0; i--) if (solveLogic(clues.filter((_, j) => j !== i)).length === 1) clues.splice(i, 1);
      data = { kind: key, people, pets, foods, clues, ...(vocabulary.length ? { vocabulary: true } : {}) }; break;
    }
    default: throw new DomainError("UNSUPPORTED_TEMPLATE", "Choose an available puzzle template.");
  }
  const puzzle = { engineKey: key, engineVersion: TEMPLATE_ENGINE_VERSION, seed, data, solution };
  if (!validateTemplate(puzzle, settings.words)) throw new DomainError("INVALID_PUZZLE", "Puzzle answer verification failed.");
  return puzzle;
}

export function validateTemplate(puzzle: TemplatePuzzle, vocabulary?: readonly string[]): boolean {
  const { data: d, solution: s } = puzzle;
  if (puzzle.engineKey !== d.kind) return false;
  if (vocabulary?.length) {
    const used = d.kind === "crossword" ? d.entries.map(entry => entry.word)
      : d.kind === "logic-puzzle" ? [...d.pets, ...d.foods]
      : d.kind === "secret-code" ? s.text : d.words;
    const allowed = new Set(vocabulary);
    if (!used?.length || used.some(word => !allowed.has(word))) return false;
  }
  switch (d.kind) {
    case "crossword": return d.entries.length >= 6 && new Set(d.entries.map(e => e.word)).size === d.entries.length && d.entries.every((e, i) => e.clue.length > 0 && s.text[i] === e.word && [...e.word].every((letter, n) => d.grid[e.row + (e.direction === "down" ? n : 0)]?.[e.column + (e.direction === "across" ? n : 0)] === letter));
    case "math-maze": return validMaze(d.size, d.walls) && JSON.stringify(mazeRoute(d.size, d.walls)) === JSON.stringify(s.route) && s.route.length > 1 && d.expressions.length === d.size ** 2 && d.expressions.length === s.values.length && d.expressions.every((e, i) => arithmetic(e) === s.values[i]) && (!d.words || (d.words.length === d.size ** 2 && d.words.every(word => /^[A-Z]{2,15}$/.test(word)) && JSON.stringify(s.text) === JSON.stringify(s.route.map(cell => d.words![cell]))));
    case "secret-code": return new Set(d.alphabet).size === 26 && d.encoded.length === s.text.length && d.encoded.length >= 6 && d.encoded.every((codes, i) => codes.every(n => n >= 1 && n <= 26) && codes.map(n => d.alphabet[n - 1]).join("") === s.text[i]);
    case "picture-sudoku": { const solved = solveSudoku(d.grid); return (!d.words || validWords(d.words, 4)) && new Set(d.symbols).size === 4 && d.symbols.length === 4 && d.symbols.every(n => Number.isInteger(n) && n >= 0 && n < 6) && solved.length === 1 && JSON.stringify(solved[0]) === JSON.stringify(s.grid); }
    case "i-spy": return (!d.words || validWords(d.words, 6)) && d.icons.length === d.rotations.length && d.icons.every(i => i >= 0 && i < 6) && s.values.length === 6 && s.values.every((n, i) => n === d.icons.filter(icon => icon === i).length);
    case "color-by-code": return (!d.words || validWords(d.words, 5)) && d.expressions.length === d.size ** 2 && s.values.length === d.expressions.length && new Set(d.palette.map((color, i) => color.value ?? i)).size === d.palette.length && d.expressions.every((e, i) => Number.isInteger(s.values[i]) && s.values[i]! >= 0 && s.values[i]! < d.palette.length && (d.words ? e === d.words[s.values[i]!] : arithmetic(e) === (d.palette[s.values[i]!]!.value ?? s.values[i])));
    case "logic-puzzle": { const solved = solveLogic(d.clues); return (!d.vocabulary || validWords([...d.pets, ...d.foods], 8)) && solved.length === 1 && JSON.stringify(solved[0]) === JSON.stringify(s.values); }
  }
}

const validWord = (word: string) => /^[A-Z]{3,15}$/.test(word);
const validWords = (words: string[], count: number) => words.length === count && new Set(words).size === count && words.every(validWord);
