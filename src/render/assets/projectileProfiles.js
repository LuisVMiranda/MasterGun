const PROFILES = Object.freeze({
  pistol: profile({ color: "#ffbe3d", emissive: "#ff7a1a", width: 0.09, length: 0.3, trail: 0.45, flash: 0.22, impact: "spark", recoil: 0.1 }),
  shotgun: profile({ color: "#ff8b2c", emissive: "#ff3d16", width: 0.14, length: 0.42, trail: 0.35, flash: 0.42, impact: "burst", recoil: 0.2 }),
  machineGun: profile({ color: "#ffe168", emissive: "#ffb000", width: 0.05, length: 0.26, trail: 0.7, flash: 0.16, impact: "spark", recoil: 0.055 }),
  rifle: profile({ color: "#d9f7ff", emissive: "#40bfff", width: 0.045, length: 0.52, trail: 1.1, flash: 0.24, impact: "pierce", recoil: 0.14 }),
  soldier: profile({ color: "#a5ecff", emissive: "#258cff", width: 0.035, length: 0.22, trail: 0.38, flash: 0.1, impact: "spark", recoil: 0.035 }),
  enemy: profile({ color: "#ff5265", emissive: "#ff183c", width: 0.11, length: 0.3, trail: 0.32, flash: 0.18, impact: "hostile", recoil: 0.08 }),
  special: profile({ color: "#fff16a", emissive: "#ff38d1", width: 0.24, length: 0.68, trail: 1.8, flash: 0.52, impact: "burst", recoil: 0.24 }),
});

export const PROJECTILE_PROFILE_IDS = Object.freeze(Object.keys(PROFILES));

export function getProjectileVisualProfile(projectile = {}) {
  const id = getProjectileProfileId(projectile);
  const base = PROFILES[id];
  if (!projectile.thin) return base;
  return Object.freeze({ ...base, width: base.width * 0.32, trailWidth: base.trailWidth * 0.42, thin: true });
}

export function getProjectileProfileId(projectile = {}) {
  if (projectile.special) return "special";
  if (projectile.owner === "soldier") return "soldier";
  if (projectile.owner === "enemy") return "enemy";
  return PROFILES[projectile.weaponId] ? projectile.weaponId : "pistol";
}

function profile(config) {
  return Object.freeze({ ...config, trailWidth: config.width * 0.62 });
}
