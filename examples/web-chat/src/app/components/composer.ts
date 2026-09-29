/**
 * APP SIDE, component: the input the person types into.
 *
 * The one component that talks **to** the agent rather than about it, and it does so through a
 * single callback: it knows nothing of `AgenticLLM`, only that submitting hands a string to
 * someone who returns a promise. `main.ts` is where that callback becomes `conversation.send`.
 */
import { byId } from "../dom.ts";

export type ComposerOptions = {
  /** Pre-filled, so the first run is one keypress away. */
  initialRequest: string;
  /** Resolves when the request is done. The composer stays disabled until it does. */
  onSubmit: (request: string) => Promise<void>;
};

export type Composer = {
  setEnabled: (enabled: boolean) => void;
  focus: () => void;
};

export function createComposer({ initialRequest, onSubmit }: ComposerOptions): Composer {
  const form = byId("chatForm") as HTMLFormElement;
  const input = byId("request") as HTMLInputElement;
  const send = byId("send") as HTMLButtonElement;

  input.value = initialRequest;

  function setEnabled(enabled: boolean): void {
    input.disabled = !enabled;
    send.disabled = !enabled;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const request = input.value.trim();
    if (request === "") return;
    input.value = "";
    setEnabled(false);
    await onSubmit(request);
    setEnabled(true);
    input.focus();
  });

  // `#request` and `#send` already start `disabled` in the markup, so nothing can reach the
  // composer before this module runs; the listener above is wired by this point too, so a
  // keystroke landing before the page is ready is swallowed by the disabled input rather than
  // falling through to a native GET submit.
  setEnabled(false);

  return { setEnabled, focus: () => input.focus() };
}
