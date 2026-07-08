import * as THREE from "three";
import { COLORS } from "../../game/content/constants.js";

export function createThreeApp(host) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.sky, 46, 138);

  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 240);
  camera.position.set(0, 8.4, -13);
  camera.lookAt(0, 0, 18);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const disposeResize = bindResize(host, renderer, camera);
  bindContextEvents(renderer.domElement);
  addLights(scene);

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
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return () => observer.disconnect();
}

function bindContextEvents(canvas) {
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    console.warn("WebGL context lost. The renderer will recover when the browser restores it.");
  });
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight("#dff8ff", "#4b5f76", 1.8));

  const sun = new THREE.DirectionalLight("#ffffff", 2.2);
  sun.position.set(-5, 10, -4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
}
