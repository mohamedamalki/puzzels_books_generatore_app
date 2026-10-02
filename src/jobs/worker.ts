import { setTimeout as delay } from "node:timers/promises";
import { DomainError } from "../lib/errors";
import type { JobLease, PostgresJobQueue } from "./queue";

export interface JobHandler {
  run(job: JobLease, signal: AbortSignal): Promise<void>;
}

/** Handlers use withLease to commit each page and checkpoint atomically. No handlers enabled in Phase 1. */
export async function runWorker(queue: PostgresJobQueue, handlers: Partial<Record<JobLease["type"], JobHandler>>, signal: AbortSignal): Promise<void> {
  while (!signal.aborted) {
    const lease = await queue.claim();
    if (!lease) {
      try { await delay(1000, undefined, { signal }); } catch { if (!signal.aborted) throw new Error("Worker wait failed"); }
      continue;
    }
    const handler = handlers[lease.type];
    if (!handler) { await queue.fail(lease, "HANDLER_UNAVAILABLE", false); continue; }
    const controller = new AbortController();
    const jobSignal = AbortSignal.any([signal, controller.signal]);
    // Await each heartbeat; no overlapping background DB operations.
    const heartbeat = (async () => {
      while (!jobSignal.aborted) {
        try { await delay(3000, undefined, { signal: jobSignal }); } catch { return; }
        try { await queue.heartbeat(lease); } catch { controller.abort(); return; }
      }
    })();
    try {
      await handler.run(lease, jobSignal);
      jobSignal.throwIfAborted();
      await queue.finish(lease);
    } catch (error) {
      // Lost leases are reclaimed by another worker; stale workers must not update state.
      if (!controller.signal.aborted) {
        try { await queue.fail(lease, error instanceof DomainError ? error.code : "HANDLER_FAILED", !(error instanceof DomainError)); }
        catch (failure) { if (!(failure instanceof DomainError && failure.code === "LEASE_LOST")) throw failure; }
      }
    } finally {
      controller.abort();
      await heartbeat;
    }
  }
}
