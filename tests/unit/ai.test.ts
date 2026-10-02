import { expect, it, vi } from "vitest";
import { z } from "zod";
import { AIService } from "../../src/services/ai/service";
import type { AIProvider } from "../../src/services/ai/contracts";

const request = { provider: "test", model: "test-model", systemPrompt: "Return words", task: "flowers", temperature: 0.2, maxOutputTokens: 500, signal: new AbortController().signal, schema: z.object({ words: z.array(z.string()).min(1) }).strict(), jsonSchema: { type: "object" } };
const response = (text: string) => ({ text, inputTokens: 10, outputTokens: 20 });

it("validates output and records invalid attempts before retry", async () => {
  const generate = vi.fn().mockResolvedValueOnce(response("invalid json")).mockResolvedValueOnce(response('{"words":["rose"]}'));
  const record = vi.fn();
  const result = await new AIService([{ key: "test", generate }], { record }).generate(request);
  expect(result).toEqual({ words: ["rose"] });
  expect(record).toHaveBeenCalledTimes(2);
  expect(record.mock.calls[0]?.[0].validOutput).toBe(false);
  expect(record.mock.calls[1]?.[0].validOutput).toBe(true);
});

it("bounds retries and refuses schema-invalid objects", async () => {
  const generate = vi.fn().mockResolvedValue(response('{"words":[]}'));
  await expect(new AIService([{ key: "test", generate }], { record: vi.fn() }).generate(request)).rejects.toThrow("bounded retries");
  expect(generate).toHaveBeenCalledTimes(2);
});

it("does not retry provider errors or select another provider", async () => {
  const generate = vi.fn().mockRejectedValue(new Error("provider unavailable"));
  const service = new AIService([{ key: "test", generate }], { record: vi.fn() });
  await expect(service.generate(request)).rejects.toThrow("provider unavailable");
  expect(generate).toHaveBeenCalledTimes(1);
  await expect(service.generate({ ...request, provider: "missing" })).rejects.toThrow("not configured");
});

it("honors cancellation before making a billable request", async () => {
  const generate = vi.fn();
  const service = new AIService([{ key: "test", generate } satisfies AIProvider], { record: vi.fn() });
  await expect(service.generate({ ...request, signal: AbortSignal.abort() })).rejects.toThrow();
  expect(generate).not.toHaveBeenCalled();
});
