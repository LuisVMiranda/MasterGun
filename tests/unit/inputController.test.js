import { describe, expect, it } from "vitest";
import { pointerToTrackX, readGamepadAxis, readKeyboardAxis } from "../../src/game/input/inputController.js";

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
});
