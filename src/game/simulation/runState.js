import { PHASE } from "../content/constants.js";
import { normalizeLocale } from "../content/i18n.js";
import { createRoundPlan } from "./roundGenerator.js";
import { createRunMetrics } from "./achievements.js";
import { createLifeState } from "./life.js";
import { createSeed } from "./random.js";
import { calculateLiveScore } from "./scoring.js";
import { buildStats } from "./stats.js";

export function createAppState(save) {
  return {
    phase: PHASE.MENU,
    save,
    run: null,
    lastSummary: null,
    inputSource: "pointer",
    ui: { infoOpen: false, missionsOpen: false, leaderboardOpen: false, missionFilter: "all" },
  };
}

export function startRun(state, seed = createSeed(state.save.level, state.save.cash)) {
  const locale = normalizeLocale(state.save.settings?.locale);
  const weaponId = state.save.equippedWeapon;
  const plan = createRoundPlan(state.save.level, seed, locale, weaponId);
  const stats = buildStats(state.save.upgrades, {}, weaponId);
  const lifeState = createLifeState(stats);
  const run = {
    seed,
    level: state.save.level,
    locale,
    profile: plan.profile,
    distance: 0,
    elapsed: 0,
    player: { x: 0, targetX: 0, recoilZ: 0, recoilTimer: 0, recoilDuration: 0, interruptTimer: 0, shotTimer: 0, assistantTimer: 0, ammo: stats.ammo, assistantAmmo: stats.assistantAmmo, ...lifeState },
    stats,
    weaponId: stats.weaponId,
    modifiers: {},
    upgradesSnapshot: { ...state.save.upgrades },
    bullets: [],
    enemyProjectiles: [],
    damageNumbers: [],
    audioEvents: [],
    particles: [],
    messages: [],
    metrics: createRunMetrics(stats.weaponId),
    entities: plan.entities,
    nextId: plan.nextId,
    destroyedValue: 0,
    finishTier: 0,
    scorePenalty: 0,
    score: 0,
    lastShotAt: 0,
  };
  run.score = calculateLiveScore(run);

  return {
    ...state,
    phase: PHASE.RUNNING,
    ui: { ...state.ui, infoOpen: false, missionsOpen: false, leaderboardOpen: false },
    run,
  };
}

export function pauseRun(state) {
  if (state.phase !== PHASE.RUNNING) return state;
  return { ...state, phase: PHASE.PAUSED };
}

export function resumeRun(state) {
  if (state.phase !== PHASE.PAUSED) return state;
  return { ...state, phase: PHASE.RUNNING };
}

export function exitToMenu(state) {
  return { ...state, phase: PHASE.MENU, run: null };
}

export function setInfoOpen(state, infoOpen) {
  return { ...state, ui: { ...state.ui, infoOpen, missionsOpen: infoOpen ? false : state.ui?.missionsOpen, leaderboardOpen: infoOpen ? false : state.ui?.leaderboardOpen } };
}

export function setMissionsOpen(state, missionsOpen) {
  return { ...state, ui: { ...state.ui, missionsOpen, infoOpen: missionsOpen ? false : state.ui?.infoOpen, leaderboardOpen: missionsOpen ? false : state.ui?.leaderboardOpen } };
}

export function setLeaderboardOpen(state, leaderboardOpen) {
  return { ...state, ui: { ...state.ui, leaderboardOpen, infoOpen: leaderboardOpen ? false : state.ui?.infoOpen, missionsOpen: leaderboardOpen ? false : state.ui?.missionsOpen } };
}

export function setMissionFilter(state, missionFilter) {
  const allowed = new Set(["all", "incomplete", "complete"]);
  return { ...state, ui: { ...state.ui, missionFilter: allowed.has(missionFilter) ? missionFilter : "all" } };
}
