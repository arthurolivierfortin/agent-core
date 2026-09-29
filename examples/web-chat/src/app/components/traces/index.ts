/**
 * APP SIDE, component: the Traces panel, three tabs over one run.
 *
 * Split by what it traces, not just where it happened: **Agent** is the loop's own view, **Context**
 * is what the sliding window keeps and drops, **Tools** is what was called and what came back.
 * Three questions, three files; this one owns only what they share, the tab strip and the
 * show/hide toggle.
 */
import type { Message, SlidingWindowReport } from "@a-world-felt/nathan-agent-core";
import { byId } from "../../dom.ts";
import { createAgentTab } from "./agent-tab.ts";
import { createContextTab } from "./context-tab.ts";
import { createToolsTab } from "./tools-tab.ts";

const TABS = ["agent", "context", "tools"] as const;
type Tab = (typeof TABS)[number];

export type TracesPanel = {
  /** Agent tab: one entry per event the loop produces. */
  log: (kind: string, payload: unknown) => void;
  /** Context tab: one entry per context build. */
  recordContext: (report: SlidingWindowReport) => void;
  /** Tools tab: takes the calls and results out of a message. */
  recordMessage: (message: Message) => void;
};

export function createTracesPanel(): TracesPanel {
  const agentTab = createAgentTab();
  const contextTab = createContextTab();
  const toolsTab = createToolsTab();

  setUpTabs();
  setUpToggle();

  return {
    log: agentTab.log,
    recordContext: contextTab.record,
    recordMessage: toolsTab.recordMessage,
  };
}

function setUpTabs(): void {
  for (const tab of TABS) {
    tabButton(tab).addEventListener("click", () => setActiveTab(tab));
  }
}

function setActiveTab(tab: Tab): void {
  for (const name of TABS) {
    const active = name === tab;
    tabButton(name).setAttribute("aria-selected", String(active));
    tabPanel(name).hidden = !active;
  }
}

function setUpToggle(): void {
  const toggle = byId("toggleDebug") as HTMLButtonElement;
  const column = byId("debugCol");
  toggle.addEventListener("click", () => {
    const hidden = column.hasAttribute("hidden");
    if (hidden) {
      column.removeAttribute("hidden");
      toggle.textContent = "Hide traces";
    } else {
      column.setAttribute("hidden", "");
      toggle.textContent = "Show traces";
    }
  });
}

function tabButton(tab: Tab): HTMLElement {
  return byId(`tab${capitalize(tab)}`);
}

function tabPanel(tab: Tab): HTMLElement {
  return byId(`panel${capitalize(tab)}`);
}

function capitalize(text: string): string {
  return text[0].toUpperCase() + text.slice(1);
}
