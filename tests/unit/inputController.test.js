import { describe, expect, it } from "vitest";
import {
  isTextEntryTarget,
  pointerToTrackX,
  readGamepadAxis,
  readKeyboardAxis,
  updateTrackedKey,
} from "../../src/game/input/inputController.js";

const target = {
  getBoundingClientRect() {
    return { left: 100, width: 400 };
  },
};

describe("input direction", () => {
  it("maps left pointer movement to the visual-left track side", () => {
    expect(pointerToTrackX(120, target)).toBeGreaterThan(0);
    expect(pointerToTrackX(480, target)).toBeLessThan(0);
  });

  it("maps keyboard and controller left to the same axis direction", () => {
    expect(readKeyboardAxis(new Set(["ArrowLeft"]))).toBeGreaterThan(0);
    expect(readKeyboardAxis(new Set(["ArrowRight"]))).toBeLessThan(0);
    expect(readGamepadAxis({ axes: [-1], buttons: [] })).toBeGreaterThan(0);
  });

  it("does not block profile text entry with movement keys", () => {
    const keys = new Set();
    const event = createKeyEvent("D", { tagName: "input" });

    updateTrackedKey(keys, event, true);

    expect(keys.has("D")).toBe(false);
    expect(event.prevented).toBe(false);
  });

  it("keeps game shortcuts active outside text entry", () => {
    const keys = new Set();
    const event = createKeyEvent("D", { tagName: "canvas" });

    updateTrackedKey(keys, event, true);

    expect(keys.has("D")).toBe(true);
    expect(event.prevented).toBe(true);
  });

  it("detects editable profile controls", () => {
    expect(isTextEntryTarget({ tagName: "input" })).toBe(true);
    expect(isTextEntryTarget({ isContentEditable: true })).toBe(true);
    expect(isTextEntryTarget({ tagName: "canvas" })).toBe(false);
  });
});

function createKeyEvent(key, target) {
  return {
    key,
    target,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  };
}
