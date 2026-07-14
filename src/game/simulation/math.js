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
  return `$${formatCashAmount(value)}`;
}

export function formatCashAmount(value) {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  if (amount < 100000) return amount.toLocaleString("en-US");
  const thousands = Math.round(amount / 100) / 10;
  return `${thousands.toLocaleString("en-US", { maximumFractionDigits: 1 })}k`;
}
