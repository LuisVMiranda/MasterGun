const SHOT_TONES = Object.freeze({
  player: { frequency: 520, duration: 0.065, gain: 0.1 },
  soldier: { frequency: 680, duration: 0.035, gain: 0.035 },
  enemy: { frequency: 180, duration: 0.07, gain: 0.045 },
  scoreLoss: { frequency: 120, duration: 0.12, gain: 0.07 },
});

export function createSfx() {
  let context;
  let resumePromise;
  const getContext = () => {
    context = context ?? createContext();
    return context;
  };

  return {
    arm() {
      resumePromise = ensureContextReady(getContext(), resumePromise);
    },
    play(events, volume = 0.7) {
      resumePromise = playWhenReady(getContext(), events, volume, resumePromise);
    },
  };
}

function playWhenReady(context, events, volume, pending) {
  if (!events.length || !context) return pending;
  const ready = ensureContextReady(context, pending);
  if (!ready) playEvents(context, events, volume);
  else void ready.then(() => playEvents(context, events, volume));
  return ready;
}

function createContext() {
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  return AudioContext ? new AudioContext() : null;
}

function ensureContextReady(context, pending) {
  if (!context || context.state !== "suspended") return null;
  return pending ?? context.resume().catch(() => undefined);
}

function playEvents(context, events, volume) {
  events.forEach((event) => playEvent(context, event, volume));
}

function playEvent(context, event, volume) {
  if (!["shot", "scoreLoss"].includes(event.type)) return;

  const tone = event.type === "scoreLoss" ? SHOT_TONES.scoreLoss : SHOT_TONES[event.owner] ?? SHOT_TONES.player;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const level = tone.gain * volume * Math.min(1.35, 0.85 + event.count * 0.1);

  oscillator.type = event.owner === "enemy" || event.type === "scoreLoss" ? "sawtooth" : "square";
  oscillator.frequency.setValueAtTime(tone.frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(tone.frequency * 0.62, now + tone.duration);
  gain.gain.setValueAtTime(level, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + tone.duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + tone.duration);
}
