export const PHASE = Object.freeze({
  MENU: "menu",
  RUNNING: "running",
  PAUSED: "paused",
  SHOP: "shop",
});

export const ENTITY = Object.freeze({
  GATE: "gate",
  ENEMY: "enemy",
  BARRICADE: "barricade",
  HAZARD: "hazard",
  PICKUP: "pickup",
  SOLID_WALL: "solidWall",
  SHOOTER: "shooter",
  FINISH_BLOCK: "finishBlock",
  WEAPON_PICKUP: "weaponPickup",
  BOSS: "boss",
});

export const LANES = Object.freeze([-3.3, -1.1, 1.1, 3.3]);

export const TRACK = Object.freeze({
  halfWidth: 4.6,
  playerZ: 0,
  bulletSpeed: 28,
  contactZ: 0.75,
  missZ: -3,
  tileLength: 3.4,
});

export const STAT_LABELS = Object.freeze({
  fireRate: "Fire Rate",
  range: "Range",
  ammo: "Ammo",
  power: "Power",
  doubleWeapon: "Double",
  assistants: "Assistant",
  income: "Income",
  score: "Score",
});

export const COLORS = Object.freeze({
  buff: "#24e86b",
  debuff: "#ff3451",
  warning: "#ffcb3d",
  cash: "#8eff2e",
  runway: "#c5fff7",
  runwayAlt: "#defefb",
  rail: "#3b6f84",
  sky: "#86d7ff",
});

export const SAVE_KEY = "master-gun-save-v1";

export const DEFAULT_SETTINGS = Object.freeze({
  reducedMotion: false,
  volume: 0.7,
});

export const STARTING_CASH = 120;
