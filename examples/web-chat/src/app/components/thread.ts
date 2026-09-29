/**
 * APP SIDE, component: the conversation thread.
 *
 * One of three components that read the same `Message` stream from the conversation. This one
 * turns a message into what a reader sees: a bubble for an answer, a pair of rows for a tool call
 * and its result.
 *
 * The `Message` import is a type: this file renders what the loop produced, it never drives it.
 */
import type { Message } from "@a-world-felt/nathan-agent-core";
import { appendAndScroll, byId } from "../dom.ts";

export type Thread = {
  /** The person's own request, shown before the agent has said anything. */
  appendRequest: (text: string) => void;
  /** One message the loop produced, rendered as whatever it is. */
  render: (message: Message) => void;
  appendError: (text: string) => void;
  /** One model round-trip is in flight, made visible while it lasts. */
  startThinking: () => void;
  stopThinking: () => void;
};

export function createThread(): Thread {
  const thread = byId("thread");
  let thinking: HTMLLIElement | undefined;

  function render(message: Message): void {
    if (message.role === "tool") {
      appendCall("result", message.content);
      return;
    }
    if (message.role !== "assistant") {
      // The only non-assistant, non-tool message mid-run is the landing instruction (ADR-AGENT-0011).
      appendMessage("system", message.content);
      return;
    }
    const calls = message.toolCalls;
    if (calls === undefined || calls.length === 0) {
      appendMessage("assistant", message.content);
      return;
    }
    for (const call of calls) {
      appendCall("tool", `${call.name}(${JSON.stringify(call.arguments)})`);
    }
  }

  function appendMessage(kind: "user" | "assistant" | "system" | "error", text: string): void {
    const item = document.createElement("li");
    item.className = `msg msg--${kind}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    item.appendChild(bubble);
    appendAndScroll(thread, item);
  }

  function appendCall(label: string, text: string): void {
    const item = document.createElement("li");
    item.className = "call";
    const eyebrow = document.createElement("span");
    eyebrow.className = "call-label";
    eyebrow.textContent = label;
    const body = document.createElement("code");
    body.textContent = text;
    item.append(eyebrow, body);
    appendAndScroll(thread, item);
  }

  function startThinking(): void {
    const item = document.createElement("li");
    item.className = "thinking";
    item.setAttribute("role", "status");
    item.setAttribute("aria-label", "Waiting for the model");
    for (let i = 0; i < 4; i++) {
      item.appendChild(document.createElement("span"));
    }
    appendAndScroll(thread, item);
    thinking = item;
  }

  /**
   * Called on failure as well as success: an orphaned pulse left on screen would say the agent is
   * still thinking about a request that has already failed.
   */
  function stopThinking(): void {
    thinking?.remove();
    thinking = undefined;
  }

  return {
    appendRequest: (text) => appendMessage("user", text),
    render,
    appendError: (text) => appendMessage("error", text),
    startThinking,
    stopThinking,
  };
}
