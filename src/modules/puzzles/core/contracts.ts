import type { z } from "zod";
import type { Json } from "../../../lib/json";
import type { ValidationReport } from "../../validation/contracts";

export interface GenerationContext {
  seed: string;
  signal: AbortSignal;
}
export interface GeneratedPuzzle<TData extends Json, TSolution extends Json> {
  engineKey: string;
  engineVersion: string;
  seed: string;
  data: TData;
  solution: TSolution;
}

/** Engines operate on validated, saved content; no network, database, clock or Math.random. */
export interface PuzzleEngine<TConfig, TInput, TData extends Json, TSolution extends Json> {
  readonly key: string;
  readonly version: string;
  readonly configurationSchema: z.ZodType<TConfig>;
  readonly inputSchema: z.ZodType<TInput>;
  generate(config: TConfig, input: TInput, context: GenerationContext): Promise<GeneratedPuzzle<TData, TSolution>>;
  validate(puzzle: GeneratedPuzzle<TData, TSolution>, config: TConfig, input: TInput): ValidationReport;
  canonicalize(puzzle: GeneratedPuzzle<TData, TSolution>): Json;
}
