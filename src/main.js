import "./styles.css";
import "./ui-extras.css";
import { PHASE } from "./game/content/constants.js";
import { createSfx } from "./game/audio/sfx.js";
import { createInputController } from "./game/input/inputController.js";
import { markGameWonSeen, recordWeaponEquip, refreshMissionProgress } from "./game/simulation/achievements.js";
import { equipWeapon } from "./game/simulation/economy.js";
import { buyOffer } from "./game/simulation/gameFlow.js";
import { createProfile, selectProfile } from "./game/simulation/profiles.js";
import { createAppState, exitToMenu, pauseRun, resumeRun, setInfoOpen, setLeaderboardOpen, setMissionFilter, setMissionsOpen, startRun } from "./game/simulation/runState.js";
import { updateRunState } from "./game/simulation/updateRun.js";
import { loadSave, resetSave, saveGame } from "./game/save/storage.js";
import { createRenderBridge } from "./render/bridge/renderBridge.js";
import { createHud } from "./ui/hud.js";

const root = document.querySelector("#app");
const GAME_FONT_FACES = Object.freeze(['500 48px "MasterGun Tungsten Condensed"', '500 48px "MasterGun Tungsten Medium"', '700 24px "MasterGun Rajdhani"']);
let appState = createAppState(refreshMissionProgress(loadSave()));
let lastTime = performance.now();
let lastSaved = JSON.stringify(appState.save);
let previousControls = { confirmPressed: false, closePressed: false, pausePressed: false, optionsPressed: false, sharePressed: false, uiAxisX: 0, uiAxisY: 0, scrollAxisY: 0 };
let nextUiMoveAt = 0;
const sfx = createSfx();

const hud = createHud(root, {
  onStart: () => startOrResume(() => startRun(appState)),
  onPause: () => setState(pauseRun(appState)),
  onResume: () => startOrResume(() => resumeRun(appState)),
  onMenu: () => setState(exitToMenu(appState)),
  onNext: () => startOrResume(() => startRun(appState)),
  onReset: () => setState(createAppState(resetSave())),
  onInfo: () => setState(setInfoOpen(appState, true)),
  onCloseInfo: () => setState(setInfoOpen(appState, false)),
  onMissions: () => setState(setMissionsOpen(appState, true)),
  onCloseMissions: () => setState(setMissionsOpen(appState, false)),
  onMissionFilter: (filter) => setState(setMissionFilter(appState, filter)),
  onLeaderboard: () => setState(setLeaderboardOpen(appState, true)),
  onCloseLeaderboard: () => setState(setLeaderboardOpen(appState, false)),
  onVictoryClose: () => setState({ ...appState, save: markGameWonSeen(appState.save) }),
  onLocale: (locale) => setState(updateLocale(appState, locale)),
  onProfileCreate: (name) => setState(createAppState(createProfile(appState.save, name))),
  onProfileSelect: (profileId) => setState(createAppState(selectProfile(appState.save, profileId))),
  onEquipWeapon: (weaponId) => setState({ ...appState, save: equipSelectedWeapon(appState.save, weaponId) }),
  onBuy: (offerId) => {
    const result = buyOffer(appState, offerId);
    setState(result.state);
  },
});

const renderBridge = createRenderBridge(hud.canvasHost);
const input = createInputController(renderBridge.canvas);

hud.update(appState);
loadGameFonts().finally(() => requestAnimationFrame(loop));

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  const controls = input.read();
  updateInputSource(controls.source);

  handleInputCommands(controls, now);

  if (appState.phase === PHASE.RUNNING) {
    const previousPhase = appState.phase;
    appState = updateRunState(appState, controls, dt);
    playAudioEvents();
    persistIfNeeded();

    if (previousPhase !== appState.phase) {
      hud.update(appState);
    }
  }

  renderBridge.update(appState, dt);
  if (appState.phase === PHASE.RUNNING) {
    hud.update(appState);
  }

  previousControls = controls;
  requestAnimationFrame(loop);
}

function loadGameFonts() {
  if (!document.fonts?.load) return Promise.resolve();

  const fontLoads = Promise.all(GAME_FONT_FACES.map((fontFace) => document.fonts.load(fontFace)));
  const timeout = new Promise((resolve) => {
    window.setTimeout(resolve, 900);
  });
  return Promise.race([fontLoads, timeout]);
}

function setState(nextState) {
  appState = { ...nextState, inputSource: appState.inputSource ?? nextState.inputSource ?? "pointer" };
  persistIfNeeded();
  hud.update(appState);
}

function startOrResume(getNextState) {
  sfx.arm();
  setState(getNextState());
}

function playAudioEvents() {
  const events = appState.run?.audioEvents ?? [];
  if (events.length === 0) return;

  sfx.play(events, appState.save.settings?.volume ?? 0.7);
  appState.run.audioEvents = [];
}

function updateLocale(state, locale) {
  return {
    ...state,
    save: {
      ...state.save,
      settings: { ...state.save.settings, locale },
    },
  };
}

function persistIfNeeded() {
  const serialized = JSON.stringify(appState.save);

  if (serialized !== lastSaved) {
    saveGame(appState.save);
    lastSaved = serialized;
  }
}

function handleInputCommands(controls, now) {
  if (isPressed(controls.sharePressed, previousControls.sharePressed)) {
    setState(setInfoOpen(appState, true));
    return;
  }

  if (isPressed(controls.closePressed, previousControls.closePressed)) {
    handleCloseCommand();
    return;
  }

  if (isPressed(controls.optionsPressed, previousControls.optionsPressed)) {
    handleOptionsCommand();
    return;
  }

  if (isPressed(controls.pausePressed, previousControls.pausePressed)) {
    handlePauseCommand();
  }

  if (!hud.hasOverlay()) return;

  if (Math.abs(controls.scrollAxisY) > 0.2) {
    hud.scrollOverlay(controls.scrollAxisY * 24);
  }

  const direction = getUiMoveDirection(controls);
  if (direction && now >= nextUiMoveAt) {
    hud.moveFocus(direction);
    nextUiMoveAt = now + 180;
  }

  if (isPressed(controls.confirmPressed, previousControls.confirmPressed)) {
    hud.activateFocused();
  }
}

function handleOptionsCommand() {
  if (appState.phase === PHASE.RUNNING) {
    setState(pauseRun(appState));
    return;
  }

  if (appState.phase === PHASE.PAUSED) {
    startOrResume(() => resumeRun(appState));
    return;
  }

  setState(setMissionsOpen(appState, true));
}

function handlePauseCommand() {
  if (closeOpenUiSurface()) return;

  const phase = appState.phase;
  if (phase === PHASE.RUNNING) setState(pauseRun(appState));
  if (phase === PHASE.PAUSED) startOrResume(() => resumeRun(appState));
}

function handleCloseCommand() {
  closeOpenUiSurface();
}

function closeOpenUiSurface() {
  const closeSurface = getCloseSurfaceAction();
  closeSurface?.();
  return Boolean(closeSurface);
}

function getCloseSurfaceAction() {
  const closers = [
    [() => appState.ui?.infoOpen, () => setState(setInfoOpen(appState, false))],
    [() => appState.ui?.missionsOpen, () => setState(setMissionsOpen(appState, false))],
    [() => appState.ui?.leaderboardOpen, () => setState(setLeaderboardOpen(appState, false))],
    [() => appState.save.achievements?.gameWon && !appState.save.achievements?.gameWonSeen, () => setState({ ...appState, save: markGameWonSeen(appState.save) })],
    [() => appState.phase === PHASE.PAUSED, () => startOrResume(() => resumeRun(appState))],
  ];

  return closers.find(([isOpen]) => isOpen())?.[1];
}

function getUiMoveDirection(controls) {
  const vertical = Math.abs(controls.uiAxisY) > 0.6 ? Math.sign(controls.uiAxisY) : 0;
  const horizontal = Math.abs(controls.uiAxisX) > 0.6 ? Math.sign(controls.uiAxisX) : 0;
  return vertical || horizontal;
}

function isPressed(current, previous) {
  return Boolean(current) && !previous;
}

function equipSelectedWeapon(save, weaponId) {
  const nextSave = equipWeapon(save, weaponId);
  return nextSave === save ? save : recordWeaponEquip(nextSave, weaponId);
}

function updateInputSource(source) {
  if (!source || appState.inputSource === source) return;
  appState = { ...appState, inputSource: source };
  hud.update(appState);
}
