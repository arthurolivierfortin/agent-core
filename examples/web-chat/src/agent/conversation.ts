/**
 * PACKAGE SIDE: a conversation that survives across requests, driven one iteration at a time.
 *
 * `AgenticLLM.run()` always starts from a fresh `[system, user]` history, which is right for a
 * one-shot request and wrong for a chat thread. This drives `agent.step()` over a hand-built
 * `AgentState` instead, appending each new request to the history the one before it left behind
 * (`step` is documented as "testable in isolation... a caller that needs to interpose between two
 * iterations drives this", which is exactly this composition). That is also what gives the sliding
 * window strategy something real to manage: a conversation that actually grows past its token
 * budget, rather than a fresh two-message history on every request.
 *
 * **Nothing here touches the DOM.** It reports what happened through the handlers it is given, and
 * `../main.ts` is where those handlers are attached to actual components. Swap them for
 * `console.log` and this file becomes `examples/navigation`.
 */
import type {
  AgenticLLM,
  AgentState,
  Message,
  StopReason,
} from "@arthurolivierfortin/agent-core";
import { PROMPT } from "./create-agent.ts";

/**
 * What a caller can observe of a request, in the order it happens. Every handler is required:
 * an optional one would quietly hide a wiring mistake in `main.ts`, and there are only seven.
 */
export type ConversationHandlers = {
  /** A request is about to be sent. `visible` is false for the automatic introduction. */
  onRequest: (request: string, visible: boolean) => void;
  /** One model round-trip is in flight. Always followed by `onIterationEnd`, failure included. */
  onIterationStart: () => void;
  onIterationEnd: () => void;
  /** Each message an iteration added, in order: the model's move, then what it read back. */
  onMessage: (message: Message) => void;
  /** The iteration as a whole, once its messages have been reported one by one. */
  onStep: (state: AgentState, added: Message[]) => void;
  /** The loop stopped on its own. `state.stopReason` says why. */
  onSettled: (state: AgentState) => void;
  /** The run failed. Never rethrown: see the note in `send`. */
  onError: (message: string) => void;
};

export type Conversation = {
  /**
   * Send one request and drive the loop until it stops. Resolves either way: a failure is
   * reported through `onError`, never thrown.
   *
   * `visible` controls only whether the caller is told to show the request: false for an
   * automatic one nobody typed. Everything else is reported identically.
   */
  send: (request: string, visible?: boolean) => Promise<void>;
};

export function createConversation(
  agent: AgenticLLM,
  handlers: ConversationHandlers,
): Conversation {
  // The conversation accumulates across requests instead of starting fresh each time. The system
  // prompt is pinned at the front, the same one `createAgent` gave the agent definition.
  let history: Message[] = [{ role: "system", content: PROMPT }];

  async function send(request: string, visible = true): Promise<void> {
    handlers.onRequest(request, visible);
    let state = startFrom(history, request);
    try {
      while (state.stopReason === undefined) {
        const alreadySeen = state.history.length;
        handlers.onIterationStart();
        try {
          state = await agent.step(state);
        } finally {
          // Always signalled, on success or failure: a caller showing a "thinking" indicator would
          // otherwise leave it on screen for a request that has already failed.
          handlers.onIterationEnd();
        }
        const added = state.history.slice(alreadySeen);
        for (const message of added) {
          handlers.onMessage(message);
        }
        handlers.onStep(state, added);
      }
      handlers.onSettled(state);
    } catch (error) {
      // Never rethrown: an uncaught rejection here would leave the caller waiting on a promise
      // that never settles, and in this demo that means a composer disabled forever. A stopped
      // Ollama server mid-conversation reaches this exact path.
      handlers.onError(describeError(error));
    } finally {
      // Carried forward even after a failure: the request the person asked stays part of the
      // conversation, exactly as it would if the model had simply taken a moment to answer it.
      // That can leave two `user` messages in a row if the next request follows a failed one;
      // neither Ollama nor `SlidingWindowStrategy` treats that as anything but two ordinary units,
      // so nothing breaks.
      history = dropLandingInstruction(state.history, state.stopReason);
    }
  }

  return { send };
}

/**
 * The state a request starts from: the accumulated history plus the new request, rather than
 * `agent.initialState(request)`, which would start a fresh `[system, user]` pair every time.
 */
function startFrom(history: Message[], request: string): AgentState {
  return {
    history: [...history, { role: "user", content: request }],
    iterations: 0,
    startedAt: Date.now(),
    tokensUsed: 0,
    lastContent: "",
    toolCalls: [],
  };
}

/**
 * `land()` in the package appends the landing instruction ("You've reached the limit...") as the
 * second-to-last message, right before the final answer, only when `stopReason` is `"budget"` or
 * `"stuck"`. It was a one-off directive for the request that got stuck, not part of the
 * conversation: dropped here so it is not replayed as a stale command to every request that
 * follows.
 */
function dropLandingInstruction(history: Message[], stopReason: StopReason | undefined): Message[] {
  if (stopReason !== "budget" && stopReason !== "stuck") return history;
  return history.filter((_, index) => index !== history.length - 2);
}

function describeError(error: unknown): string {
  // The package already builds a MODEL_NOT_FOUND message with the `ollama pull` command to run;
  // any other failure (the server stopped, a network blip) still needs to reach the reader.
  if (error instanceof Error) return error.message;
  return String(error);
}
