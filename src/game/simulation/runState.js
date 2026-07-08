import { PHASE } from "../content/constants.js";
import { normalizeLocale } from "../content/i18n.js";
import { createRoundPlan } from "./roundGenerator.js";
import { createSeed } from "./random.js";
import { calculateLiveScore } from "./scoring.js";
import { buildStats } from "./stats.js";

export function createAppState(save) {
  return {
    phase: PHASE.MENU,
    save,
    run: null,
    lastSummary: null,
    ui: { infoOpen: false },
  };
}

export function startRun(state, seed = createSeed(state.save.level, state.save.cash)) {
  const locale = normalizeLocale(state.save.settings?.locale);
  const weaponId = state.save.equippedWeapon;
  const plan = createRoundPlan(state.save.level, seed, locale);
  const stats = buildStats(state.save.upgrades, {}, weaponId);
  const run = {
    seed,
    level: state.save.level,
    locale,
    profile: plan.profile,
    distance: 0,
    elapsed: 0,
    player: { x: 0, targetX: 0, recoilZ: 0, recoilTimer: 0, recoilDuration: 0, shotTimer: 0, assistantTimer: 0, ammo: stats.ammo },
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
    ui: { ...state.ui, infoOpen: false },
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
  return { ...state, ui: { ...state.ui, infoOpen } };
}
