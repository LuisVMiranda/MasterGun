import "./styles.css";
import { PHASE } from "./game/content/constants.js";
import { createSfx } from "./game/audio/sfx.js";
import { createInputController } from "./game/input/inputController.js";
import { equipWeapon } from "./game/simulation/economy.js";
import { buyOffer } from "./game/simulation/gameFlow.js";
import { createProfile, selectProfile } from "./game/simulation/profiles.js";
import { createAppState, exitToMenu, pauseRun, resumeRun, setInfoOpen, startRun } from "./game/simulation/runState.js";
import { updateRunState } from "./game/simulation/updateRun.js";
import { loadSave, resetSave, saveGame } from "./game/save/storage.js";
import { createRenderBridge } from "./render/bridge/renderBridge.js";
import { createHud } from "./ui/hud.js";

const root = document.querySelector("#app");
let appState = createAppState(loadSave());
let lastTime = performance.now();
let lastSaved = JSON.stringify(appState.save);
let previousControls = { confirmPressed: false, pausePressed: false, uiAxisX: 0, uiAxisY: 0 };
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
  onLocale: (locale) => setState(updateLocale(appState, locale)),
  onProfileCreate: (name) => setState(createAppState(createProfile(appState.save, name))),
  onProfileSelect: (profileId) => setState(createAppState(selectProfile(appState.save, profileId))),
  onEquipWeapon: (weaponId) => setState({ ...appState, save: equipWeapon(appState.save, weaponId) }),
  onBuy: (offerId) => {
    const result = buyOffer(appState, offerId);
    setState(result.state);
  },
});

const renderBridge = createRenderBridge(hud.canvasHost);
const input = createInputController(renderBridge.canvas);

hud.update(appState);
requestAnimationFrame(loop);

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  const controls = input.read();

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

function setState(nextState) {
  appState = nextState;
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
  if (isPressed(controls.pausePressed, previousControls.pausePressed)) {
    handlePauseCommand();
  }

  if (!hud.hasOverlay()) return;

  const direction = getUiMoveDirection(controls);
  if (direction && now >= nextUiMoveAt) {
    hud.moveFocus(direction);
    nextUiMoveAt = now + 180;
  }

  if (isPressed(controls.confirmPressed, previousControls.confirmPressed)) {
    hud.activateFocused();
  }
}

function handlePauseCommand() {
  if (appState.ui?.infoOpen) {
    setState(setInfoOpen(appState, false));
    return;
  }

  const phase = appState.phase;
  if (phase === PHASE.RUNNING) setState(pauseRun(appState));
  if (phase === PHASE.PAUSED) startOrResume(() => resumeRun(appState));
}

function getUiMoveDirection(controls) {
  const vertical = Math.abs(controls.uiAxisY) > 0.6 ? Math.sign(controls.uiAxisY) : 0;
  const horizontal = Math.abs(controls.uiAxisX) > 0.6 ? Math.sign(controls.uiAxisX) : 0;
  return vertical || horizontal;
}

function isPressed(current, previous) {
  return Boolean(current) && !previous;
}
