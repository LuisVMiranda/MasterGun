import { t } from "../game/content/i18n.js";
import { WEAPON_DEFINITIONS, findWeapon } from "../game/content/weapons.js";
import { icon } from "./icons.js";
import { weaponSprite } from "./weaponSprites.js";

export function renderWeaponTools(state, locale) {
  const owned = new Set(state.save.weaponsOwned ?? []);
  const buttons = WEAPON_DEFINITIONS.filter((weapon) => owned.has(weapon.id))
    .map((weapon) => renderWeaponButton(weapon, state.save.equippedWeapon, locale))
    .join("");

  return `
    <section class="weapon-panel">
      <h2>${icon("weapon")} ${t(locale, "menu.weapon")}: ${t(locale, findWeapon(state.save.equippedWeapon).labelKey)}</h2>
      <div class="button-row">${buttons}</div>
    </section>
  `;
}

function renderWeaponButton(weapon, equippedWeapon, locale) {
  const equipped = equippedWeapon === weapon.id;
  const label = t(locale, weapon.labelKey);
  return `
    <button class="${equipped ? "primary-button weapon-button" : "secondary-button weapon-button"}" data-action="equip" data-weapon="${weapon.id}" data-focus-key="equip:${weapon.id}">
      ${weaponSprite(weapon.id, label)}<span>${label}</span>
    </button>
  `;
}
