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

  if (appState.phase === PHASE.RUNNING) {
    const previousPhase = appState.phase;
    appState = updateRunState(appState, input.read(), dt);
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
