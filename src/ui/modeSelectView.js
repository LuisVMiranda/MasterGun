import { MODE_DEFINITIONS, getHighestArcadeClear, isModeUnlocked } from "../game/content/modes.js";
import { t } from "../game/content/i18n.js";
import { icon } from "./icons.js";

export function renderModeSelect(state, locale) {
  const cards = MODE_DEFINITIONS.map((mode) => renderModeCard(state, mode, locale)).join("");
  return `
    <div class="panel mode-select-panel" data-testid="mode-select">
      <header class="mode-select-heading">
        <div><h1>Master Gun</h1><h2>${t(locale, "mode.selectTitle")}</h2><p>${t(locale, "mode.selectSubtitle")}</p></div>
        <div class="mode-profile-summary">${icon("score")} ${state.save.profileName}<b>${getHighestArcadeClear(state.save)}/200</b></div>
      </header>
      <div class="mode-grid">${cards}</div>
    </div>
  `;
}

function renderModeCard(state, mode, locale) {
  const unlocked = isModeUnlocked(state.save, mode.id);
  const lockText = t(locale, "mode.unlock", { value: mode.unlockLevel });
  return `
    <button class="mode-card ${unlocked ? "is-unlocked" : "is-locked"}" data-action="modeSelect" data-mode="${mode.id}"
      data-focus-key="mode:${mode.id}" ${unlocked ? "" : "disabled"} aria-label="${t(locale, mode.titleKey)}">
      <img src="${mode.image}" alt="" loading="${mode.id === "arcade" ? "eager" : "lazy"}" />
      <span class="mode-card-shade"></span>
      <span class="mode-card-copy"><strong>${t(locale, mode.titleKey)}</strong><small>${t(locale, mode.descriptionKey)}</small>
        ${unlocked ? "" : `<em>${icon("score")} ${lockText}</em>`}</span>
    </button>
  `;
}
