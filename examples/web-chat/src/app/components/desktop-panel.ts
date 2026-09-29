/**
 * APP SIDE, component: the State column, a live view of the simulated application itself.
 *
 * It reads the simulator, never the agent: this is the proof that the tools really moved
 * something. If this panel changes, the application changed; if only the thread changes, the model
 * talked without acting.
 */
import { byId } from "../dom.ts";
import type { SimulatedDesktop } from "../simulated-desktop.ts";

export type DesktopPanel = {
  /** Redraw from the simulator's current state. */
  render: () => void;
};

/** Draws the initial state immediately: the panel is never blank, even before the first request. */
export function createDesktopPanel(desktop: SimulatedDesktop): DesktopPanel {
  const windowList = byId("windowList");
  const history = byId("history");

  /** Every window that exists, the focused one highlighted: not just "where is it", "where could it go". */
  function render(): void {
    windowList.innerHTML = "";
    for (const [name, description] of Object.entries(desktop.windows)) {
      const focused = name === desktop.state.focused;
      windowList.appendChild(windowRow(name, description, focused));
    }
    // A visible line, not a `title` attribute: a tooltip only reaches a mouse hovering over it,
    // never a screen reader or a keyboard-only visit.
    history.textContent = `Focus history: ${desktop.state.history.join(" → ")}`;
  }

  render();
  return { render };
}

function windowRow(name: string, description: string, focused: boolean): HTMLLIElement {
  const row = document.createElement("li");
  if (focused) row.classList.add("focused");
  const nameEl = document.createElement("span");
  nameEl.className = "window-name";
  nameEl.textContent = focused ? `${name} (focused)` : name;
  const descriptionEl = document.createElement("span");
  descriptionEl.className = "window-description";
  descriptionEl.textContent = description;
  row.append(nameEl, descriptionEl);
  return row;
}
