/**
 * APP SIDE: the handful of DOM helpers every component here uses.
 *
 * Nothing in this file, or anywhere else under `app/`, imports a value from
 * `@arthurolivierfortin/agent-core`.
 */

/** The element the markup promises. Missing means `index.html` and a component disagree. */
export function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`Missing element: #${id}`);
  return el;
}

/** Marks a list as empty on purpose, so it never reads as broken before the first run. */
export function showEmptyState(list: HTMLElement, message: string): void {
  list.innerHTML = "";
  const item = document.createElement("li");
  item.className = "empty-state";
  item.textContent = message;
  list.appendChild(item);
}

export function clearEmptyState(list: HTMLElement): void {
  list.querySelector(".empty-state")?.remove();
}

/** Adds a row and keeps it in view: every list here grows downwards as a run goes on. */
export function appendAndScroll(list: HTMLElement, item: HTMLElement): void {
  list.appendChild(item);
  item.scrollIntoView({ block: "end" });
}
