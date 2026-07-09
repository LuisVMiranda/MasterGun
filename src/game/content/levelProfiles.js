export const MAX_PROJECTED_LEVEL = 200;
export const RUN_DURATION_CAP_SECONDS = 120;

const LEVEL_NAMES = Object.freeze([
  "First Steps",
  "Power Lesson",
  "Income Choice",
  "Double Tease",
  "Assistant Lane",
  "First Blocks",
  "Wall Weave",
  "Moving Trouble",
  "First Turret",
  "Crossfire",
  "Split Routes",
  "Elite Barricades",
  "Walker Intro",
  "Score Squeeze",
  "Assistant Trial",
  "Late Ladder",
  "Locked Jackpot",
  "Walking Wall",
  "Double Decision",
  "Hazard Net",
  "Skyline Siege",
  "Narrow Choices",
  "Pressure Vault",
  "Elite Walkers",
  "Ammo Tax",
  "Red Corridor",
  "Assistant Storm",
  "Finish Crusher",
  "Master Route",
  "Crown Run",
]);

export const LEVEL_PROFILES = Object.freeze(Array.from({ length: MAX_PROJECTED_LEVEL }, (_, index) => createProfile(index + 1)));

export function getProfileForLevel(level) {
  if (level <= MAX_PROJECTED_LEVEL) return LEVEL_PROFILES[Math.max(1, level) - 1];
  return createProfile(level);
}

export function getTargetDurationSeconds(level) {
  return Math.min(RUN_DURATION_CAP_SECONDS, 30 + Math.floor(level / 10) * 5);
}

function createProfile(level) {
  const duration = getTargetDurationSeconds(level);
  const speed = getBaseSpeed(level);
  const gateCount = getGateCount(level, duration);
  const pressure = getPressureCounts(level, gateCount);

  return {
    level,
    name: getLevelName(level),
    difficulty: getDifficulty(level),
    targetDuration: duration,
    trackLength: Math.round(speed * duration),
    speed,
    gateCount,
    enemyCount: getEnemyCount(level, duration),
    barricades: pressure.barricades,
    walls: pressure.walls,
    shooters: pressure.shooters,
    walkers: pressure.walkers,
    blockedUpgrades: getBlockedUpgrades(level, gateCount),
    hazardChance: getHazardChance(level),
    baseReward: getBaseReward(level),
    finishRows: getFinishRows(level),
  };
}

function getLevelName(level) {
  const base = LEVEL_NAMES[(level - 1) % LEVEL_NAMES.length];
  if (level <= LEVEL_NAMES.length) return base;
  return `${base} ${Math.ceil(level / LEVEL_NAMES.length)}`;
}

function getDifficulty(level) {
  const steady = 0.88 + level * 0.13;
  const late = Math.max(0, level - 80) * 0.02;
  const elite = Math.max(0, level - 150) * 0.03;
  return Number((steady + late + elite).toFixed(2));
}

function getBaseSpeed(level) {
  const steady = 8.4 + Math.min(level, 80) * 0.09;
  const late = Math.max(0, Math.min(level - 80, 70)) * 0.04;
  const elite = Math.max(0, level - 150) * 0.02;
  return Number((steady + late + elite).toFixed(2));
}

function getGateCount(level, duration) {
  const pressure = Math.min(18, Math.floor(level / 12));
  return Math.min(52, Math.round(duration / 3.2 + pressure));
}

function getEnemyCount(level, duration) {
  const projected = 4 + duration / 6 + level * 0.04;
  return Math.min(27, Math.max(3, Math.round(projected * 0.7)));
}

function getPressureCounts(level, gateCount) {
  const slots = Math.max(0, gateCount - 3);
  const shooterPace = level < 40 ? 16 : level < 80 ? 13 : 10;
  const walkerPace = level < 40 ? 16 : level < 80 ? 13 : 11;
  return {
    walls: level >= 6 ? Math.min(Math.floor(slots * 0.16), Math.floor(level / 18)) : 0,
    walkers: level >= 13 ? Math.min(Math.floor(slots * 0.2), Math.floor(level / walkerPace)) : 0,
    shooters: level >= 9 ? Math.min(Math.floor(slots * 0.22), Math.floor(level / shooterPace)) : 0,
    barricades: level >= 4 ? Math.min(Math.floor(slots * 0.24), Math.floor(level / 13) + 1) : 0,
  };
}

function getBlockedUpgrades(level, gateCount) {
  if (level < 7) return 0;
  return Math.min(Math.floor(gateCount * 0.18), Math.floor(level / 28) + 1);
}

function getHazardChance(level) {
  if (level < 9) return 0.04 + level * 0.008;
  return Math.min(0.94, 0.12 + level * 0.0042);
}

function getBaseReward(level) {
  return Math.round(70 + level * 12 + Math.max(0, level - 80) * 5);
}

function getFinishRows(level) {
  return Math.min(28, 3 + Math.floor(level / 6));
}
