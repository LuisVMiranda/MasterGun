import { afterEach, describe, expect, it, vi } from "vitest";
import { createSfx } from "../../src/game/audio/sfx.js";

describe("synthesized effects", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.window;
  });

  it("waits for a suspended audio context before playing the first shot", async () => {
    const harness = createContextHarness();
    globalThis.window = { AudioContext: class AudioContext { constructor() { return harness.context; } } };
    const sfx = createSfx();

    sfx.play([{ type: "shot", owner: "player", count: 1 }], 0.8);
    expect(harness.starts).toBe(0);

    harness.resolveResume();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(harness.starts).toBe(1);
  });
});

function createContextHarness() {
  let resolveResume;
  const resumePromise = new Promise((resolve) => { resolveResume = resolve; });
  const harness = { starts: 0, resolveResume };
  harness.context = {
    state: "suspended",
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => resumePromise.then(() => { harness.context.state = "running"; })),
    createOscillator: () => ({
      type: "square",
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() { return this; },
      start() { harness.starts += 1; },
      stop() {},
    }),
    createGain: () => ({
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() { return this; },
    }),
  };
  return harness;
}
