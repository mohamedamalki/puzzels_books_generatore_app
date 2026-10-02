import { z } from "zod";

const ratio = z.number().finite().min(0).max(1);
export const uniquenessPolicySchema = z.object({
  maxQuestionOverlap: ratio.default(0.05),
  maxContentOverlap: ratio.default(0.25),
  maxTitleSimilarity: ratio.default(0.9),
  minScore: z.number().int().min(0).max(100).default(75),
}).strict();
export type UniquenessPolicy = z.infer<typeof uniquenessPolicySchema>;

export interface SimilarityMetrics {
  exactPageDuplicates: number;
  exactPuzzleDuplicates: number;
  exactWordSetDuplicates: number;
  titleSimilarity: number | null;
  subtitleSimilarity: number | null;
  wordOverlap: number | null;
  questionOverlap: number | null;
  pageStructureSimilarity: number | null;
  contentOverlap: number | null;
  coverSimilarity: number | null;
}
const metricsSchema = z.object({
  exactPageDuplicates: z.number().int().nonnegative(),
  exactPuzzleDuplicates: z.number().int().nonnegative(),
  exactWordSetDuplicates: z.number().int().nonnegative(),
  titleSimilarity: ratio.nullable(), subtitleSimilarity: ratio.nullable(), wordOverlap: ratio.nullable(),
  questionOverlap: ratio.nullable(), pageStructureSimilarity: ratio.nullable(), contentOverlap: ratio.nullable(), coverSimilarity: ratio.nullable(),
}).strict();

/** Scores describe measured library overlap, never originality or commercial/legal guarantees. */
export function evaluateUniqueness(input: SimilarityMetrics, rawPolicy: UniquenessPolicy, required: readonly (keyof SimilarityMetrics)[]) {
  const metrics = metricsSchema.parse(input);
  const policy = uniquenessPolicySchema.parse(rawPolicy);
  const failures: string[] = [];
  for (const key of required) if (metrics[key] === null) failures.push(`Unmeasured required metric: ${key}`);
  if (!required.length) failures.push("No required comparison metrics configured");
  for (const key of ["exactPageDuplicates", "exactPuzzleDuplicates", "exactWordSetDuplicates"] as const) if (metrics[key] > 0) failures.push(key);
  if (metrics.questionOverlap !== null && metrics.questionOverlap >= policy.maxQuestionOverlap && metrics.questionOverlap > 0) failures.push("questionOverlap");
  if (metrics.contentOverlap !== null && metrics.contentOverlap >= policy.maxContentOverlap && metrics.contentOverlap > 0) failures.push("contentOverlap");
  if (metrics.titleSimilarity !== null && metrics.titleSimilarity >= policy.maxTitleSimilarity && metrics.titleSimilarity > 0) failures.push("titleSimilarity");
  // Repeated structures are expected in print templates; covers are optional until a visual comparator exists.
  const weighted = [[metrics.titleSimilarity, 0.1], [metrics.subtitleSimilarity, 0.05], [metrics.wordOverlap, 0.2], [metrics.questionOverlap, 0.25], [metrics.contentOverlap, 0.4]] as const;
  let weight = 0;
  let overlap = 0;
  for (const [value, importance] of weighted) if (value !== null) { weight += importance; overlap += value * importance; }
  const score = weight > 0 ? Math.round(100 * (1 - overlap / weight)) : null;
  if (score === null || score < policy.minScore) failures.push("minScore");
  return { passed: failures.length === 0, score, failures, metrics, policy, algorithmVersion: "1.0.0" };
}

export function jaccardSimilarity(left: readonly string[], right: readonly string[]): number {
  const a = new Set(left);
  const b = new Set(right);
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : [...a].filter(value => b.has(value)).length / union.size;
}
