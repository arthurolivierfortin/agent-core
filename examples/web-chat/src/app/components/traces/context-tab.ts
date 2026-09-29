/**
 * APP SIDE, component: the Context tab, what the sliding window keeps and what it lets go.
 *
 * Fed by `SlidingWindowStrategy`'s `onBuild` hook, wired in `agent/create-agent.ts`: one report per
 * call, with the messages it kept, the ones it dropped, and the budget it worked against. Two
 * views of the same report: a live list of the window right now, and the raw report below it.
 *
 * No `aria-live` anywhere in this panel, deliberately: it is a supplementary debugging view, and
 * announcing a JSON dump or a redrawn list on every iteration would drown out the conversation's
 * own live region.
 *
 * The imports are types only: this reads a report, it never builds a context.
 */
import type { Message, SlidingWindowReport } from "@arthurolivierfortin/agent-core";
import { byId, showEmptyState } from "../../dom.ts";
import { appendLogEntry } from "./log-entry.ts";

const NO_CONTEXT_YET = "No context yet. Send a request to see what the agent keeps in its window.";
const PREVIEW_CHARS = 50;
/** Long enough for a dropped row to be noticed on its way out, short enough not to pile up. */
const DROPPING_MS = 1600;

export type ContextTab = {
  record: (report: SlidingWindowReport) => void;
};

export function createContextTab(): ContextTab {
  const windowList = byId("contextWindowList");
  const log = byId("contextLog");

  // A message has no id of its own (`Message` carries none): one is assigned the first time this
  // page sees the object, and kept for as long as the object exists, so the same message reads as
  // the same row whether it is currently kept or was dropped three calls ago.
  const messageIds = new WeakMap<Message, number>();
  let nextMessageId = 1;

  function idFor(message: Message): number {
    let id = messageIds.get(message);
    if (id === undefined) {
      id = nextMessageId;
      nextMessageId += 1;
      messageIds.set(message, id);
    }
    return id;
  }

  /** Redraws the live window to `report.kept`, and flashes `report.dropped` briefly on its way out. */
  function renderWindow(report: SlidingWindowReport): void {
    const pinnedIds = new Set(report.pinned.map(idFor));
    windowList.innerHTML = "";
    for (const message of report.kept) {
      const id = idFor(message);
      windowList.appendChild(windowRow(id, message, pinnedIds.has(id), false));
    }
    for (const message of report.dropped) {
      const row = windowRow(idFor(message), message, false, true);
      windowList.appendChild(row);
      setTimeout(() => row.remove(), DROPPING_MS);
    }
  }

  showEmptyState(windowList, NO_CONTEXT_YET);
  showEmptyState(log, NO_CONTEXT_YET);

  return {
    record: (report) => {
      appendLogEntry(log, "context", report);
      renderWindow(report);
    },
  };
}

/**
 * A `<details>` per row, not a plain one: the simplified view stays a glance (id, role, a short
 * preview) until opened, and only then shows the message in full, native disclosure semantics
 * included (keyboard, screen reader) for free. Redrawn from scratch on every report along with the
 * rest of the list, so an open row closes again once the message it showed moves on.
 */
function windowRow(id: number, message: Message, pinned: boolean, dropping: boolean): HTMLLIElement {
  const row = document.createElement("li");
  if (pinned) row.classList.add("pinned");
  if (dropping) row.classList.add("dropping");
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const idBadge = document.createElement("span");
  idBadge.className = "msg-id";
  idBadge.textContent = `#${id}`;
  const roleBadge = document.createElement("span");
  roleBadge.className = "msg-role";
  roleBadge.textContent = message.role;
  const preview = document.createElement("span");
  preview.className = "msg-preview";
  preview.textContent = previewOf(message.content);
  summary.append(idBadge, roleBadge, preview);
  const full = document.createElement("pre");
  full.className = "msg-full";
  full.textContent = JSON.stringify(message, null, 2);
  details.append(summary, full);
  row.appendChild(details);
  return row;
}

function previewOf(text: string): string {
  if (text.length <= PREVIEW_CHARS) return text;
  return `${text.slice(0, PREVIEW_CHARS - 3)}…`;
}
