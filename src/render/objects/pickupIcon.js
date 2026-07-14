import * as THREE from "three";
import { COLORS } from "../../game/content/constants.js";

const ICON_SIZE = 256;
const THEMES = {
  ammo: { background: COLORS.warning, foreground: "#172033" },
  buff: { background: COLORS.buff, foreground: "#062414" },
  cash: { background: COLORS.cash, foreground: "#102014" },
  weapon: { background: "#875cff", foreground: "#ffffff" },
};

export function createPickupIconSprite(kind = "buff") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  drawIcon(context, THEMES[kind] ?? THEMES.buff, kind);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 28;
  sprite.scale.set(0.72, 0.72, 1);
  sprite.userData.dispose = () => {
    texture.dispose();
    material.dispose();
  };
  return sprite;
}

export function animatePickupIcon(root, entity, elapsed) {
  const icon = root.userData.pickupIcon;
  if (!icon) return;

  const phase = (entity.id ?? 0) * 0.47;
  const bob = Math.sin(elapsed * 3.1 + phase) * 0.12;
  icon.sprite.position.y = icon.baseY + bob;
  icon.sprite.material.opacity = 0.88 + Math.sin(elapsed * 3.1 + phase) * 0.1;
}

function drawIcon(context, theme, kind) {
  drawBadge(context, theme);
  const drawers = { ammo: drawAmmo, cash: drawCash, weapon: drawWeapon, buff: drawBuff };
  drawers[kind]?.(context, theme);
}

function drawBadge(context, theme) {
  context.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  context.shadowColor = "rgba(0, 0, 0, 0.28)";
  context.shadowBlur = 18;
  context.fillStyle = theme.background;
  context.beginPath();
  context.arc(128, 128, 88, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 18;
  context.stroke();
}

function drawAmmo(context, theme) {
  context.fillStyle = theme.foreground;
  context.fillRect(74, 112, 92, 34);
  context.fillRect(166, 120, 18, 18);
  context.fillStyle = "#ffffff";
  context.fillRect(90, 120, 44, 8);
}

function drawCash(context, theme) {
  context.fillStyle = theme.foreground;
  roundRect(context, { x: 70, y: 92, width: 116, height: 74, radius: 14 });
  context.fill();
  context.fillStyle = theme.background;
  context.beginPath();
  context.arc(128, 129, 24, 0, Math.PI * 2);
  context.fill();
}

function drawWeapon(context, theme) {
  context.fillStyle = theme.foreground;
  context.fillRect(72, 106, 114, 20);
  context.fillRect(92, 126, 30, 46);
  context.fillRect(136, 126, 20, 26);
  context.fillStyle = COLORS.warning;
  context.fillRect(158, 96, 30, 12);
}

function drawBuff(context, theme) {
  context.fillStyle = theme.foreground;
  context.fillRect(114, 76, 28, 104);
  context.fillRect(76, 114, 104, 28);
}

function roundRect(context, rect) {
  const { x, y, width, height, radius } = rect;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}
