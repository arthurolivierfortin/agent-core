/**
 * APP SIDE, component: the two things this page says outside the conversation, both about the
 * connection it depends on.
 *
 * Plain functions rather than a factory: neither one holds state or is called twice.
 */
import { byId } from "../dom.ts";

/** The header line: which model, on which server. */
export function showModelInfo(model: string, ollamaHost: string): void {
  byId("modelInfo").textContent = `${model} · ${ollamaHost}`;
}

/** Replaces a silent failure with the three commands that fix it. */
export function showUnreachableNotice(ollamaHost: string, model: string): void {
  byId("unreachableHost").textContent = ollamaHost;
  byId("pullCommand").textContent = `ollama pull ${model}`;
  byId("unreachable").hidden = false;
}
