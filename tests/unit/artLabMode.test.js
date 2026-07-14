import { describe, expect, it } from "vitest";
import { ART_LAB_RENDER, isProductionRender, readArtLabRenderStyle } from "../../src/art-lab/renderMode.js";

describe("art lab render mode", () => {
  it("opens direct Art Lab links with live production graphics", () => {
    const params = new URL("http://127.0.0.1:5173/?artLab=1").searchParams;
    expect(readArtLabRenderStyle(params)).toBe(ART_LAB_RENDER.PRODUCTION);
    expect(isProductionRender(readArtLabRenderStyle(params))).toBe(true);
  });

  it("keeps the low-detail prototype renderer explicitly opt-in", () => {
    const params = new URL("http://127.0.0.1:5173/?artLab=1&render=prototype").searchParams;
    expect(readArtLabRenderStyle(params)).toBe(ART_LAB_RENDER.PROTOTYPE);
    expect(isProductionRender(readArtLabRenderStyle(params))).toBe(false);
  });
});
