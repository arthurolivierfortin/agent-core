/**
 * APP SIDE, component: the Agent tab, the loop's own view of a run.
 *
 * One JSON entry per event: the configuration it started with, each request, the raw `Message[]`
 * delta of every iteration, and the final summary. It answers the question the chat bubbles alone
 * cannot, whether a given turn called a tool at all: `toolCalls: []` is what "completed by just
 * replying" looks like on the wire.
 *
 * It takes `unknown` payloads on purpose. Nothing here interprets the loop's types; `main.ts`
 * decides what is worth recording and this dumps it verbatim.
 */
import { byId } from "../../dom.ts";
import { appendLogEntry } from "./log-entry.ts";

export type AgentTab = {
  log: (kind: string, payload: unknown) => void;
};

export function createAgentTab(): AgentTab {
  const panel = byId("panelAgent");
  return {
    log: (kind, payload) => appendLogEntry(panel, kind, payload),
  };
}
