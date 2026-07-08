import * as THREE from "three";

const LABEL_SCALE = 1.3;

export function createLabelSprite(text, options = {}) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = options.width ?? 768;
  const height = options.height ?? 256;
  canvas.width = width;
  canvas.height = height;

  drawLabel(context, text, width, height, options);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = options.renderOrder ?? 15;
  sprite.scale.set((options.scaleX ?? 2.2) * LABEL_SCALE, (options.scaleY ?? 0.82) * LABEL_SCALE, 1);
  sprite.userData.dispose = () => {
    texture.dispose();
    material.dispose();
  };
  return sprite;
}

function drawLabel(context, text, width, height, options) {
  const background = options.background ?? "#1b2640";
  const foreground = options.foreground ?? "#ffffff";
  const fontSize = Math.round((options.fontSize ?? 72) * LABEL_SCALE);
  context.clearRect(0, 0, width, height);
  context.fillStyle = background;
  roundRect(context, { x: 18, y: 18, width: width - 36, height: height - 36, radius: 36 });
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.55)";
  context.lineWidth = 10;
  context.stroke();
  context.fillStyle = foreground;
  context.font = `900 ${fontSize}px Roboto, Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, width / 2, height / 2, width - 78);
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
