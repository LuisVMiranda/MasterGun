import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { findAssetDefinition } from "./assetManifest.js";

export function createAssetLibrary(options = {}) {
  const loader = options.loader ?? new GLTFLoader();
  const fallbackFactory = options.fallbackFactory ?? (() => null);
  const cache = new Map();
  const load = (id) => getCachedAsset(cache, id, loader, fallbackFactory);
  const instantiate = async (id) => instantiateAsset(await load(id), id, fallbackFactory);
  const clear = () => cache.clear();

  return Object.freeze({ load, instantiate, clear });
}

function getCachedAsset(cache, id, loader, fallbackFactory) {
  if (!cache.has(id)) cache.set(id, loadAsset(id, loader, fallbackFactory));
  return cache.get(id);
}

function instantiateAsset(asset, id, fallbackFactory) {
  return asset?.scene ? clone(asset.scene) : fallbackFactory(id);
}

function loadAsset(id, loader, fallbackFactory) {
  const definition = findAssetDefinition(id);
  if (!definition?.modelUrl) return { definition, scene: fallbackFactory(id), fallback: true };
  return loader.loadAsync(definition.modelUrl)
    .then((gltf) => ({ definition, scene: gltf.scene, animations: gltf.animations, fallback: false }))
    .catch(() => ({ definition, scene: fallbackFactory(id), animations: [], fallback: true }));
}
