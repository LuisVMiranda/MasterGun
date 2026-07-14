import { PHASE } from "../content/constants.js";
import { normalizeLocale } from "../content/i18n.js";
import { createRunMetrics } from "./achievements.js";
import { createLifeState } from "./life.js";
import { createSeed } from "./random.js";
import { calculateLiveScore } from "./scoring.js";
import { isModeUnlocked } from "../content/modes.js";
import { createModeRunSetup } from "./modeRunSetup.js";
import { findMasteryTrial, isMasteryTrialUnlocked } from "../content/masteryTrials.js";
import { findBossFight, isBossFightUnlocked } from "../content/bossRush.js";

export function createAppState(save) {
  return {
    phase: PHASE.MENU,
    save,
    run: null,
    lastSummary: null,
    selectedMode: null,
    modeSelection: { masteryWeapon: save.equippedWeapon, masteryTrial: 1, bossFight: 1, weeklyDifficulty: "easy" },
    inputSource: "pointer",
    ui: { infoOpen: false, missionsOpen: false, leaderboardOpen: false, soundOpen: false, missionFilter: "all" },
  };
}

export function startRun(state, seed = createSeed(state.save.level, state.save.cash)) {
  const locale = normalizeLocale(state.save.settings?.locale);
  const setup = createModeRunSetup(state, seed, locale);
  if (!setup) return state;
  const { plan, stats, weaponId } = setup;
  const lifeState = createLifeState(stats);
  const run = {
    mode: setup.mode,
    modeContext: plan.modeContext ?? {},
    seed: plan.seed ?? seed,
    level: plan.level ?? state.save.level,
    locale,
    profile: plan.profile,
    distance: 0,
    elapsed: 0,
    player: { x: 0, targetX: 0, recoilZ: 0, recoilTimer: 0, recoilDuration: 0, interruptTimer: 0, shotTimer: 0, ammo: stats.ammo, ...lifeState },
    stats,
    weaponId,
    modifiers: {},
    upgradesSnapshot: { ...state.save.upgrades },
    bullets: [],
    enemyProjectiles: [],
    soldiers: [],
    effects: {},
    specialShot: null,
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
    save: setup.save,
    phase: PHASE.RUNNING,
    ui: { ...state.ui, infoOpen: false, missionsOpen: false, leaderboardOpen: false, soundOpen: false },
    run,
  };
}

export function enterMode(state, modeId) {
  if (!isModeUnlocked(state.save, modeId)) return state;
  return { ...state, phase: PHASE.MODE_MENU, selectedMode: modeId, run: null, lastSummary: null };
}

export function setModeSelection(state, key, value) {
  if (!(key in state.modeSelection)) return state;
  if (!canSelectModeOption(state, key, value)) return state;
  if (key === "masteryWeapon") return { ...state, modeSelection: { ...state.modeSelection, masteryWeapon: value, masteryTrial: 1 } };
  return { ...state, modeSelection: { ...state.modeSelection, [key]: value } };
}

function canSelectModeOption(state, key, value) {
  if (key === "masteryWeapon") return state.save.weaponsOwned.includes(value);
  if (key === "masteryTrial") {
    const progress = state.save.modeProgress.mastery[state.modeSelection.masteryWeapon];
    return isMasteryTrialUnlocked(progress, findMasteryTrial(state.modeSelection.masteryWeapon, value));
  }
  if (key === "bossFight") return isBossFightUnlocked(state.save.modeProgress.bossRush, findBossFight(value));
  return true;
}

export function exitMode(state) {
  return { ...state, phase: PHASE.MENU, selectedMode: null, run: null, lastSummary: null };
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
  return { ...state, phase: PHASE.MODE_MENU, run: null };
}

export function setInfoOpen(state, infoOpen) {
  return { ...state, ui: { ...state.ui, infoOpen, missionsOpen: infoOpen ? false : state.ui?.missionsOpen, leaderboardOpen: infoOpen ? false : state.ui?.leaderboardOpen, soundOpen: infoOpen ? false : state.ui?.soundOpen } };
}

export function setMissionsOpen(state, missionsOpen) {
  return { ...state, ui: { ...state.ui, missionsOpen, infoOpen: missionsOpen ? false : state.ui?.infoOpen, leaderboardOpen: missionsOpen ? false : state.ui?.leaderboardOpen, soundOpen: missionsOpen ? false : state.ui?.soundOpen } };
}

export function setLeaderboardOpen(state, leaderboardOpen) {
  return { ...state, ui: { ...state.ui, leaderboardOpen, infoOpen: leaderboardOpen ? false : state.ui?.infoOpen, missionsOpen: leaderboardOpen ? false : state.ui?.missionsOpen, soundOpen: leaderboardOpen ? false : state.ui?.soundOpen } };
}

export function setSoundOpen(state, soundOpen) {
  return {
    ...state,
    ui: {
      ...state.ui,
      soundOpen,
      infoOpen: soundOpen ? false : state.ui?.infoOpen,
      missionsOpen: soundOpen ? false : state.ui?.missionsOpen,
      leaderboardOpen: soundOpen ? false : state.ui?.leaderboardOpen,
    },
  };
}

export function setMissionFilter(state, missionFilter) {
  const allowed = new Set(["all", "incomplete", "complete"]);
  return { ...state, ui: { ...state.ui, missionFilter: allowed.has(missionFilter) ? missionFilter : "all" } };
}
