/**
 * APP SIDE: the prerequisite check, run before the first request.
 *
 * Nothing here comes from the package, not even a type: this is a plain HTTP call to Ollama. A
 * demo that fails silently on the first message teaches the reader nothing, so the prerequisite is
 * checked up front and reported as the commands to run, the same way `examples/navigation` does on
 * the CLI.
 *
 * The model itself cannot be checked from here: a model that is declared but not installed only
 * fails on the first call, which surfaces as an error bubble in the thread with the `ollama pull`
 * command the package already built into its message.
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
