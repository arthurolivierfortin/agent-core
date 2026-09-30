import type { CompletionOptions, LLMProvider } from "../../../llm/interfaces/index.js";
import type { LLMResponse, Message, ModelInfo } from "../../../llm/models/index.js";
import type { MetricsCollector } from "./metrics-collector.js";

/**
 * Decorates `provider` so that every `complete` call that resolves leaves one record in
 * `collector` (ADR-AGENT-0007): the model the call asked for, `opts.model` (ADR-AGENT-0017),
 * the usage the provider reported, null when it reported none (absent is not zero), and how
 * long the call took on the clock `now`. The response comes back as is: the same object.
 *
 * The result is a new object literal of closures with exactly four own keys: `id`,
 * `supportsStreaming`, `models`, `complete`. Not a class, not a spread of the provider, not a
 * proxy: nothing else the provider carries shows through, and no method depends on `this`. The
 * provider itself is always called as a method, so one that relies on `this` keeps working.
 *
 * `now` defaults to `Date.now`, which is not monotonic: a system clock change during a call
 * skews its duration, and no bound hides it. Pass `() => performance.now()` for a monotonic one.
 *
 * A call that fails records nothing. When `provider.complete` rejects, the `await` below rethrows
 * the very same error, neither wrapped nor converted, and `collector.record` is never reached: no
 * `finally` records the call, no `catch` replaces its error. A `UsageRecord` cannot tell a failed
 * call from a resolved one, so counting it would skew both `calls` and `durationMs`.
 *
 * Design: docs/specs/2026-09-30-with-metrics-design.md (#11).
 */
export function withMetrics(
  provider: LLMProvider,
  collector: MetricsCollector,
  now: () => number = Date.now,
): LLMProvider {
  return {
    id: provider.id,
    supportsStreaming: (): boolean => false,
    models: (): ModelInfo[] => provider.models(),
    complete: async (messages: Message[], opts: CompletionOptions): Promise<LLMResponse> => {
      const startedAt = now();
      const response = await provider.complete(messages, opts);
      collector.record({
        model: opts.model,
        tokensIn: response.usage?.tokensIn ?? null,
        tokensOut: response.usage?.tokensOut ?? null,
        durationMs: now() - startedAt,
      });
      return response;
    },
  };
}
