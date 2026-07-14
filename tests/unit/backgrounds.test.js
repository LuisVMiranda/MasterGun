import { describe, expect, it } from "vitest";
import { applyBackgroundForLevel, getBackgroundForLevel } from "../../src/ui/backgrounds.js";

describe("background progression", () => {
  it("maps progression bands to distinct sky-field backgrounds", () => {
    expect(getBackgroundForLevel(1)).toBe("/assets/sky-fields-background.jpg");
    expect(getBackgroundForLevel(75)).toBe("/assets/sky-fields-background.jpg");
    expect(getBackgroundForLevel(76)).toBe("/assets/sky-fields-background-mid.jpg");
    expect(getBackgroundForLevel(120)).toBe("/assets/sky-fields-background-mid.jpg");
    expect(getBackgroundForLevel(121)).toBe("/assets/sky-fields-background-late.jpg");
    expect(getBackgroundForLevel(200)).toBe("/assets/sky-fields-background-late.jpg");
  });

  it("applies the selected background through a CSS variable", () => {
    const element = createStyleTarget();

    applyBackgroundForLevel(element, 121);

    expect(element.style.getPropertyValue("--sky-background-image")).toContain("sky-fields-background-late.jpg");
    expect(element.dataset.backgroundImage).toBe("/assets/sky-fields-background-late.jpg");
  });
});

function createStyleTarget() {
  const values = new Map();
  return {
    dataset: {},
    style: {
      getPropertyValue: (key) => values.get(key) ?? "",
      setProperty: (key, value) => values.set(key, value),
    },
  };
}
