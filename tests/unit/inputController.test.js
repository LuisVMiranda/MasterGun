import { describe, expect, it } from "vitest";
import {
  isTextEntryTarget,
  pointerToTrackX,
  readGamepadAxis,
  readGamepadButtons,
  readGamepadUiAxisX,
  readGamepadUiAxisY,
  readGamepadScrollAxisY,
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

  it("maps controller UI navigation to conventional menu directions", () => {
    expect(readGamepadUiAxisX({ axes: [1], buttons: [] })).toBe(1);
    expect(readGamepadUiAxisX({ axes: [0], buttons: createButtons([14]) })).toBe(-1);
    expect(readGamepadUiAxisY({ axes: [0, 1], buttons: [] })).toBe(1);
    expect(readGamepadUiAxisY({ axes: [0, 0], buttons: createButtons([12]) })).toBe(-1);
  });

  it("maps right stick and menu buttons for overlay control", () => {
    expect(readGamepadScrollAxisY({ axes: [0, 0, 0, 0.8], buttons: [] })).toBe(1);
    expect(readGamepadScrollAxisY({ axes: [0, 0, 0, -0.8], buttons: [] })).toBe(-1);
    expect(readGamepadScrollAxisY({ axes: [0, 0, 0, 0.1], buttons: [] })).toBe(0);
  });

  it("maps PlayStation Cross to OK and Triangle to close", () => {
    const cross = readGamepadButtons({ buttons: createButtons([0]) });
    const triangle = readGamepadButtons({ buttons: createButtons([3]) });

    expect(cross.confirmPressed).toBe(true);
    expect(cross.closePressed).toBe(false);
    expect(triangle.confirmPressed).toBe(false);
    expect(triangle.closePressed).toBe(true);
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

function createButtons(pressedIndexes) {
  return Array.from({ length: 16 }, (_, index) => ({ pressed: pressedIndexes.includes(index) }));
}
