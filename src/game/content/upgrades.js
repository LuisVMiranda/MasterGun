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
    id: "baseLife",
    label: "Base Life",
    shortLabel: "Life",
    baseCost: 180,
    growth: 1.44,
    maxLevel: 20,
    unlockLevel: 2,
    description: "Adds start-of-run life reserve.",
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
    id: "assistants",
    label: "Assistants",
    shortLabel: "Assist",
    baseCost: 860,
    growth: 1.78,
    maxLevel: 4,
    unlockLevel: 12,
    description: "Unlocks companion guns.",
  },
  {
    id: "assistantAmmo",
    label: "Assistant Ammo",
    shortLabel: "Ast. Ammo",
    baseCost: 420,
    growth: 1.45,
    maxLevel: 24,
    unlockLevel: 12,
    description: "Adds dedicated ammo for assistants.",
  },
  {
    id: "wallDamage",
    label: "Wall Damage",
    shortLabel: "Wall Dmg",
    baseCost: 480,
    growth: 1.47,
    maxLevel: 24,
    unlockLevel: 8,
    description: "Deals more damage to walls and barricades.",
  },
  {
    id: "shieldDamage",
    label: "Shield Damage",
    shortLabel: "Shield Dmg",
    baseCost: 620,
    growth: 1.5,
    maxLevel: 24,
    unlockLevel: 35,
    description: "Deals more damage to shielded enemies.",
  },
  {
    id: "breachDamage",
    label: "Breach Damage",
    shortLabel: "Breach",
    baseCost: 740,
    growth: 1.54,
    maxLevel: 18,
    unlockLevel: 18,
    description: "Improves damage against walls and shields.",
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
