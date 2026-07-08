export const LEVEL_PROFILES = Object.freeze([
  profile(1, "First Steps", 1, 118, 8.6, 5, 3, 1, 0, 0, 0, 0, 0.04, 75, 3),
  profile(2, "Power Lesson", 1.08, 124, 8.9, 6, 3, 1, 0, 0, 0, 0, 0.05, 82, 3),
  profile(3, "Income Choice", 1.15, 130, 9.2, 6, 4, 1, 0, 0, 0, 0, 0.07, 90, 4),
  profile(4, "Double Tease", 1.22, 136, 9.5, 7, 4, 2, 1, 0, 0, 0, 0.09, 98, 4),
  profile(5, "Assistant Lane", 1.3, 142, 9.8, 7, 4, 2, 1, 0, 0, 0, 0.11, 106, 4),
  profile(6, "First Blocks", 1.38, 150, 10.1, 8, 5, 2, 2, 0, 0, 1, 0.14, 114, 5),
  profile(7, "Wall Weave", 1.48, 158, 10.5, 8, 5, 2, 3, 0, 0, 1, 0.18, 122, 5),
  profile(8, "Moving Trouble", 1.58, 166, 10.9, 9, 5, 3, 3, 0, 0, 1, 0.23, 132, 5),
  profile(9, "First Turret", 1.7, 174, 11.3, 9, 6, 3, 3, 1, 0, 1, 0.27, 142, 6),
  profile(10, "Crossfire", 1.82, 184, 11.7, 10, 6, 3, 4, 2, 0, 2, 0.3, 152, 6),
  profile(11, "Split Routes", 1.95, 194, 12.1, 10, 6, 4, 4, 2, 1, 2, 0.34, 164, 6),
  profile(12, "Elite Barricades", 2.08, 204, 12.5, 11, 7, 4, 5, 2, 1, 2, 0.38, 176, 7),
  profile(13, "Walker Intro", 2.22, 214, 12.9, 11, 7, 4, 5, 2, 2, 2, 0.41, 188, 7),
  profile(14, "Score Squeeze", 2.36, 224, 13.2, 12, 7, 5, 5, 3, 2, 3, 0.44, 200, 7),
  profile(15, "Assistant Trial", 2.52, 236, 13.5, 12, 8, 5, 6, 3, 2, 3, 0.48, 214, 8),
  profile(16, "Late Ladder", 2.68, 248, 13.8, 13, 8, 5, 6, 3, 3, 3, 0.51, 228, 8),
  profile(17, "Locked Jackpot", 2.84, 260, 14.1, 13, 8, 6, 6, 4, 3, 4, 0.54, 242, 8),
  profile(18, "Walking Wall", 3, 272, 14.4, 14, 9, 6, 7, 4, 3, 4, 0.57, 258, 9),
  profile(19, "Double Decision", 3.18, 284, 14.7, 14, 9, 6, 7, 4, 4, 4, 0.6, 274, 9),
  profile(20, "Hazard Net", 3.36, 296, 15, 15, 9, 7, 7, 5, 4, 5, 0.63, 292, 9),
  profile(21, "Skyline Siege", 3.54, 308, 15.25, 15, 10, 7, 8, 5, 4, 5, 0.66, 310, 10),
  profile(22, "Narrow Choices", 3.74, 320, 15.5, 16, 10, 7, 8, 5, 5, 5, 0.69, 330, 10),
  profile(23, "Pressure Vault", 3.94, 332, 15.75, 16, 10, 8, 8, 6, 5, 6, 0.72, 350, 10),
  profile(24, "Elite Walkers", 4.14, 344, 16, 17, 11, 8, 9, 6, 5, 6, 0.75, 372, 11),
  profile(25, "Ammo Tax", 4.36, 356, 16.2, 17, 11, 8, 9, 6, 6, 6, 0.78, 394, 11),
  profile(26, "Red Corridor", 4.58, 368, 16.4, 18, 11, 9, 9, 7, 6, 7, 0.81, 418, 11),
  profile(27, "Assistant Storm", 4.82, 380, 16.6, 18, 12, 9, 10, 7, 6, 7, 0.84, 442, 12),
  profile(28, "Finish Crusher", 5.06, 392, 16.8, 19, 12, 9, 10, 7, 7, 7, 0.87, 468, 12),
  profile(29, "Master Route", 5.32, 404, 17, 19, 12, 10, 10, 8, 7, 8, 0.9, 494, 12),
  profile(30, "Crown Run", 5.6, 420, 17.2, 20, 13, 10, 11, 8, 8, 8, 0.94, 522, 13),
]);

export function getProfileForLevel(level) {
  const base = LEVEL_PROFILES[Math.min(level, 30) - 1];
  if (level <= 30) return base;

  const extra = level - 30;
  return {
    ...base,
    level,
    name: `Crown Run +${extra}`,
    difficulty: Number((base.difficulty + extra * 0.24).toFixed(2)),
    trackLength: base.trackLength + Math.min(90, extra * 6),
    speed: base.speed + Math.min(1.4, extra * 0.04),
    baseReward: base.baseReward + extra * 18,
  };
}

function profile(...row) {
  const [level, name, difficulty, trackLength, speed, gateCount, enemyCount, barricades] = row;
  const [walls, shooters, walkers, blockedUpgrades, hazardChance, baseReward, finishRows] = row.slice(8);
  return {
    level,
    name,
    difficulty,
    trackLength,
    speed,
    gateCount,
    enemyCount,
    barricades,
    walls,
    shooters,
    walkers,
    blockedUpgrades,
    hazardChance,
    baseReward,
    finishRows,
  };
}
