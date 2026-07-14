export const ART_LAB_RENDER = Object.freeze({
  PRODUCTION: "production",
  PROTOTYPE: "prototype",
});

export function readArtLabRenderStyle(params) {
  return params.get("render") === ART_LAB_RENDER.PROTOTYPE
    ? ART_LAB_RENDER.PROTOTYPE
    : ART_LAB_RENDER.PRODUCTION;
}

export function isProductionRender(style) {
  return style !== ART_LAB_RENDER.PROTOTYPE;
}
