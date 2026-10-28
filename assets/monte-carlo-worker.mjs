import { runMonteCarlo } from "/assets/core.mjs";

self.addEventListener("message", (event) => {
  try {
    const result = runMonteCarlo({
      ...event.data,
      onProgress: (progress) => self.postMessage({ type: "progress", progress }),
    });
    self.postMessage({ type: "result", result });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
});
