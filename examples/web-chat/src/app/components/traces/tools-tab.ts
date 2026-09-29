/**
 * APP SIDE, component: the Tools tab, one row per call, filled in with its response.
 *
 * The third of three components reading the same `Message` stream from the conversation, and the
 * durable record of what was asked and what came back: the State column's flash only says "this
 * ran, just now", and cannot hold that once it fades.
 *
 * A call is paired with its result by **arrival order**, not by `call.id`: Ollama does not always
 * send one, and the package's own fallback is an index into a single response, so it repeats
 * across responses and cannot be used as a DOM id. The loop runs tool calls sequentially, never
 * concurrently, and a failing tool returns a result rather than throwing, so every call gets
 * exactly one result, in the order it was made: a queue pairs them correctly without any id.
 *
 * The `Message` import is a type: this reads the calls the model made, it never makes one.
 */
import type { Message, ToolCall } from "@arthurolivierfortin/agent-core";
import { appendAndScroll, byId, clearEmptyState, showEmptyState } from "../../dom.ts";

const NO_TOOL_CALLS_YET = "No tool calls yet. Send a request that needs one to see it here.";

export type ToolsTab = {
  /** Takes what concerns it from a message: the calls it makes, or the result it carries. */
  recordMessage: (message: Message) => void;
};

export function createToolsTab(): ToolsTab {
  const panel = byId("panelTools");
  /** Rows waiting for a result, oldest first. */
  const pending: HTMLLIElement[] = [];

  function recordCall(call: ToolCall): void {
    clearEmptyState(panel);
    const item = document.createElement("li");
    item.className = "tool-entry";
    const header = document.createElement("div");
    header.className = "tool-entry-header";
    const name = document.createElement("span");
    name.className = "tool-entry-name";
    name.textContent = call.name;
    const args = document.createElement("code");
    args.className = "tool-entry-args";
    args.textContent = JSON.stringify(call.arguments);
    header.append(name, args);
    const result = document.createElement("p");
    result.className = "tool-entry-result tool-entry-result--pending";
    result.textContent = "waiting for a result…";
    item.append(header, result);
    appendAndScroll(panel, item);
    pending.push(item);
  }

  /** Fills in the oldest row still waiting: see the note at the top for why order is enough. */
  function recordResult(content: string): void {
    const item = pending.shift();
    if (item === undefined) return;
    const result = item.querySelector(".tool-entry-result");
    if (result === null) return;
    result.className = "tool-entry-result";
    result.textContent = content;
  }

  function recordMessage(message: Message): void {
    if (message.role === "tool") {
      recordResult(message.content);
      return;
    }
    if (message.role !== "assistant") return;
    const calls = message.toolCalls;
    if (calls === undefined) return;
    for (const call of calls) {
      recordCall(call);
    }
  }

  showEmptyState(panel, NO_TOOL_CALLS_YET);
  return { recordMessage };
}
