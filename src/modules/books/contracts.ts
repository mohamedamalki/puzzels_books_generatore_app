import type { z } from "zod";
import type { Json } from "../../lib/json";
import type { GenerationContext } from "../puzzles/core/contracts";
import type { ValidationReport } from "../validation/contracts";

export interface PagePlan {
  key: string;
  role: "FRONT_MATTER" | "ACTIVITY" | "ANSWER" | "BACK_MATTER";
  engineKey?: string;
  seed: string;
  templateKey: string;
  content: Json;
  answerForKey?: string;
}
export interface PageDocument {
  widthInches: number;
  heightInches: number;
  marginInches: number;
  // Structured primitives only. Renderers escape text; plugins cannot inject HTML.
  blocks: readonly ({ kind: "text"; text: string; fontSizePt: number } | { kind: "puzzle"; engineKey: string; data: Json })[];
}
export interface BookMetadata {
  title: string;
  subtitle?: string;
  description: string;
  keywords: readonly string[];
}

export interface BookTypePlugin<TConfig, TContent> {
  readonly key: string;
  readonly version: string;
  readonly configurationSchema: z.ZodType<TConfig>;
  readonly contentSchema: z.ZodType<TContent>;
  plan(config: TConfig, savedContent: TContent, context: GenerationContext): Promise<readonly PagePlan[]>;
  validate(config: TConfig, pages: readonly PagePlan[]): ValidationReport;
  render(page: PagePlan, config: TConfig): PageDocument;
  answers(pages: readonly PagePlan[], config: TConfig): readonly PagePlan[];
  metadata(config: TConfig, savedContent: TContent): BookMetadata;
}
