const ICONS = Object.freeze({
  arrowLeft: ["#f7fbff", "M14.5 5l-7 7 7 7 2-2-5-5 5-5z"],
  arrowRight: ["#f7fbff", "M9.5 5l7 7-7 7-2-2 5-5-5-5z"],
  ammo: ["#ffcb3d", "M5 12h14v3H5z M7 7h10v5H7z"],
  boss: ["#ff3451", "M4 9l4-4 4 4 4-4 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"],
  baseLife: ["#ff4d7a", "M12 21s-7.5-4.6-9.3-9.2C1.5 8.6 3.4 5 6.9 5c2 0 3.4 1.1 4.1 2.2C11.7 6.1 13.1 5 15.1 5c3.5 0 5.4 3.6 4.2 6.8C19.5 16.4 12 21 12 21z"],
  breachDamage: ["#ffd15a", "M5 4h14v4l-4 2 4 2v8H5v-6l4-2-4-2z M8 6v4l5-2-5-2z M16 14l-5 2 5 2z"],
  cash: ["#8eff2e", "M4 7h16v10H4z M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0z"],
  doubleWeapon: ["#29a8ff", "M6 5h4v14H6z M14 5h4v14h-4z"],
  enemy: ["#2e8dff", "M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16z M8 11h8v2H8z"],
  fireRate: ["#24e86b", "M13 2L5 13h6l-1 9 9-13h-6z"],
  info: ["#f7fbff", "M11 10h2v8h-2z M11 6h2v2h-2z M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"],
  life: ["#ff4d7a", "M12 21s-7.5-4.6-9.3-9.2C1.5 8.6 3.4 5 6.9 5c2 0 3.4 1.1 4.1 2.2C11.7 6.1 13.1 5 15.1 5c3.5 0 5.4 3.6 4.2 6.8C19.5 16.4 12 21 12 21z"],
  power: ["#ff914d", "M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"],
  range: ["#f7fbff", "M12 3a9 9 0 1 0 9 9h-3a6 6 0 1 1-6-6z M12 8h9v3h-9z"],
  score: ["#ffcb3d", "M12 3l2.6 5.4 6 .9-4.3 4.1 1 5.9L12 15.5 6.7 18.3l1-5.9L3.4 8.3l6-.9z"],
  sound: ["#77c9ff", "M4 9h4l5-4v14l-5-4H4z M16 8c1.2 1 1.8 2.3 1.8 4S17.2 15 16 16 M18.5 5.5c2 1.8 3 3.9 3 6.5s-1 4.7-3 6.5"],
  shieldDamage: ["#8fc7ff", "M12 3l7 3v5c0 4.4-2.8 7.4-7 9-4.2-1.6-7-4.6-7-9V6z M9 11h6v3H9z"],
  soldierTraining: ["#77c9ff", "M4 14h5v4H4z M15 14h5v4h-5z M8 8h8v6H8z M10 3h4v4h-4z"],
  soldiers: ["#249bff", "M8 10a4 4 0 1 1 8 0v6H8z M4 14h4v4H4z M16 14h4v4h-4z"],
  weapon: ["#c49bff", "M4 12h12v3h-4l-2 5H7l2-5H4z M16 10h4v5h-4z"],
  wallDamage: ["#c7d0df", "M4 5h16v14H4z M4 10h16M4 15h16M9 5v5M15 10v5M9 15v4"],
});

export function icon(id, label = "") {
  const [color, path] = ICONS[id] ?? ICONS.info;
  return `
    <svg class="svg-icon" viewBox="0 0 24 24" role="img" aria-label="${label}">
      <path fill="${color}" d="${path}"></path>
    </svg>
  `;
}
