import "./styles.css";
import "./background.css";
import "./ui-extras.css";
import "./effects.css";
import "./sound.css";
import "./shop.css";
import "./mode-select.css";
import "./mode-lobby.css";
import { PHASE } from "./game/content/constants.js";
import { createAudioManager } from "./game/audio/audioManager.js";
import { updateAudioSetting } from "./game/audio/audioSettings.js";
import { createInputController } from "./game/input/inputController.js";
import { recordWeaponEquip, refreshMissionProgress } from "./game/simulation/achievements.js";
import { getPendingVictory, markVictorySeen } from "./game/simulation/victoryProgress.js";
import { equipWeapon } from "./game/simulation/economy.js";
import { buyOffer, continueEndlessOperation, continueRunVictory, extractEndlessOperation } from "./game/simulation/gameFlow.js";
import { createProfile, selectProfile } from "./game/simulation/profiles.js";
import { createAppState, enterMode, exitMode, exitToMenu, pauseRun, resumeRun, setInfoOpen, setLeaderboardOpen, setMissionFilter, setMissionsOpen, setModeSelection, setSoundOpen, startRun } from "./game/simulation/runState.js";
import { updateRunState } from "./game/simulation/updateRun.js";
import { loadSave, resetSave, saveGame } from "./game/save/storage.js";
import { createRenderBridge } from "./render/bridge/renderBridge.js";
import { applyBackgroundForLevel } from "./ui/backgrounds.js";
import { createHud } from "./ui/hud.js";

const root = document.querySelector("#app");
const GAME_FONT_FACES = Object.freeze(['500 48px "MasterGun Tungsten Condensed"', '500 48px "MasterGun Tungsten Medium"', '700 24px "MasterGun Rajdhani"']);
let appState = createAppState(refreshMissionProgress(loadSave()));
let lastTime = performance.now();
let lastSaved = JSON.stringify(appState.save);
let previousControls = { confirmPressed: false, closePressed: false, pausePressed: false, optionsPressed: false, sharePressed: false, uiAxisX: 0, uiAxisY: 0, scrollAxisY: 0 };
let nextUiMoveAt = 0;
let lastPassiveHudAt = 0;
const audio = createAudioManager();
installAudioUnlockFallback();

const hud = createHud(root, {
  onStart: () => startOrResume(() => startRun(appState)),
  onModeSelect: (modeId) => setState(enterMode(appState, modeId)),
  onModeBack: () => setState(exitMode(appState)),
  onModeSelection: (key, value) => setState(setModeSelection(appState, key, value)),
  onEndlessContinue: () => setState(continueEndlessOperation(appState)),
  onEndlessExtract: () => setState(extractEndlessOperation(appState)),
  onPause: () => setState(pauseRun(appState)),
  onResume: () => startOrResume(() => resumeRun(appState)),
  onMenu: () => setState(exitToMenu(appState)),
  onNext: () => startOrResume(() => startRun(appState)),
  onContinueVictory: () => setState(continueRunVictory(appState)),
  onReset: () => setState(createAppState(resetSave())),
  onInfo: () => setState(setInfoOpen(appState, true)),
  onCloseInfo: () => setState(setInfoOpen(appState, false)),
  onSound: () => setState(setSoundOpen(appState, true)),
  onCloseSound: () => setState(setSoundOpen(appState, false)),
  onMissions: () => setState(setMissionsOpen(appState, true)),
  onCloseMissions: () => setState(setMissionsOpen(appState, false)),
  onMissionFilter: (filter) => setState(setMissionFilter(appState, filter)),
  onLeaderboard: () => setState(setLeaderboardOpen(appState, true)),
  onCloseLeaderboard: () => setState(setLeaderboardOpen(appState, false)),
  onVictoryClose: () => setState({ ...appState, save: markVictorySeen(appState.save) }),
  onLocale: (locale) => setState(updateLocale(appState, locale)),
  onProfileCreate: (name) => setState(createAppState(createProfile(appState.save, name))),
  onProfileSelect: (profileId) => setState(createAppState(selectProfile(appState.save, profileId))),
  onEquipWeapon: (weaponId) => setState({ ...appState, save: equipSelectedWeapon(appState.save, weaponId) }),
  onBuy: (offerId) => {
    const result = buyOffer(appState, offerId);
    audio.playUi(result.purchased ? "purchase" : "menuOption", appState.save.settings);
    setState(result.state);
  },
  onUiAction: (action) => playUiAction(action),
  onAudioSetting: (key, value) => setAudioSetting(key, value),
});

const renderBridge = createRenderBridge(hud.canvasHost);
const input = createInputController(renderBridge.canvas);

hud.update(appState);
syncBackground();
audio.syncMusic(appState);
loadGameFonts().finally(() => requestAnimationFrame(loop));

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  const controls = input.read();
  updateInputSource(controls.source);
  audio.update(dt, appState.save.settings);

  handleInputCommands(controls, now);

  if (appState.phase === PHASE.RUNNING) {
    const previousState = appState;
    appState = updateRunState(appState, controls, dt);
    playAudioEvents();
    persistIfNeeded();

    if (previousState.phase !== appState.phase) {
      playPhaseEffect(previousState, appState);
      audio.syncMusic(appState);
      hud.update(appState);
    }
  }

  syncBackground();
  renderBridge.update(appState, dt);
  if (appState.phase === PHASE.RUNNING) {
    hud.update(appState);
  } else if (now - lastPassiveHudAt >= 1000) {
    hud.update(appState);
    lastPassiveHudAt = now;
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
  const previousState = appState;
  appState = { ...nextState, inputSource: appState.inputSource ?? nextState.inputSource ?? "pointer" };
  playPhaseEffect(previousState, appState);
  audio.syncMusic(appState);
  persistIfNeeded();
  hud.update(appState);
  syncBackground();
}

function startOrResume(getNextState) {
  audio.arm();
  setState(getNextState());
}

function playAudioEvents() {
  const events = appState.run?.audioEvents ?? [];
  if (events.length === 0) return;

  audio.playEvents(events, appState.save.settings);
  appState.run.audioEvents = [];
}

function playUiAction(action) {
  audio.arm();
  if (action !== "buy") audio.playUi("menuOption", appState.save.settings);
}

function setAudioSetting(key, value) {
  const settings = updateAudioSetting(appState.save.settings, key, value);
  appState = { ...appState, save: { ...appState.save, settings } };
  audio.update(0, settings);
  persistIfNeeded();
}

function playPhaseEffect(previousState, nextState) {
  if (previousState.phase !== PHASE.RUNNING) return;
  if (nextState.phase === PHASE.VICTORY) audio.playUi("levelComplete", nextState.save.settings);
  if (nextState.phase === PHASE.SHOP && nextState.lastSummary?.failed) audio.playUi("gameOver", nextState.save.settings);
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
    [() => appState.ui?.soundOpen, () => setState(setSoundOpen(appState, false))],
    [() => Boolean(getPendingVictory(appState.save)), () => setState({ ...appState, save: markVictorySeen(appState.save) })],
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

function syncBackground() {
  applyBackgroundForLevel(hud.canvasHost, appState.run?.level ?? appState.save.level);
}

function installAudioUnlockFallback() {
  const events = ["pointerdown", "keydown", "touchstart"];
  const unlock = () => {
    audio.arm();
    events.forEach((event) => window.removeEventListener(event, unlock, true));
  };
  events.forEach((event) => window.addEventListener(event, unlock, { capture: true, once: true }));
}
