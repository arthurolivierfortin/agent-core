import type { Message } from "../../../llm/models/index.js";
import type { ContextStrategy, TokenCounter } from "../../interfaces/index.js";

export type SlidingWindowConfig = {
  /** Budget for the outbound list. Set it under the model's real window: framing tokens are not counted. */
  maxTokens: number;
  /** How to measure a message list. `HeuristicTokenCounter` is the V1 default (ADR-AGENT-0008). */
  counter: TokenCounter;
  /**
   * Called after every `build()`, with what that call kept and dropped. Not part of
   * `ContextStrategy`: the port stays closed under composition (ADR-AGENT-0016), and a reporting
   * shape general enough for every future strategy cannot be designed from a single
   * implementation. A consumer that wants to show what this strategy is doing (a debugging panel,
   * for instance) reads it here; nothing else changes.
   */
  onBuild?: (report: SlidingWindowReport) => void;
};

/** What one `build()` call did, for a consumer watching this strategy work. */
export type SlidingWindowReport = {
  /** Which call this is, counting from 1 since this strategy instance was constructed. */
  callNumber: number;
  /** The history this call received, before anything was kept or dropped. */
  input: Message[];
  /** The leading `system` messages: always kept, never subject to the budget. */
  pinned: Message[];
  /** The full list this call returned: `pinned` plus whatever else fit the budget. */
  kept: Message[];
  /** The `input` messages that did not make it into `kept`. */
  dropped: Message[];
  /** The token cost of `kept`, as this strategy's own counter measured it. */
  tokensUsed: number;
  /** This strategy's budget, carried on the report so it reads standalone. */
  maxTokens: number;
};

/**
 * A group of messages kept or dropped together: an assistant message that calls tools, plus the
 * tool messages answering it. Splitting one would emit a `tool` message whose call the model can
 * no longer see, which strict providers reject.
 */
type AtomicUnit = Message[];

/**
 * The V1 baseline: keep the newest history that fits the budget, and nothing else.
 *
 * One job only, fit the window. Remembering across sessions is a different job and will be a
 * different implementation of the same port (ADR-AGENT-0016), possibly composed around this one.
 * This strategy is the control the harness measures other strategies against.
 *
 * Two guarantees beyond plain recency: the leading `system` messages are always kept, because
 * losing the agent's rules exactly when the conversation is long is the worst moment for it; and,
 * for any history where tool results follow their call as the loop appends them, a call is never
 * separated from its result.
 */
export class SlidingWindowStrategy implements ContextStrategy {
  readonly maxTokens: number;
  private readonly counter: TokenCounter;
  private readonly onBuild?: (report: SlidingWindowReport) => void;
  private callCount = 0;

  constructor(config: SlidingWindowConfig) {
    this.maxTokens = config.maxTokens;
    this.counter = config.counter;
    this.onBuild = config.onBuild;
  }

  async build(history: Message[]): Promise<Message[]> {
    if (history.length === 0) {
      this.reportBuild(history, [], []);
      return [];
    }

    const pinned = leadingSystemMessages(history);
    const rest = history.slice(pinned.length);
    const units = toAtomicUnits(rest);
    const selected = this.selectNewestUnitsThatFit(pinned, units);
    const kept = [...pinned, ...selected.flat()];

    this.reportBuild(history, pinned, kept);
    return kept;
  }

  /**
   * Builds and emits a `SlidingWindowReport`, skipping the work entirely when nobody listens.
   *
   * Guarded the same way `step()` guards `observe()` (ADR-AGENT-0016): a consumer's own reporting
   * code is not this strategy's business to crash on. Losing a trace is less bad than losing the
   * answer to whoever asked for a window to be focused.
   */
  private reportBuild(input: Message[], pinned: Message[], kept: Message[]): void {
    this.callCount += 1;
    if (this.onBuild === undefined) return;
    const keptSet = new Set(kept);
    const dropped = input.filter((message) => !keptSet.has(message));
    try {
      this.onBuild({
        callNumber: this.callCount,
        input,
        pinned,
        kept,
        dropped,
        tokensUsed: this.counter.count(kept),
        maxTokens: this.maxTokens,
      });
    } catch {
      return;
    }
  }

  // A literal no-op: this strategy remembers nothing between turns. Present as of V1 because
  // adding a method to a published interface later would break every implementer, and because a
  // strategy that summarizes needs exactly this hook to refresh its summary (ADR-AGENT-0016).
  async observe(_exchange: Message[]): Promise<void> {
    return;
  }

  /**
   * Fill the budget from the newest unit backwards.
   *
   * The whole candidate list is recounted at each step instead of summing per-unit costs: the
   * heuristic counter is additive, but a real tokenizer is not, and the port exists precisely so
   * one can be plugged in. Histories are tens of messages, so the cost is nil.
   */
  private selectNewestUnitsThatFit(pinned: Message[], units: AtomicUnit[]): AtomicUnit[] {
    let selected: AtomicUnit[] = [];
    for (let i = units.length - 1; i >= 0; i -= 1) {
      const candidate = [units[i], ...selected];
      const messages = [...pinned, ...candidate.flat()];
      const cost = this.counter.count(messages);
      if (cost > this.maxTokens) break;
      selected = candidate;
    }

    // Never hand the model a conversation with no turn to answer. If not even the newest unit
    // fits, keep it and overflow: an over-budget list beats an unanswerable one.
    if (selected.length === 0 && units.length > 0) {
      return [units[units.length - 1]];
    }
    return selected;
  }
}

/**
 * The `system` messages at the head of the history: the agent's instructions, always kept.
 * Only the leading ones. A `system` appearing later is an ordinary message; the loop seeds
 * exactly one at the head, so this is a robustness rule rather than an expected case.
 */
function leadingSystemMessages(history: Message[]): Message[] {
  let end = 0;
  while (end < history.length && history[end].role === "system") {
    end += 1;
  }
  return history.slice(0, end);
}

/**
 * Group the history so that a tool call and the results answering it stay together.
 *
 * Grouping is by adjacency: a `tool` message joins the unit currently open when it answers that
 * unit's call. That is what the loop produces, and what providers require. A malformed history
 * whose results are separated from their call is tolerated without a crash, but its messages are
 * then grouped as they arrive.
 */
function toAtomicUnits(messages: Message[]): AtomicUnit[] {
  const units: AtomicUnit[] = [];
  for (const message of messages) {
    const openUnit = units[units.length - 1];
    const continuesOpenUnit =
      openUnit !== undefined && message.role === "tool" && answersUnit(openUnit, message.toolCallId);
    if (continuesOpenUnit) {
      openUnit.push(message);
      continue;
    }
    units.push([message]);
  }
  return units;
}

/** True when `toolCallId` answers a call made by this unit's leading assistant message. */
function answersUnit(unit: AtomicUnit, toolCallId: string): boolean {
  const head = unit[0];
  if (head === undefined) return false;
  if (head.role !== "assistant") return false;
  if (head.toolCalls === undefined) return false;
  return head.toolCalls.some((call) => call.id === toolCallId);
}
