export function getReloadPose(effect) {
  if (!effect?.remaining || !effect.duration) return { rotationZ: 0, y: 0 };

  const elapsed = effect.duration - effect.remaining;
  const progress = Math.min(1, Math.max(0, elapsed / effect.duration));
  const cycle = Math.sin(progress * Math.PI * 6);
  const envelope = Math.sin(progress * Math.PI);
  return {
    rotationZ: cycle * 0.42 * envelope,
    y: -0.24 * envelope,
  };
}
