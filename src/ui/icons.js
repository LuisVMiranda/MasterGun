const ICONS = Object.freeze({
  ammo: ["#ffcb3d", "M5 12h14v3H5z M7 7h10v5H7z"],
  assistants: ["#ffcf3a", "M8 10a4 4 0 1 1 8 0v6H8z M4 14h4v4H4z M16 14h4v4h-4z"],
  boss: ["#ff3451", "M4 9l4-4 4 4 4-4 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"],
  cash: ["#8eff2e", "M4 7h16v10H4z M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0z"],
  doubleWeapon: ["#29a8ff", "M6 5h4v14H6z M14 5h4v14h-4z"],
  enemy: ["#2e8dff", "M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16z M8 11h8v2H8z"],
  fireRate: ["#24e86b", "M13 2L5 13h6l-1 9 9-13h-6z"],
  info: ["#f7fbff", "M11 10h2v8h-2z M11 6h2v2h-2z M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"],
  power: ["#ff914d", "M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"],
  range: ["#f7fbff", "M12 3a9 9 0 1 0 9 9h-3a6 6 0 1 1-6-6z M12 8h9v3h-9z"],
  score: ["#ffcb3d", "M12 3l2.6 5.4 6 .9-4.3 4.1 1 5.9L12 15.5 6.7 18.3l1-5.9L3.4 8.3l6-.9z"],
  weapon: ["#c49bff", "M4 12h12v3h-4l-2 5H7l2-5H4z M16 10h4v5h-4z"],
});

export function icon(id, label = "") {
  const [color, path] = ICONS[id] ?? ICONS.info;
  return `
    <svg class="svg-icon" viewBox="0 0 24 24" role="img" aria-label="${label}">
      <path fill="${color}" d="${path}"></path>
    </svg>
  `;
}
