export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start, end, amount) {
  return start + (end - start) * clamp(amount, 0, 1);
}

export function intersects(a, b) {
  return Math.abs(a.x - b.x) <= a.width + b.width && Math.abs(a.z - b.z) <= a.depth + b.depth;
}

export function choose(list, random) {
  return list[Math.floor(random() * list.length) % list.length];
}

export function formatCash(value) {
  return `$${Math.max(0, Math.floor(value)).toLocaleString("en-US")}`;
}
