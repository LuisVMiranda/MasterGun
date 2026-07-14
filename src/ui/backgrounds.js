const BACKGROUND_PHASES = Object.freeze([
  { minLevel: 121, image: "/assets/sky-fields-background-late.jpg" },
  { minLevel: 76, image: "/assets/sky-fields-background-mid.jpg" },
  { minLevel: 1, image: "/assets/sky-fields-background.jpg" },
]);

export function getBackgroundForLevel(level) {
  const normalized = Math.max(1, Number(level) || 1);
  return BACKGROUND_PHASES.find((phase) => normalized >= phase.minLevel).image;
}

export function applyBackgroundForLevel(element, level) {
  if (!element) return;

  const image = getBackgroundForLevel(level);
  if (element.dataset.backgroundImage === image) return;

  element.style.setProperty("--sky-background-image", `url("${image}")`);
  element.dataset.backgroundImage = image;
}
