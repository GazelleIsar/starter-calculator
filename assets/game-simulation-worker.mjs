import { optimizeFloatingAllocation, runGameSimulation } from "/assets/game-simulation.mjs";

self.addEventListener("message", (event) => {
  try {
    const runner = event.data.mode === "reverse" ? optimizeFloatingAllocation : runGameSimulation;
    const result = runner({
      ...event.data,
      onProgress: (progress) => self.postMessage({ type: "progress", progress }),
    });
    self.postMessage({ type: "result", result });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
});
