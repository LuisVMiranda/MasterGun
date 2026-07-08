export const UPGRADE_DEFINITIONS = Object.freeze([
  {
    id: "fireRate",
    label: "Fire Rate",
    shortLabel: "Rate",
    baseCost: 140,
    growth: 1.42,
    maxLevel: 30,
    unlockLevel: 1,
    description: "More shots per second.",
  },
  {
    id: "range",
    label: "Range",
    shortLabel: "Range",
    baseCost: 125,
    growth: 1.4,
    maxLevel: 30,
    unlockLevel: 1,
    description: "Bullets travel farther.",
  },
  {
    id: "ammo",
    label: "Ammo",
    shortLabel: "Ammo",
    baseCost: 130,
    growth: 1.39,
    maxLevel: 30,
    unlockLevel: 1,
    description: "Start each run with more ammo.",
  },
  {
    id: "power",
    label: "Power",
    shortLabel: "Power",
    baseCost: 220,
    growth: 1.48,
    maxLevel: 30,
    unlockLevel: 4,
    description: "Each shot hits harder.",
  },
  {
    id: "income",
    label: "Income",
    shortLabel: "Income",
    baseCost: 260,
    growth: 1.52,
    maxLevel: 24,
    unlockLevel: 6,
    description: "Earn more cash from rounds.",
  },
  {
    id: "doubleWeapon",
    label: "Double Weapon",
    shortLabel: "Double",
    baseCost: 720,
    growth: 1.74,
    maxLevel: 5,
    unlockLevel: 9,
    description: "Adds extra barrels.",
  },
  {
    id: "assistants",
    label: "Assistants",
    shortLabel: "Assist",
    baseCost: 860,
    growth: 1.78,
    maxLevel: 4,
    unlockLevel: 12,
    description: "Unlocks companion guns.",
  },
]);

export function createUpgradeLevels() {
  return Object.fromEntries(UPGRADE_DEFINITIONS.map((upgrade) => [upgrade.id, 0]));
}

export function findUpgrade(id) {
  return UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === id);
}

export function getUpgradeCost(upgrade, level) {
  return Math.round(upgrade.baseCost * upgrade.growth ** level);
}

export function getAvailableUpgrades(level) {
  return UPGRADE_DEFINITIONS.map((upgrade) => ({ ...upgrade, locked: upgrade.unlockLevel > level }));
}

export function getShopUpgrades(level, seed = level) {
  const shuffled = shuffleUpgrades(seed);
  const unlocked = shuffled.filter((upgrade) => upgrade.unlockLevel <= level);
  const locked = shuffled.filter((upgrade) => upgrade.unlockLevel > level);
  return [...unlocked, ...locked].slice(0, 2).map((upgrade) => ({ ...upgrade, locked: upgrade.unlockLevel > level }));
}

function shuffleUpgrades(seed) {
  const output = [...UPGRADE_DEFINITIONS];
  let state = seed >>> 0;

  for (let index = output.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }

  return output;
}
