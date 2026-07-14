export const QUALITY_PROFILES = Object.freeze({
  mobile: freezeProfile({ pixelRatio: 1, shadowMap: 512, shadowDistance: 28, particles: 0.45, lodBias: 1, targetFps: 30 }),
  balanced: freezeProfile({ pixelRatio: 1.5, shadowMap: 1024, shadowDistance: 46, particles: 0.72, lodBias: 0, targetFps: 60 }),
  high: freezeProfile({ pixelRatio: 2, shadowMap: 2048, shadowDistance: 68, particles: 1, lodBias: -1, targetFps: 60 }),
});

export function chooseQualityProfile(width, devicePixelRatio = 1, reducedMotion = false) {
  if (reducedMotion || width < 700) return QUALITY_PROFILES.mobile;
  if (width < 1500 || devicePixelRatio < 1.5) return QUALITY_PROFILES.balanced;
  return QUALITY_PROFILES.high;
}

export function getQualityProfile(id) {
  return QUALITY_PROFILES[id] ?? QUALITY_PROFILES.balanced;
}

function freezeProfile(profile) {
  return Object.freeze(profile);
}
