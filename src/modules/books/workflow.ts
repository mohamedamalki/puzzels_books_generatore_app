import { DomainError } from "../../lib/errors";

export type BookStatus = "DRAFT" | "GENERATING" | "VALIDATING" | "NEEDS_REVIEW" | "VALIDATED" | "READY" | "EXPORTED" | "ARCHIVED" | "FAILED";
const transitions: Record<BookStatus, readonly BookStatus[]> = {
  DRAFT: ["GENERATING", "ARCHIVED"],
  GENERATING: ["VALIDATING", "NEEDS_REVIEW", "FAILED"],
  VALIDATING: ["VALIDATED", "NEEDS_REVIEW", "FAILED"],
  NEEDS_REVIEW: ["GENERATING", "VALIDATING", "ARCHIVED"],
  VALIDATED: ["READY", "DRAFT", "ARCHIVED"],
  READY: ["EXPORTED", "DRAFT", "ARCHIVED"],
  EXPORTED: ["DRAFT", "ARCHIVED"],
  FAILED: ["GENERATING", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};
export interface RevisionGates {
  revisionId: string;
  validatedRevisionId?: string;
  uniquenessPassedRevisionId?: string;
  approvedRevisionId?: string;
  approvedBy?: string;
  sealed: boolean;
}

export function assertTransition(from: BookStatus, to: BookStatus, gates: RevisionGates): void {
  if (!transitions[from].includes(to)) throw new DomainError("INVALID_TRANSITION", `Cannot move ${from} to ${to}`);
  if (["VALIDATED", "READY", "EXPORTED"].includes(to)) {
    if (!gates.sealed || gates.validatedRevisionId !== gates.revisionId || gates.uniquenessPassedRevisionId !== gates.revisionId) {
      throw new DomainError("QUALITY_GATE_FAILED", "Current sealed revision must pass validation and uniqueness");
    }
  }
  if (["READY", "EXPORTED"].includes(to) && (gates.approvedRevisionId !== gates.revisionId || !gates.approvedBy)) {
    throw new DomainError("HUMAN_APPROVAL_REQUIRED", "Current revision requires recorded human approval");
  }
}
