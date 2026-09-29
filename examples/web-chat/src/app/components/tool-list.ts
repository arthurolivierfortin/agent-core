/**
 * APP SIDE, component: the tools the agent actually has, and a flash when one of them runs.
 *
 * One of three components that read the same `Message` stream from the conversation. Each one
 * takes what concerns it and ignores the rest: this one only cares that a message carries tool
 * calls, and only about their names.
 *
 * The `Message` and `Tool` imports are types only: this file draws a list, it never calls a tool.
 */
import type { Message, Tool } from "@arthurolivierfortin/agent-core";
import { byId } from "../dom.ts";

const FLASH_MS = 1200;

export type ToolList = {
  /** Briefly highlights every tool the message calls. Does nothing for a message with none. */
  flashCallsIn: (message: Message) => void;
};

/**
 * Draws the list once, on creation: the agent's tool set never changes mid-run, so there is
 * nothing to redraw.
 */
export function createToolList(tools: Tool[]): ToolList {
  const list = byId("toolList");
  list.innerHTML = "";
  for (const tool of tools) {
    list.appendChild(toolRow(tool));
  }

  function flashCallsIn(message: Message): void {
    if (message.role !== "assistant") return;
    const calls = message.toolCalls;
    if (calls === undefined) return;
    for (const call of calls) {
      flash(call.name);
    }
  }

  return { flashCallsIn };
}

function toolRow(tool: Tool): HTMLLIElement {
  const row = document.createElement("li");
  row.id = `tool-${tool.name}`;
  const name = document.createElement("span");
  name.className = "tool-name";
  name.textContent = tool.name;
  const description = document.createElement("span");
  description.className = "tool-description";
  description.textContent = tool.description;
  row.append(name, description);
  return row;
}

/**
 * Says "this ran, just now" and nothing more. The durable record of what was asked and what came
 * back is the Traces panel's Tools tab, which the flash cannot replace once it fades.
 */
function flash(name: string): void {
  const row = document.getElementById(`tool-${name}`);
  if (row === null) return;
  row.classList.add("active");
  setTimeout(() => row.classList.remove("active"), FLASH_MS);
}
