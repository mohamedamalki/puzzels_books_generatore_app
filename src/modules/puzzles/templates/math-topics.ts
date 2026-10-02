export const mathTopicKeys = ["addition", "subtraction", "multiplication", "division", "fractions", "decimals", "percentages", "negative-numbers", "powers", "square-roots", "order-of-operations", "mixed"] as const;
export type MathTopic = typeof mathTopicKeys[number];
export const mathTopics: { key: MathTopic; label: string }[] = [
  { key: "addition", label: "Addition" },
  { key: "subtraction", label: "Subtraction" },
  { key: "multiplication", label: "Multiplication" },
  { key: "division", label: "Division" },
  { key: "fractions", label: "Fractions of numbers" },
  { key: "decimals", label: "Decimals" },
  { key: "percentages", label: "Percentages" },
  { key: "negative-numbers", label: "Negative numbers" },
  { key: "powers", label: "Powers" },
  { key: "square-roots", label: "Square roots" },
  { key: "order-of-operations", label: "Order of operations" },
  { key: "mixed", label: "Mixed math topics" },
];

// Deliberately parse only supported printed math notation, never executable code.
export function evaluateMath(expression: string): number {
  let match = /^(-?\d+(?:\.\d+)?) ([+x/-]) (-?\d+(?:\.\d+)?)$/.exec(expression);
  if (match) {
    const a = Number(match[1]), b = Number(match[3]);
    const result = match[2] === "+" ? a + b : match[2] === "-" ? a - b : match[2] === "x" ? a * b : b === 0 ? NaN : a / b;
    return Math.round(result * 1e8) / 1e8;
  }
  match = /^(\d+)\/(\d+) of (\d+)$/.exec(expression);
  if (match) return Number(match[2]) === 0 ? NaN : Number(match[1]) * Number(match[3]) / Number(match[2]);
  match = /^(\d+)% of (\d+)$/.exec(expression);
  if (match) return Number(match[1]) * Number(match[2]) / 100;
  match = /^(\d+)\^(\d+)$/.exec(expression);
  if (match) return Number(match[1]) ** Number(match[2]);
  match = /^sqrt\((\d+)\)$/.exec(expression);
  if (match) return Math.sqrt(Number(match[1]));
  match = /^(\d+) \+ (\d+) x (\d+)$/.exec(expression);
  if (match) return Number(match[1]) + Number(match[2]) * Number(match[3]);
  return NaN;
}

export function mathExpression(topic: MathTopic, difficulty: "easy" | "medium" | "hard", int: (max: number) => number): string {
  const level = difficulty === "easy" ? 0 : difficulty === "medium" ? 1 : 2;
  const a = int([9, 30, 99][level]!) + 1, b = int([9, 12, 25][level]!) + 1;
  switch (topic) {
    case "addition": return `${a} + ${b}`;
    case "subtraction": return `${a + b} - ${b}`;
    case "multiplication": return `${a} x ${b}`;
    case "division": return `${a * b} / ${b}`;
    case "fractions": {
      const denominator = int([3, 7, 11][level]!) + 2, numerator = int(denominator - 1) + 1;
      return `${numerator}/${denominator} of ${denominator * b}`;
    }
    case "decimals": {
      const scale = level === 2 ? 100 : 10;
      return `${(a / scale).toFixed(level === 2 ? 2 : 1)} + ${(b / scale).toFixed(level === 2 ? 2 : 1)}`;
    }
    case "percentages": return `${[10, 20, 25, 50, 75][int(level === 0 ? 2 : 5)]}% of ${b * 20}`;
    case "negative-numbers": return `-${a} ${int(2) ? "+" : "-"} ${b}`;
    case "powers": return `${int([5, 9, 12][level]!) + 1}^${level === 2 ? int(2) + 2 : 2}`;
    case "square-roots": { const root = int([9, 15, 25][level]!) + 1; return `sqrt(${root * root})`; }
    case "order-of-operations": return `${b} + ${int(9) + 1} x ${int([5, 9, 12][level]!) + 1}`;
    case "mixed": return mathExpression(mathTopicKeys[int(mathTopicKeys.length - 1)]!, difficulty, int);
  }
}
