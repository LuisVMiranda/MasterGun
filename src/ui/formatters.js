export function formatScore(value) {
  const score = Math.max(0, Math.floor(Number(value) || 0));
  if (score < 1000) return String(score);

  const thousands = Math.round(score / 100) / 10;
  return `${thousands.toLocaleString("en-US", { maximumFractionDigits: 1 })}k`;
}
