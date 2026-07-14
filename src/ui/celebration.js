export function renderFireworks(count = 12) {
  const sparks = Array.from({ length: count }, (_, index) => renderSpark(index)).join("");
  return `<div class="firework-field" aria-hidden="true">${sparks}</div>`;
}

function renderSpark(index) {
  const top = 10 + ((index * 3) % 5) * 18;
  const left = 8 + ((index * 5) % 7) * 14;
  return `<span style="--i:${index};--firework-top:${top}%;--firework-left:${left}%"></span>`;
}
