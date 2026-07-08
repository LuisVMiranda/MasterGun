import { TRACK } from "../content/constants.js";
import { clamp } from "../simulation/math.js";

export function createInputController(target) {
  const keys = new Set();
  const state = {
    axisX: 0,
    pointerX: 0,
    pointerActive: false,
    confirmPressed: false,
    pausePressed: false,
    source: "pointer",
  };

  const onPointerMove = (event) => {
    state.pointerX = pointerToTrackX(event.clientX, target);
    state.pointerActive = true;
    state.source = "pointer";
  };

  const onKeyDown = (event) => updateKey(keys, event, true);
  const onKeyUp = (event) => updateKey(keys, event, false);

  target.addEventListener("pointermove", onPointerMove);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return {
    read() {
      state.axisX = readKeyboardAxis(keys);
      state.pausePressed = keys.has("Escape");
      state.confirmPressed = keys.has("Enter") || keys.has(" ");
      mergeGamepad(state);
      return { ...state };
    },
    destroy() {
      target.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}

export function pointerToTrackX(clientX, target) {
  const rect = target.getBoundingClientRect();
  const ratio = (clientX - rect.left) / Math.max(1, rect.width);
  return clamp((0.5 - ratio) * TRACK.halfWidth * 2, -TRACK.halfWidth, TRACK.halfWidth);
}

function updateKey(keys, event, isDown) {
  if (isTrackedKey(event.key)) {
    event.preventDefault();
    keys[isDown ? "add" : "delete"](event.key);
  }
}

function isTrackedKey(key) {
  return ["ArrowLeft", "ArrowRight", "a", "A", "d", "D", "Escape", "Enter", " "].includes(key);
}

export function readKeyboardAxis(keys) {
  const left = keys.has("ArrowLeft") || keys.has("a") || keys.has("A");
  const right = keys.has("ArrowRight") || keys.has("d") || keys.has("D");
  return Number(left) - Number(right);
}

function mergeGamepad(state) {
  const pad = readGamepad();
  if (!pad) return;

  const axis = readGamepadAxis(pad);

  if (Math.abs(axis) > 0.05) {
    state.axisX = axis;
    state.pointerActive = false;
    state.source = "controller";
  }

  state.confirmPressed = state.confirmPressed || isButtonPressed(pad, 0);
  state.pausePressed = state.pausePressed || isButtonPressed(pad, 9);
}

function readGamepad() {
  return navigator.getGamepads?.().find(Boolean);
}

export function readGamepadAxis(pad) {
  const stick = pad.axes[0] ?? 0;
  if (Math.abs(stick) > 0.16) return -stick;
  return Number(isButtonPressed(pad, 14)) - Number(isButtonPressed(pad, 15));
}

function isButtonPressed(pad, index) {
  return Boolean(pad.buttons[index]?.pressed);
}
