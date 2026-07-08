const SHOT_TONES = Object.freeze({
  player: { frequency: 520, duration: 0.045, gain: 0.055 },
  assistant: { frequency: 680, duration: 0.035, gain: 0.04 },
  enemy: { frequency: 180, duration: 0.07, gain: 0.045 },
  scoreLoss: { frequency: 120, duration: 0.12, gain: 0.07 },
});

export function createSfx() {
  let context;
  const getContext = () => {
    context = context ?? createContext();
    return context;
  };

  return {
    arm() {
      resumeContext(getContext());
    },
    play(events, volume = 0.7) {
      playEvents(getContext(), events, volume);
    },
  };
}

function createContext() {
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  return AudioContext ? new AudioContext() : null;
}

function resumeContext(context) {
  if (context?.state === "suspended") void context.resume();
}

function playEvents(context, events, volume) {
  if (!events.length || !context) return;

  resumeContext(context);
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
