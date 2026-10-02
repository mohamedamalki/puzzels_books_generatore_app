import { describe, expect, it } from "vitest";
import { assertTransition } from "../../src/modules/books/workflow";
import { ValidationEngine } from "../../src/modules/validation/contracts";
import { evaluateUniqueness, uniquenessPolicySchema, jaccardSimilarity, type SimilarityMetrics } from "../../src/modules/uniqueness/policy";

const baseline: SimilarityMetrics = { exactPageDuplicates: 0, exactPuzzleDuplicates: 0, exactWordSetDuplicates: 0, titleSimilarity: 0, subtitleSimilarity: null, wordOverlap: 0, questionOverlap: null, pageStructureSimilarity: 1, contentOverlap: 0, coverSimilarity: null };
const policy = uniquenessPolicySchema.parse({});
const required = ["wordOverlap", "contentOverlap", "titleSimilarity"] as const;

describe("uniqueness policy", () => {
  it("blocks exact duplicates regardless of high semantic score", () => {
    const report = evaluateUniqueness({ ...baseline, exactPuzzleDuplicates: 1 }, policy, required);
    expect(report.score).toBe(100);
    expect(report.passed).toBe(false);
  });
  it("fails closed for unmeasured required comparisons", () => {
    expect(evaluateUniqueness(baseline, policy, ["questionOverlap"]).passed).toBe(false);
    expect(evaluateUniqueness(baseline, policy, []).passed).toBe(false);
    expect(evaluateUniqueness(baseline, policy, required).passed).toBe(true);
  });
  it("enforces strict question/content boundaries and rejects invalid metrics", () => {
    expect(evaluateUniqueness({ ...baseline, contentOverlap: 0.25 }, policy, required).passed).toBe(false);
    expect(evaluateUniqueness({ ...baseline, questionOverlap: 0.05 }, policy, required).passed).toBe(false);
    expect(() => evaluateUniqueness({ ...baseline, wordOverlap: 2 }, policy, required)).toThrow();
  });
  it("does not penalize intentionally shared layouts or invent cover measurements", () => {
    const result = evaluateUniqueness(baseline, policy, required);
    expect(result.score).toBe(100);
    expect(result.metrics.coverSimilarity).toBeNull();
  });
  it("compares distinct token sets", () => {
    expect(jaccardSimilarity(["a", "a", "b"], ["b", "c"])).toBeCloseTo(1 / 3);
    expect(jaccardSimilarity([], [])).toBe(0);
  });
});

describe("validation and human approval", () => {
  it("does not permit absent checks or empty policies to pass", async () => {
    expect((await new ValidationEngine([], ["answers"]).validate({})).passed).toBe(false);
    expect((await new ValidationEngine([], []).validate({})).passed).toBe(false);
  });
  it("propagates validator failure without marking a pass", async () => {
    const engine = new ValidationEngine([{ key: "answers", version: "1.0.0", validate: async () => { throw new Error("broken"); } }], ["answers"]);
    await expect(engine.validate({})).rejects.toThrow("broken");
  });
  it("reports issues and validates every required rule", async () => {
    const engine = new ValidationEngine([{ key: "answers", version: "1.0.0", validate: async () => [{ rule: "answers", severity: "ERROR" as const, message: "Missing answer" }] }], ["answers"]);
    const result = await engine.validate({});
    expect(result.passed).toBe(false);
    expect(result.checkedRules).toEqual(["answers"]);
  });
  it("requires current sealed revision quality reports", () => {
    expect(() => assertTransition("VALIDATING", "VALIDATED", { revisionId: "v2", validatedRevisionId: "v1", uniquenessPassedRevisionId: "v2", sealed: true })).toThrow("Current sealed revision");
    expect(() => assertTransition("DRAFT", "READY", { revisionId: "v1", sealed: true })).toThrow("Cannot move");
  });
  it("rejects stale or absent human approval", () => {
    const gates = { revisionId: "v2", validatedRevisionId: "v2", uniquenessPassedRevisionId: "v2", sealed: true };
    expect(() => assertTransition("VALIDATED", "READY", gates)).toThrow("human approval");
    expect(() => assertTransition("VALIDATED", "READY", { ...gates, approvedRevisionId: "v1", approvedBy: "owner" })).toThrow();
    expect(() => assertTransition("VALIDATED", "READY", { ...gates, approvedRevisionId: "v2", approvedBy: "owner" })).not.toThrow();
  });
});
