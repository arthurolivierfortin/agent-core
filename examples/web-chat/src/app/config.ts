/**
 * APP SIDE: what this demo reads from its own environment, and the two requests it ships with.
 *
 * The application loads its configuration, the library reads what it is handed: nothing in
 * `@arthurolivierfortin/agent-core` looks at an environment variable on its own. These values
 * reach the package as arguments to `createAgent`, and nowhere else.
 */

const DEFAULT_OLLAMA_HOST = "http://localhost:11434";
const DEFAULT_MODEL = "qwen2.5:0.5b";

// Vite only exposes env vars prefixed `VITE_` to browser code; `process.env` does not exist here.
export const ollamaHost = import.meta.env.VITE_OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST;
export const model = import.meta.env.VITE_OLLAMA_MODEL ?? DEFAULT_MODEL;

/** Pre-filled in the composer, so the first run is one keypress away. */
export const FIRST_REQUEST = "focus the settings window";

/**
 * Sent automatically on load, before the person types anything, so the thread never opens empty.
 * The request itself is never shown (`Conversation.send`'s `visible` flag): what appears is only
 * the agent's own introduction, exactly as if it had spoken first.
 */
export const INTRO_REQUEST =
  "Introduce yourself in a sentence or two: who you are and what you can help with here.";
