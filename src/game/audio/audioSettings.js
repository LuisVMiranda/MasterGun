export const AUDIO_DEFAULTS = Object.freeze({
  masterVolume: 0.7,
  musicVolume: 0.65,
  sfxVolume: 0.8,
});

export function normalizeAudioSettings(settings = {}) {
  const legacy = clampVolume(settings.volume ?? AUDIO_DEFAULTS.masterVolume);
  return {
    masterVolume: clampVolume(settings.masterVolume ?? legacy),
    musicVolume: clampVolume(settings.musicVolume ?? AUDIO_DEFAULTS.musicVolume),
    sfxVolume: clampVolume(settings.sfxVolume ?? AUDIO_DEFAULTS.sfxVolume),
  };
}

export function updateAudioSetting(settings, key, value) {
  if (!Object.hasOwn(AUDIO_DEFAULTS, key)) return settings;
  return { ...settings, [key]: clampVolume(value) };
}

export function getAudioLevels(settings) {
  const normalized = normalizeAudioSettings(settings);
  return {
    music: normalized.masterVolume * normalized.musicVolume,
    sfx: normalized.masterVolume * normalized.sfxVolume,
  };
}

function clampVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}
