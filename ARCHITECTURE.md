# NEBULA — architecture v2

## Chosen approach: hybrid browser engine

- **Three.js / WebGL 2**: rendering, materials, geometry, lighting and post-processing.
- **Web Worker** (`simulation-worker.js`): autonomous movement calculations are moved off the UI/render thread. This keeps simulation work from competing directly with input and rendering.
- **HTML/CSS**: HUD, controls, responsive layout.
- **JavaScript**: world setup, rendering, input and communication with the worker.

This is a practical step toward a richer browser simulation without making the whole project depend on experimental WebGPU support. The worker is deliberately small now; it is the seam where population dynamics, food/energy exchange, reproduction and event propagation can be expanded.

## Next performance step: WebAssembly

When the simulation has thousands of agents or expensive numerical systems, move the pure simulation core to **C++ compiled to WebAssembly with Emscripten**. Keep DOM/UI and browser input in JavaScript. Exchange compact typed arrays rather than one object per organism. For very large simulations, use shared memory only when cross-origin isolation and browser support are configured correctly.

## Rendering roadmap

1. Profile real frame times before changing render backends.
2. Add instancing for repeated plants, spores and particles.
3. Add quality tiers for shadows, bloom and pixel ratio.
4. Evaluate WebGPU only as an optional renderer after browser/device testing; retain a WebGL 2 fallback.
5. If the project needs a full game-engine workflow, consider Godot 4 web export or Unreal Pixel Streaming. The latter streams a running Unreal application and needs a server/GPU; it is not a standalone lightweight HTML file.

## Run locally

Unzip the kit, open a terminal in this folder, run `python3 -m http.server 8000`, then visit `http://localhost:8000`. A local HTTP server is recommended because browsers restrict worker modules and other resources opened directly from `file://`.
