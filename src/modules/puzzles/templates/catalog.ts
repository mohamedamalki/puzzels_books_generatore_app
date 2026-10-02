export const templateKeys = ["word-search", "crossword", "math-maze", "secret-code", "picture-sudoku", "i-spy", "color-by-code", "logic-puzzle"] as const;
export type TemplateKey = typeof templateKeys[number];
export const TEMPLATE_ENGINE_VERSION = "1.3.0";
export const minimumTemplateWords: Record<TemplateKey, number> = {
  "word-search": 24, crossword: 12, "math-maze": 0, "secret-code": 10,
  "picture-sudoku": 4, "i-spy": 6, "color-by-code": 5, "logic-puzzle": 8,
};
export const templateWordHelp: Record<TemplateKey, string> = {
  "word-search": "Your words are hidden in the puzzle grids.",
  crossword: "Your words become crossword answers. Automatic hints scramble their letters; you can also write your own clues.",
  "math-maze": "Choose a math topic and solve the problems along the maze route. Difficulty controls the number ranges.",
  "secret-code": "Decode your topic words using a different letter-number key on each page.",
  "picture-sudoku": "With a word collection, this becomes Word Sudoku: use four topic words in each grid instead of pictures.",
  "i-spy": "With a word collection, find and count six topic words instead of pictures.",
  "color-by-code": "Your words become the color codes. Match each word to its color to reveal the built-in picture you choose below.",
  "logic-puzzle": "Match four people to two sets of your topic words using generated deduction clues.",
};
export const puzzleTemplates: { key: TemplateKey; name: string; description: string; details: string }[] = [
  { key: "word-search", name: "Word Search", description: "Find 20 hidden words in each grid.", details: "Your collections or custom words · 15 × 15 grids" },
  { key: "crossword", name: "Crossword", description: "Solve clues and fill an interlocking word grid.", details: "Your words with automatic anagram hints, or your own clues" },
  { key: "math-maze", name: "Math Maze", description: "Solve arithmetic as you trace a route through the maze.", details: "A unique route · Basic operations, fractions, decimals, powers, and more" },
  { key: "secret-code", name: "Secret Code", description: "Use a letter–number key to decode hidden words.", details: "Word collections or your own words · A different code per page" },
  { key: "picture-sudoku", name: "Picture Sudoku", description: "Complete a Sudoku grid with topic words or pictures.", details: "Four topic words per grid - One verified solution" },
  { key: "i-spy", name: "I Spy", description: "Find and count your topic words or pictures.", details: "Six topic words per scene - Verified answer counts" },
  { key: "color-by-code", name: "Mystery Picture / Color by Code", description: "Match topic words to colors to reveal a built-in picture.", details: "Your words as color codes - Four built-in pictures" },
  { key: "logic-puzzle", name: "Logic Puzzle", description: "Use clues to match people with your topic vocabulary.", details: "Deduction grids · One verified solution" },
];
export function templateName(key: string = "word-search", vocabulary = false) {
  const variants: Record<string, string> = { "picture-sudoku": "Word Sudoku", "i-spy": "I Spy Words", "color-by-code": "Color by Word", "math-maze": "Math & Word Maze" };
  return (vocabulary ? variants[key] : undefined) ?? puzzleTemplates.find(template => template.key === key)?.name ?? "Puzzle";
}

export const everydayClues = [
  ["APPLE", "A crisp fruit that grows on a tree"], ["BREAD", "Food baked in a loaf"], ["CHAIR", "A seat for one person"],
  ["CLOUD", "A white or gray shape in the sky"], ["DREAM", "A story you may see while asleep"], ["EARTH", "The planet where we live"],
  ["FLOWER", "The blooming part of a plant"], ["GARDEN", "A place to grow flowers or vegetables"], ["HEART", "The organ that pumps blood"],
  ["HOUSE", "A building where people live"], ["LEMON", "A sour yellow citrus fruit"], ["LIGHT", "What helps us see in the dark"],
  ["MOUSE", "A small animal with a long thin tail"], ["NIGHT", "The time between sunset and sunrise"], ["OCEAN", "A very large body of salt water"],
  ["PAPER", "Material used for writing and drawing"], ["PENCIL", "A writing tool with an erasable tip"], ["RAIN", "Water drops falling from clouds"],
  ["RIVER", "Flowing water that follows a channel"], ["ROBOT", "A machine programmed to do tasks"], ["SCHOOL", "A place where students learn"],
  ["SNAKE", "A reptile with no legs"], ["SPOON", "A utensil used to eat soup"], ["STAR", "A bright point of light in the night sky"],
  ["TABLE", "Furniture with a flat top and legs"], ["TIGER", "A large striped wild cat"], ["TRAIN", "A vehicle that travels on rails"],
  ["WATER", "A liquid people drink to stay hydrated"], ["WHALE", "A large mammal that lives in the sea"], ["WINDOW", "An opening with glass in a wall"],
].map(([word, clue]) => ({ word: word!, clue: clue! }));
