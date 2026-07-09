const SPRITES = Object.freeze({
  pistol: [
    "M8 18h14v5h-6l-3 7H9l2-7H8z",
    "M22 16h14v4H22z",
  ],
  shotgun: [
    "M6 15h20v4H6z M6 21h20v4H6z",
    "M26 16h14v3H26z M26 22h14v3H26z M10 25h8l-3 7H9z",
  ],
  machineGun: [
    "M7 15h20v7H7z M27 17h13v3H27z",
    "M14 22h7v9h-7z M25 12h7v13h-7z",
  ],
  rifle: [
    "M6 17h18v4H6z M24 18h20v2H24z",
    "M13 12h10v4H13z M9 21h9l-4 8H8z",
  ],
});

export function weaponSprite(weaponId, label = weaponId) {
  const paths = SPRITES[weaponId] ?? SPRITES.pistol;
  return `
    <svg class="weapon-sprite" viewBox="0 0 48 36" role="img" aria-label="${label}">
      <path d="${paths[0]}" fill="#c49bff"></path>
      <path d="${paths[1]}" fill="#f5c542"></path>
    </svg>
  `;
}
