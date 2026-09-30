import type { UsageRecord } from "../../models/index.js";

/**
 * Collects the records of provider calls, for one run or one batch of runs: the scope is the
 * instance (ADR-AGENT-0007, option C). No static or module-level state, so two collectors never
 * share a record, and there is no start or stop to forget.
 *
 * Nothing it holds is reachable from outside: `record` keeps a copy of what it is given, and
 * `records` hands out fresh copies, the same precaution as `FakeLLMProvider.models()`.
 */
export class MetricsCollector {
  private readonly entries: UsageRecord[] = [];

  /** Keep a copy of `entry`: changing that object afterwards does not change what was recorded. */
  record(entry: UsageRecord): void {
    this.entries.push({ ...entry });
  }

  /** A new array of copies on every call, in recording order. */
  records(): UsageRecord[] {
    return this.entries.map((entry) => ({ ...entry }));
  }
}
