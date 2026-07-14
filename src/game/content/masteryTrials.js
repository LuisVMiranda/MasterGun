import { WEAPON_DEFINITIONS } from "./weapons.js";

const ACT_NAMES = Object.freeze(["fundamentals", "control", "specialization", "expert"]);
const TRIAL_THEMES = Object.freeze({
  pistol: ["precision", "routing", "economy", "mobility", "qualification"],
  shotgun: ["timing", "armor", "reload", "breach", "qualification"],
  machineGun: ["sustain", "sweep", "rationing", "pressure", "qualification"],
  rifle: ["distance", "weakPoints", "shields", "movement", "qualification"],
});

export const MASTERY_TRIALS = Object.freeze(WEAPON_DEFINITIONS.flatMap((weapon) => {
  return Array.from({ length: 20 }, (_, index) => createTrial(weapon.id, index + 1));
}));

export function getMasteryTrials(weaponId) {
  return MASTERY_TRIALS.filter((trial) => trial.weaponId === weaponId);
}

export function findMasteryTrial(weaponId, number) {
  return getMasteryTrials(weaponId).find((trial) => trial.number === Number(number)) ?? getMasteryTrials(weaponId)[0];
}

export function getMasteryReward(trial, previousMedal, nextMedal) {
  const bronze = 250 + trial.number * 75;
  const cumulative = [0, bronze, Math.round(bronze * 1.5), Math.round(bronze * 2.25)];
  return Math.max(0, cumulative[nextMedal] - cumulative[previousMedal]);
}

export function isMasteryTrialUnlocked(progress, trial) {
  return trial.number === 1 || (progress?.medals?.[trial.number - 1] ?? 0) > 0;
}

export function evaluateMasteryMedal(run) {
  const trial = run.modeContext.trial;
  const metrics = run.metrics ?? {};
  const lifeRatio = run.player.maxLife > 0 ? run.player.life / run.player.maxLife : 0;
  const silver = metrics.collisions <= trial.silver.collisions && lifeRatio >= trial.silver.life;
  const gold = metrics.collisions <= trial.gold.collisions && lifeRatio >= trial.gold.life && run.player.ammo >= trial.gold.ammo;
  const objective = getObjectiveProgress(run, trial.objective.metric);
  if (gold && objective >= trial.objective.gold) return 3;
  if (silver && objective >= trial.objective.silver) return 2;
  return 1;
}

function createTrial(weaponId, number) {
  const act = Math.ceil(number / 5);
  const theme = TRIAL_THEMES[weaponId][(number - 1) % 5];
  return Object.freeze({
    id: `${weaponId}-${number}`,
    weaponId,
    number,
    act,
    actName: ACT_NAMES[act - 1],
    theme,
    checkpoint: number % 5 === 0,
    duration: 40 + act * 10 + (number % 5) * 2,
    objective: createObjective(weaponId, theme, act),
    silver: { collisions: Math.max(1, 5 - act), life: 0.28 + act * 0.07 },
    gold: { collisions: act >= 3 ? 0 : 1, life: 0.58 + act * 0.06, ammo: weaponId === "machineGun" ? 6 : 2 },
  });
}

function createObjective(weaponId, theme, act) {
  if (["precision", "timing", "distance", "weakPoints"].includes(theme)) return { metric: "accuracy", silver: 0.26 + act * 0.02, gold: 0.4 + act * 0.025 };
  if (["armor", "breach", "shields"].includes(theme)) return { metric: "materials", silver: 1 + act, gold: 2 + act };
  if (["sustain", "sweep", "pressure"].includes(theme)) return { metric: "targets", silver: 5 + act * 2, gold: 8 + act * 3 };
  if (["economy", "rationing"].includes(theme)) return { metric: "ammo", silver: weaponId === "machineGun" ? 8 : 3, gold: weaponId === "machineGun" ? 18 : 8 };
  return { metric: "score", silver: 350 + act * 180, gold: 650 + act * 260 };
}

function getObjectiveProgress(run, metric) {
  const metrics = run.metrics ?? {};
  const readers = {
    accuracy: () => (metrics.projectileHits ?? 0) / Math.max(1, metrics.shotsFired ?? 0),
    materials: () => (metrics.wallsDestroyed ?? 0) + (metrics.shieldKills ?? 0),
    targets: () => metrics.targetsDestroyed ?? 0,
    ammo: () => run.player.ammo ?? 0,
    score: () => run.score ?? 0,
  };
  return (readers[metric] ?? readers.score)();
}
