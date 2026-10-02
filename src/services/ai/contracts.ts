import type { z } from "zod";
import type { Json } from "../../lib/json";

export interface AIRequest {
  systemPrompt: string;
  task: string;
  jsonSchema: Json;
  temperature: number;
  model: string;
  maxOutputTokens: number;
  signal: AbortSignal;
}
export interface AIResponse {
  text: string;
  requestId?: string;
  inputTokens: number | null;
  outputTokens: number | null;
}
export interface AIProvider {
  readonly key: string;
  generate(request: AIRequest): Promise<AIResponse>;
}
export interface AIUsageRecord {
  provider: string;
  model: string;
  attempt: number;
  inputTokens: number | null;
  outputTokens: number | null;
  requestId?: string;
  validOutput: boolean;
}
export interface AIUsageSink { record(record: AIUsageRecord): Promise<void> }
export interface StructuredRequest<T> extends Omit<AIRequest, "jsonSchema"> {
  provider: string;
  schema: z.ZodType<T>;
  jsonSchema: Json;
  maxAttempts?: number;
}
