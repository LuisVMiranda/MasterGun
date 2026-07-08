import { describe, expect, it } from "vitest";
import { LOCALES, t, tStat } from "../../src/game/content/i18n.js";
import { WEAPON_DEFINITIONS } from "../../src/game/content/weapons.js";

describe("localization", () => {
  it("resolves core UI, stat, and weapon text for every locale", () => {
    LOCALES.forEach((locale) => {
      expect(t(locale.id, "action.start")).not.toContain("action.");
      expect(t(locale.id, "info.enemies")).not.toContain("info.");
      expect(tStat(locale.id, "score")).not.toContain("stat.");

      WEAPON_DEFINITIONS.forEach((weapon) => {
        expect(t(locale.id, weapon.labelKey)).not.toContain("weapon.");
        expect(t(locale.id, weapon.descriptionKey)).not.toContain("weapon.");
      });
    });
  });
});
