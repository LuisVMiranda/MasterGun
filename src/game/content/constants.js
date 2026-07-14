export const PHASE = Object.freeze({
  MENU: "menu",
  MODE_MENU: "modeMenu",
  RUNNING: "running",
  PAUSED: "paused",
  VICTORY: "victory",
  ENDLESS_CHECKPOINT: "endlessCheckpoint",
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
  CASH: "cash",
  RECRUITER: "recruiter",
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

export const TARGET_SCALE = 1.15;

export const STAT_LABELS = Object.freeze({
  fireRate: "Fire Rate",
  range: "Range",
  ammo: "Ammo",
  power: "Power",
  doubleWeapon: "Double",
  soldiers: "Soldiers",
  soldierTraining: "Soldier Drills",
  baseLife: "Life",
  breachDamage: "Breach",
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
  sky: "#73c8f7",
});

export const SAVE_KEY = "master-gun-save-v1";

export const DEFAULT_SETTINGS = Object.freeze({
  reducedMotion: false,
  volume: 0.7,
  masterVolume: 0.7,
  musicVolume: 0.65,
  sfxVolume: 0.8,
});

export const STARTING_CASH = 120;
