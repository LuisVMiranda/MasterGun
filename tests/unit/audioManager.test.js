import { describe, expect, it } from "vitest";
import { PHASE } from "../../src/game/content/constants.js";
import { createAudioManager, getMusicTrackKey } from "../../src/game/audio/audioManager.js";
import { getAudioLevels, normalizeAudioSettings, updateAudioSetting } from "../../src/game/audio/audioSettings.js";

const fullVolume = { masterVolume: 1, musicVolume: 1, sfxVolume: 1 };

describe("audio mixer", () => {
  it("attempts to start menu music immediately", async () => {
    const harness = createHarness();
    const manager = createAudioManager(harness.options);

    manager.syncMusic(createState(PHASE.MENU));
    await Promise.resolve();

    expect(harness.audios[0].playCalls).toBe(1);
  });

  it("retries blocked intro music on the first user interaction", async () => {
    const harness = createHarness({ rejectMenuOnce: true });
    const manager = createAudioManager(harness.options);
    manager.syncMusic(createState(PHASE.MENU));
    await Promise.resolve();

    manager.arm();
    await Promise.resolve();

    expect(harness.audios[0].playCalls).toBe(2);
    expect(harness.audios[0].played).toBe(true);
  });

  it("crossfades between menu and alternating run loops over one second", () => {
    const harness = createHarness();
    const manager = createAudioManager(harness.options);
    manager.syncMusic(createState(PHASE.MENU));
    manager.update(0.5, fullVolume);
    expect(harness.audios[0].volume).toBeCloseTo(0.5);

    manager.syncMusic(createState(PHASE.RUNNING));
    manager.update(0.5, fullVolume);
    expect(harness.audios[0].volume).toBeCloseTo(0.5);
    expect(harness.audios[1].volume).toBeCloseTo(0.5);
    manager.update(0.5, fullVolume);
    expect(harness.audios[0].paused).toBe(true);
    expect(harness.audios[1].volume).toBe(1);
  });

  it("routes UI samples and synthesized effects through the effects level", () => {
    const harness = createHarness();
    const manager = createAudioManager(harness.options);
    const settings = { masterVolume: 0.5, musicVolume: 1, sfxVolume: 0.4 };
    manager.playEvents([{ type: "shot", owner: "player", count: 1 }, { type: "reload" }], settings);
    manager.playUi("purchase", settings);

    expect(harness.synthVolume).toBeCloseTo(0.2);
    expect(harness.audios).toHaveLength(2);
    expect(harness.audios.every((audio) => audio.volume === 0.2 && audio.played)).toBe(true);
  });

  it("retries run music when its first unlocked play attempt is rejected", async () => {
    const harness = createHarness({ rejectRunOnce: true });
    const manager = createAudioManager(harness.options);
    manager.syncMusic(createState(PHASE.MENU));
    manager.arm();
    manager.syncMusic(createState(PHASE.RUNNING));
    await Promise.resolve();

    manager.update(0.6, fullVolume);
    await Promise.resolve();

    expect(harness.audios[1].playCalls).toBe(2);
    expect(harness.audios[1].played).toBe(true);
  });

  it("selects phase-appropriate menu, run, and winning music", () => {
    expect(getMusicTrackKey(createState(PHASE.MENU))).toBe("menu");
    expect(getMusicTrackKey(createState(PHASE.RUNNING), null, () => "run2")).toBe("run2");
    expect(getMusicTrackKey(createState(PHASE.PAUSED), "run1")).toBe("run1");
    expect(getMusicTrackKey(createState(PHASE.SHOP))).toBe("winning");
    expect(getMusicTrackKey(createState(PHASE.SHOP, true))).toBe("menu");
    expect(getMusicTrackKey(createState(PHASE.VICTORY))).toBe(null);
  });
});

describe("audio settings", () => {
  it("migrates legacy volume and clamps persisted values", () => {
    expect(normalizeAudioSettings({ volume: 0.45 }).masterVolume).toBe(0.45);
    expect(updateAudioSetting({}, "musicVolume", 2).musicVolume).toBe(1);
    expect(getAudioLevels({ masterVolume: 0.5, musicVolume: 0.4, sfxVolume: 0.8 })).toEqual({ music: 0.2, sfx: 0.4 });
  });
});

function createState(phase, failed = false) {
  return { phase, save: { achievements: {} }, lastSummary: phase === PHASE.SHOP ? { failed } : null };
}

function createHarness(options = {}) {
  const harness = { audios: [], synthVolume: null };
  harness.options = {
    createAudio(url) {
      const audio = createHarnessAudio(url, options);
      harness.audios.push(audio);
      return audio;
    },
    synth: { arm() {}, play(_events, volume) { harness.synthVolume = volume; } },
  };
  return harness;
}

function createHarnessAudio(url, options) {
  const rejectRun = options.rejectRunOnce && url.includes("game-loop-run");
  const rejectMenu = options.rejectMenuOnce && url.includes("game-loop-menu-ui");
  const rejectOnce = rejectRun || rejectMenu;
  return {
    url, volume: 0, loop: false, paused: false, played: false, playCalls: 0,
    play() {
      this.playCalls += 1;
      return resolveHarnessPlay(this, rejectOnce);
    },
    pause() { this.paused = true; },
  };
}

function resolveHarnessPlay(audio, rejectOnce) {
  if (rejectOnce && audio.playCalls === 1) return Promise.reject(new Error("blocked"));
  audio.played = true;
  return Promise.resolve();
}
