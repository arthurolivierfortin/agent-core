/**
 * APP SIDE: the prerequisite check, run before anything is built.
 *
 * Nothing here comes from the package, not even a type: this is a plain HTTP call to Ollama. A
 * demo that dies on a stack trace because nothing is listening teaches the reader nothing, so the
 * prerequisite is checked up front and reported as the commands to type.
 *
 * The model itself cannot be checked from here: a model that is declared but not installed only
 * fails on the first call, which is why `agent/drive-loop.ts` handles that one separately.
 */

/** Whether an Ollama server answers at all. */
export async function isOllamaReachable(host: string): Promise<boolean> {
  try {
    const response = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

export function reportUnreachableOllama(host: string, model: string): void {
  console.error(`No Ollama server is responding on ${host}.`);
  console.error("");
  console.error("  1. Install Ollama : https://ollama.com");
  console.error("  2. Start the server: ollama serve");
  console.error(`  3. Install the model: ollama pull ${model}`);
  console.error("");
  console.error("OLLAMA_HOST and OLLAMA_MODEL let you target a different server or model.");
}
