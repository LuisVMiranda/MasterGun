import { PHASE } from "../game/content/constants.js";
import { t } from "../game/content/i18n.js";

export function renderControlHints(state, locale) {
  const mode = getHintMode(state.inputSource);
  const keys = getHintKeys(mode, hasScrollableOverlay(state));
  const items = keys.map((key) => renderHintItem(t(locale, key))).join("");

  return `
    <div class="control-hint-card" data-mode="${mode}">
      <strong>${t(locale, `hint.${mode}Title`)}</strong>
      <ul>${items}</ul>
    </div>
  `;
}

function getHintMode(source) {
  if (source === "controller") return "controller";
  if (source === "keyboard") return "keyboard";
  return "pointer";
}

function getHintKeys(mode, hasOverlay) {
  const base = {
    controller: ["hint.controllerMove", "hint.controllerConfirm", "hint.controllerOptions", "hint.controllerShare"],
    keyboard: ["hint.keyboardMove", "hint.keyboardConfirm", "hint.keyboardPause"],
    pointer: ["hint.pointerMove", "hint.pointerClick"],
  };
  const keys = base[mode] ?? base.pointer;
  return hasOverlay && mode === "controller" ? [...keys, "hint.controllerClose", "hint.controllerScroll"] : keys;
}

function hasScrollableOverlay(state) {
  if (state.ui?.infoOpen || state.ui?.missionsOpen || state.ui?.leaderboardOpen) return true;
  return [PHASE.MENU, PHASE.PAUSED, PHASE.VICTORY, PHASE.SHOP].includes(state.phase);
}

function renderHintItem(text) {
  const [control, description] = splitHint(text);
  return `<li><kbd>${control}</kbd><span>${description}</span></li>`;
}

function splitHint(text) {
  const index = text.indexOf(":");
  if (index < 0) return [text, ""];
  return [text.slice(0, index), text.slice(index + 1).trim()];
}
