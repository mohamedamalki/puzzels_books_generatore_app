export type Severity = "INFO" | "WARNING" | "ERROR";
export interface ValidationIssue {
  rule: string;
  severity: Severity;
  message: string;
  pageNumber?: number;
}
export interface ValidationReport {
  passed: boolean;
  issues: readonly ValidationIssue[];
  checkedRules: readonly string[];
}
export interface Validator<T> {
  readonly key: string;
  readonly version: string;
  validate(input: T): Promise<readonly ValidationIssue[]>;
}

export class ValidationEngine<T> {
  constructor(private readonly validators: readonly Validator<T>[], private readonly requiredRules: readonly string[]) {
    if (new Set(validators.map(v => v.key)).size !== validators.length) throw new Error("Duplicate validation rule");
  }

  async validate(input: T): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];
    const checkedRules: string[] = [];
    for (const validator of this.validators) {
      // Exceptions propagate: a crashed check is never interpreted as a pass.
      issues.push(...await validator.validate(input));
      checkedRules.push(validator.key);
    }
    for (const rule of this.requiredRules) {
      if (!checkedRules.includes(rule)) issues.push({ rule, severity: "ERROR", message: "Required validator did not run" });
    }
    if (this.requiredRules.length === 0) issues.push({ rule: "validation-policy", severity: "ERROR", message: "Required validation rules must be configured" });
    return { passed: !issues.some(i => i.severity === "ERROR"), issues, checkedRules };
  }
}
