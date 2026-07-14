import { PHASE } from "../content/constants.js";
import { getAudioLevels } from "./audioSettings.js";
import { createSfx } from "./sfx.js";

const FADE_SECONDS = 1;
const PLAY_RETRY_SECONDS = 0.5;
const TRACK_URLS = Object.freeze({
  menu: new URL("./tracks/game-loop-menu-ui.mp3", import.meta.url).href,
  run1: new URL("./tracks/game-loop-run.mp3", import.meta.url).href,
  run2: new URL("./tracks/game-loop-run2.mp3", import.meta.url).href,
  winning: new URL("./tracks/game-loop-winning-ui.mp3", import.meta.url).href,
  rareBonus: new URL("./tracks/game-get-rare-bonus-effect.wav", import.meta.url).href,
  levelComplete: new URL("./tracks/game-level-completion-effect.wav", import.meta.url).href,
  menuOption: new URL("./tracks/game-menu-option-effect.mp3", import.meta.url).href,
  gameOver: new URL("./tracks/game-over-effect.mp3", import.meta.url).href,
  pickup: new URL("./tracks/game-pickup-effect.wav", import.meta.url).href,
  purchase: new URL("./tracks/game-purchase-effect.mp3", import.meta.url).href,
  reload: new URL("./tracks/game-reload-effect.mp3", import.meta.url).href,
  specialShot: new URL("./tracks/game-special-shot-effect.mp3", import.meta.url).href,
});

const EVENT_TRACKS = Object.freeze({ pickup: "pickup", rareBonus: "rareBonus", reload: "reload", specialShot: "specialShot" });

export function createAudioManager(options = {}) {
  const createAudio = options.createAudio ?? ((url) => new globalThis.Audio(url));
  const synth = options.synth ?? createSfx();
  let current = null;
  let outgoing = null;
  let fadeElapsed = FADE_SECONDS;
  let runVariant = 0;
  let unlocked = false;

  function syncMusic(state) {
    const key = getMusicTrackKey(state, current?.key, () => (++runVariant % 2 ? "run1" : "run2"));
    if (key === (current?.key ?? null)) return;
    pauseTrack(outgoing);
    outgoing = current;
    current = key ? createMusicTrack(createAudio, key) : null;
    fadeElapsed = 0;
    requestTrackPlay(current);
  }

  return {
    arm() {
      unlocked = true;
      synth.arm();
      requestTrackPlay(current);
    },
    syncMusic,
    update(dt, settings) {
      const level = getAudioLevels(settings).music;
      fadeElapsed = Math.min(FADE_SECONDS, fadeElapsed + Math.max(0, dt));
      const ratio = fadeElapsed / FADE_SECONDS;
      outgoing = updateMusicLevels(current, outgoing, level, ratio);
      retryTrackPlay(current, dt, unlocked);
    },
    playEvents(events, settings) {
      const level = getAudioLevels(settings).sfx;
      synth.play(events, level);
      events.forEach((event) => playSample(createAudio, EVENT_TRACKS[event.type], level));
    },
    playUi(key, settings) {
      playSample(createAudio, key, getAudioLevels(settings).sfx);
    },
    getCurrentMusicKey() {
      return current?.key ?? null;
    },
  };
}

function requestTrackPlay(track) {
  if (!track || track.playPending || (track.playing && !track.audio.paused)) return;
  track.playPending = true;
  let attempt;
  try {
    attempt = track.audio.play();
  } catch {
    markTrackBlocked(track);
    return;
  }
  Promise.resolve(attempt).then(
    () => markTrackPlaying(track),
    () => markTrackBlocked(track),
  );
}

function retryTrackPlay(track, dt, unlocked) {
  if (!unlocked || !track || track.playPending || track.playing) return;
  track.retryIn = Math.max(0, track.retryIn - Math.max(0, dt));
  if (track.retryIn === 0) requestTrackPlay(track);
}

function markTrackPlaying(track) {
  track.playPending = false;
  track.playing = true;
  track.retryIn = 0;
}

function markTrackBlocked(track) {
  track.playPending = false;
  track.playing = false;
  track.retryIn = PLAY_RETRY_SECONDS;
}

function pauseTrack(track) {
  if (!track) return;
  track.audio.pause();
  track.playing = false;
}

function updateMusicLevels(current, outgoing, level, ratio) {
  if (current) current.audio.volume = level * ratio;
  if (!outgoing) return null;
  outgoing.audio.volume = level * (1 - ratio);
  if (ratio < 1) return outgoing;
  pauseTrack(outgoing);
  return null;
}

export function getMusicTrackKey(state, currentKey = null, chooseRun = () => "run1") {
  if (state.phase === PHASE.VICTORY) return null;
  if (isUnseenWinner(state)) return "winning";
  if (isRunPhase(state.phase)) return getRunMusicKey(currentKey, chooseRun);
  return getUiMusicKey(state);
}

function isUnseenWinner(state) {
  return Boolean(state.save?.achievements?.gameWon && !state.save.achievements.gameWonSeen);
}

function isRunPhase(phase) {
  return phase === PHASE.RUNNING || phase === PHASE.PAUSED;
}

function getRunMusicKey(currentKey, chooseRun) {
  return currentKey?.startsWith("run") ? currentKey : chooseRun();
}

function getUiMusicKey(state) {
  if (state.phase !== PHASE.SHOP) return "menu";
  return state.lastSummary?.failed ? "menu" : "winning";
}

function createMusicTrack(createAudio, key) {
  const audio = createAudio(TRACK_URLS[key]);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0;
  return { key, audio, playPending: false, playing: false, retryIn: 0 };
}

function playSample(createAudio, key, volume) {
  if (!key || volume <= 0) return;
  const audio = createAudio(TRACK_URLS[key]);
  audio.volume = volume;
  void safePlay(audio);
}

async function safePlay(audio) {
  try {
    await audio.play();
  } catch {
    // Browser autoplay policy will allow playback after the first user gesture.
  }
}
