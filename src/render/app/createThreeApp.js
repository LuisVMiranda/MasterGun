import * as THREE from "three";
import { COLORS } from "../../game/content/constants.js";

export function createThreeApp(host) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COLORS.sky, 46, 138);

  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 240);
  camera.position.set(0, 8.4, -13);
  camera.lookAt(0, 0, 18);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const disposeResize = bindResize(host, renderer, camera);
  bindContextEvents(renderer.domElement);
  addLights(scene, host);

  return {
    scene,
    camera,
    renderer,
    canvas: renderer.domElement,
    dispose() {
      disposeResize();
      renderer.dispose();
    },
  };
}

function bindResize(host, renderer, camera) {
  const resize = () => {
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    updateCameraForViewport(camera, width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return () => observer.disconnect();
}

function updateCameraForViewport(camera, width, height) {
  const aspect = width / height;
  const narrow = aspect < 0.82;
  const wide = aspect > 1.9;

  camera.fov = narrow ? 62 : wide ? 50 : 54;
  camera.position.y = narrow ? 9.4 : wide ? 8 : 8.4;
  camera.position.z = narrow ? -14.8 : wide ? -12.6 : -13;
}

function bindContextEvents(canvas) {
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    console.warn("WebGL context lost. The renderer will recover when the browser restores it.");
  });
}

function addLights(scene, host) {
  scene.add(new THREE.HemisphereLight("#dff8ff", "#4b5f76", 1.8));

  const sun = new THREE.DirectionalLight("#ffffff", 2.2);
  sun.position.set(-16, 26, -12);
  sun.target.position.set(0, 0, 24);
  sun.castShadow = true;
  const shadowMapSize = getShadowMapSize(host);
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 38;
  sun.shadow.camera.bottom = -18;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 2.2;
  scene.add(sun, sun.target);
}

function getShadowMapSize(host) {
  const width = host.getBoundingClientRect().width || window.innerWidth;
  return width >= 900 ? 2048 : 1024;
}
