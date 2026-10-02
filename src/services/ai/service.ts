import { DomainError } from "../../lib/errors";
import type { AIProvider, AIUsageSink, StructuredRequest } from "./contracts";

export class AIService {
  private readonly providers = new Map<string, AIProvider>();

  constructor(providers: readonly AIProvider[], private readonly usage: AIUsageSink) {
    for (const provider of providers) {
      if (this.providers.has(provider.key)) throw new DomainError("DUPLICATE_PROVIDER", "Provider already registered");
      this.providers.set(provider.key, provider);
    }
  }

  async generate<T>(request: StructuredRequest<T>): Promise<T> {
    const provider = this.providers.get(request.provider);
    if (!provider) throw new DomainError("PROVIDER_UNAVAILABLE", "Requested AI provider is not configured");
    const maxAttempts = request.maxAttempts ?? 2;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) throw new DomainError("INVALID_AI_REQUEST", "AI attempts must be between 1 and 3");
    if (!Number.isFinite(request.temperature) || request.temperature < 0 || request.temperature > 2 || !Number.isInteger(request.maxOutputTokens) || request.maxOutputTokens < 1 || !request.model.trim()) throw new DomainError("INVALID_AI_REQUEST", "Invalid AI request limits");
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      request.signal.throwIfAborted();
      // Network errors propagate to job retry policy. Do not blindly repeat chargeable requests.
      const response = await provider.generate({
        systemPrompt: request.systemPrompt,
        task: attempt === 1 ? request.task : `${request.task}\nReturn only a JSON value matching the supplied schema.`,
        jsonSchema: request.jsonSchema, temperature: request.temperature, model: request.model,
        maxOutputTokens: request.maxOutputTokens, signal: request.signal,
      });
      let parsed: unknown;
      try { parsed = JSON.parse(response.text); } catch { parsed = undefined; }
      const result = request.schema.safeParse(parsed);
      await this.usage.record({ provider: request.provider, model: request.model, attempt, inputTokens: response.inputTokens, outputTokens: response.outputTokens, requestId: response.requestId, validOutput: result.success });
      if (result.success) return result.data;
    }
    throw new DomainError("AI_OUTPUT_NEEDS_REVIEW", "AI output failed schema validation after bounded retries");
  }
}
