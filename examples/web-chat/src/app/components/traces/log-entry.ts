/**
 * APP SIDE: one labelled JSON entry in a trace log, shared by the Agent and Context tabs.
 */
import { appendAndScroll, clearEmptyState } from "../../dom.ts";

export function appendLogEntry(list: HTMLElement, kind: string, payload: unknown): void {
  clearEmptyState(list);
  const item = document.createElement("li");
  item.className = `debug-entry debug-entry--${kind}`;
  const label = document.createElement("span");
  label.className = "debug-label";
  label.textContent = kind;
  const body = document.createElement("pre");
  body.textContent = JSON.stringify(payload, null, 2);
  item.append(label, body);
  appendAndScroll(list, item);
}
