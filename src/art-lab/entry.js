import "./artLab.css";
import { createArtLabScene } from "./artLabScene.js";
import { ART_LAB_RENDER, readArtLabRenderStyle } from "./renderMode.js";

const VARIANTS = Object.freeze([
  { id: "showcase", label: "Turntable" },
  { id: "runway", label: "Runway" },
  { id: "stress", label: "Stress test" },
]);
const ASSET_IDS = Object.freeze(["all", "pistol", "shotgun", "machineGun", "rifle", "operator", "gate", "wall", "pickup"]);
const ANIMATION_IDS = Object.freeze(["idle", "aim", "forward", "backward", "left", "right", "fire", "reload"]);
const PICKUP_IDS = Object.freeze(["cash", "ammo", "power", "debuff"]);
const UNIT_IDS = Object.freeze(["runner", "sprinter", "shield", "brute", "shooter", "boss", "ironWarden", "arcDuelist", "triCannon", "skyTempest", "reclaimer"]);

const root = document.querySelector("#app");
const state = readState();
root.innerHTML = createMarkup(state);
document.body.classList.add("art-lab-body");

const sceneHost = root.querySelector("[data-art-canvas]");
const scene = createArtLabScene(sceneHost, state, renderMetrics);
bindControls(scene, state);
renderVariantLabel(state.variant);

function createMarkup(current) {
  return `
    <main class="art-lab" data-testid="art-lab">
      <header class="art-lab__header">
        <div>
          <p class="art-lab__eyebrow">VISUAL QA WORKBENCH</p>
          <h1>Master Gun Art Lab</h1>
          <p>Inspect live production assets or compare the optional low-detail prototypes.</p>
        </div>
        <a class="art-lab__exit" href="/" aria-label="Return to game">Return to game</a>
      </header>
      <section class="art-lab__workspace">
        <aside class="art-lab__controls" aria-label="Art lab controls">
          ${controlGroup("Render", renderStyleControl(current))}
          ${controlGroup("Asset", selectControl("asset", current.asset, ASSET_IDS))}
          ${controlGroup("Weapon", selectControl("weaponId", current.weaponId, ["pistol", "shotgun", "machineGun", "rifle"]))}
          ${controlGroup("Faction", segmentedControl("faction", current.faction, [["enemy", "Enemy"], ["soldier", "Soldier"]]))}
          ${controlGroup("Unit role", selectControl("unitKind", current.unitKind, UNIT_IDS))}
          ${controlGroup("Gate signal", segmentedControl("gateType", current.gateType, [["buff", "Buff"], ["debuff", "Debuff"]]))}
          ${controlGroup("Pickup contents", selectControl("pickupKind", current.pickupKind, PICKUP_IDS))}
          ${controlGroup("Damage", `<div class="art-lab__range"><input data-control="damage" type="range" min="0" max="100" value="${current.damage}" /><output data-damage-output>${current.damage}%</output></div>`)}
          ${controlGroup("Motion", selectControl("animation", current.animation, ANIMATION_IDS))}
          ${controlGroup("Quality", selectControl("quality", current.quality, ["mobile", "balanced", "high"]))}
          <label class="art-lab__toggle"><input data-control="turntable" type="checkbox" ${current.turntable ? "checked" : ""} /> Auto turntable</label>
          <label class="art-lab__toggle"><input data-control="thinProjectiles" type="checkbox" ${current.thinProjectiles ? "checked" : ""} /> Thin-projectile debuff</label>
          <button class="art-lab__fire" data-action="fire" type="button">Play projectile volley</button>
        </aside>
        <div class="art-lab__viewport" data-art-canvas>
          <div class="art-lab__canvas-label"><span data-variant-title></span><small>Drag to orbit · Wheel to zoom</small></div>
        </div>
        <aside class="art-lab__metrics" aria-label="Live renderer metrics">
          <p class="art-lab__eyebrow">LIVE BUDGET</p>
          ${metric("fps", "FPS", "--")}
          ${metric("frameMs", "Frame", "-- ms")}
          ${metric("calls", "Draw calls", "--")}
          ${metric("triangles", "Triangles", "--")}
          ${metric("geometries", "Geometries", "--")}
          ${metric("textures", "Textures", "--")}
          <div class="art-lab__budget-note">
            <strong>Target</strong>
            <span>≤140 desktop calls</span>
            <span>≤95 mobile calls</span>
            <span>≤16.7 ms desktop</span>
            <span>≤33.3 ms mobile</span>
          </div>
        </aside>
      </section>
      <nav class="prototype-switcher" aria-label="Prototype view">
        <button data-action="previous" type="button" aria-label="Previous view">←</button>
        <strong data-variant-label></strong>
        <button data-action="next" type="button" aria-label="Next view">→</button>
      </nav>
    </main>`;
}

function bindControls(scene, current) {
  root.addEventListener("input", (event) => handleControl(event.target, scene, current));
  root.addEventListener("change", (event) => handleControl(event.target, scene, current));
  root.addEventListener("click", (event) => handleAction(event.target.closest("[data-action]"), scene, current));
  window.addEventListener("keydown", (event) => handleKeyboard(event, scene, current));
}

function handleControl(target, scene, current) {
  const key = target.dataset.control;
  if (!key) return;
  const value = target.type === "checkbox" ? target.checked : target.value;
  current[key] = key === "damage" ? Number(value) : value;
  if (key === "damage") root.querySelector("[data-damage-output]").value = `${value}%`;
  if (key === "renderStyle") setUrlParam("render", current[key]);
  scene.setState({ [key]: current[key] });
  syncSegmentedState(key, current[key]);
}

function handleAction(target, scene, current) {
  if (!target) return;
  if (target.dataset.action === "fire") scene.fireVolley();
  if (["previous", "next"].includes(target.dataset.action)) cycleVariant(target.dataset.action === "next" ? 1 : -1, scene, current);
}

function handleKeyboard(event, scene, current) {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key) || isTypingTarget(event.target)) return;
  cycleVariant(event.key === "ArrowRight" ? 1 : -1, scene, current);
}

function cycleVariant(direction, scene, current) {
  const index = VARIANTS.findIndex((variant) => variant.id === current.variant);
  const next = VARIANTS[(index + direction + VARIANTS.length) % VARIANTS.length];
  current.variant = next.id;
  setUrlParam("variant", next.id);
  renderVariantLabel(next.id);
  scene.setState({ variant: next.id });
}

function renderVariantLabel(id) {
  const index = VARIANTS.findIndex((variant) => variant.id === id);
  const variant = VARIANTS[index] ?? VARIANTS[0];
  root.querySelector("[data-variant-label]").textContent = `${index + 1}/${VARIANTS.length} · ${variant.label}`;
  root.querySelector("[data-variant-title]").textContent = variant.label;
}

function renderMetrics(metrics) {
  setMetric("fps", Math.round(metrics.fps));
  setMetric("frameMs", `${metrics.frameMs.toFixed(1)} ms`);
  setMetric("calls", metrics.calls);
  setMetric("triangles", formatNumber(metrics.triangles));
  setMetric("geometries", metrics.geometries);
  setMetric("textures", metrics.textures);
}

function setMetric(id, value) {
  const element = root.querySelector(`[data-metric='${id}']`);
  if (element) element.textContent = value;
}

function renderStyleControl(current) {
  return segmentedControl("renderStyle", current.renderStyle, [
    [ART_LAB_RENDER.PRODUCTION, "Production"],
    [ART_LAB_RENDER.PROTOTYPE, "LOD prototype"],
  ]);
}

function segmentedControl(name, selected, options) {
  return `<div class="art-lab__segments">${options.map(([value, label]) => `<label class="${value === selected ? "is-selected" : ""}" data-segment="${name}:${value}"><input data-control="${name}" name="${name}" type="radio" value="${value}" ${value === selected ? "checked" : ""} />${label}</label>`).join("")}</div>`;
}

function selectControl(name, selected, options) {
  return `<select data-control="${name}">${options.map((option) => `<option value="${option}" ${option === selected ? "selected" : ""}>${formatLabel(option)}</option>`).join("")}</select>`;
}

function controlGroup(label, content) {
  return `<div class="art-lab__control"><span>${label}</span>${content}</div>`;
}

function metric(id, label, value) {
  return `<div class="art-lab__metric"><span>${label}</span><strong data-metric="${id}">${value}</strong></div>`;
}

function syncSegmentedState(name, value) {
  root.querySelectorAll(`[data-segment^='${name}:']`).forEach((label) => label.classList.toggle("is-selected", label.dataset.segment === `${name}:${value}`));
}

function readState() {
  const params = new URL(window.location.href).searchParams;
  return {
    variant: VARIANTS.some((item) => item.id === params.get("variant")) ? params.get("variant") : "showcase",
    renderStyle: readArtLabRenderStyle(params),
    asset: ASSET_IDS.includes(params.get("asset")) ? params.get("asset") : "all",
    weaponId: readChoice(params, "weapon", ["pistol", "shotgun", "machineGun", "rifle"], "pistol"),
    faction: "enemy",
    unitKind: readChoice(params, "unit", UNIT_IDS, "runner"),
    gateType: readChoice(params, "gate", ["buff", "debuff"], "buff"),
    pickupKind: readChoice(params, "pickup", PICKUP_IDS, "cash"),
    damage: readDamage(params),
    animation: readChoice(params, "animation", ANIMATION_IDS, "idle"),
    quality: window.innerWidth < 700 ? "mobile" : "balanced",
    turntable: false,
    thinProjectiles: false,
    paused: params.get("paused") === "1",
  };
}

function readChoice(params, key, choices, fallback) {
  const value = params.get(key);
  return choices.includes(value) ? value : fallback;
}

function readDamage(params) {
  const raw = params.get("damage");
  if (raw === null) return 48;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 48;
}

function setUrlParam(key, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState({}, "", url);
}

function isTypingTarget(target) {
  return ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
}

function formatLabel(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
}

function formatNumber(value) {
  return new Intl.NumberFormat("en", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}
