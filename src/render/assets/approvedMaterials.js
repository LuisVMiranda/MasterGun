import * as THREE from "three";

export const APPROVED_COLORS = Object.freeze({
  enemy: "#d92f45",
  soldier: "#2488db",
  armorDark: "#242c35",
  armorMid: "#4a5662",
  gatePost: "#6f8591",
  steel: "#262e35",
  steelLight: "#66717a",
  olive: "#66713c",
  tan: "#94765a",
  skin: "#c98266",
  runway: "#8ce7df",
  buff: "#21e56d",
  debuff: "#ff3f55",
});

export function createApprovedMaterials(faction = "enemy") {
  const factionColor = APPROVED_COLORS[faction] ?? APPROVED_COLORS.enemy;
  return {
    faction: standard(factionColor, 0.12, 0.34),
    armor: standard(APPROVED_COLORS.armorDark, 0.42, 0.28),
    armorMid: standard(APPROVED_COLORS.armorMid, 0.54, 0.38),
    gatePost: standard(APPROVED_COLORS.gatePost, 0.5, 0.42),
    steel: standard(APPROVED_COLORS.steel, 0.68, 0.22),
    steelLight: standard(APPROVED_COLORS.steelLight, 0.52, 0.3),
    olive: standard(APPROVED_COLORS.olive, 0.18, 0.5),
    tan: standard(APPROVED_COLORS.tan, 0.08, 0.58),
    skin: standard(APPROVED_COLORS.skin, 0, 0.62),
    rubber: standard("#11171c", 0.08, 0.82),
    glass: standard("#72d9ff", 0.72, 0.14),
    warning: emissive("#ffb82e", "#ff641f", 0.6),
    buff: emissive(APPROVED_COLORS.buff, "#0a7b35", 0.35),
    debuff: emissive(APPROVED_COLORS.debuff, "#8b1027", 0.35),
    wall: standard("#5c6873", 0.03, 0.78),
    mortar: standard("#303942", 0.02, 0.9),
  };
}

function standard(color, metalness, roughness) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function emissive(color, emissiveColor, intensity) {
  return new THREE.MeshStandardMaterial({ color, emissive: emissiveColor, emissiveIntensity: intensity, metalness: 0.08, roughness: 0.34 });
}
