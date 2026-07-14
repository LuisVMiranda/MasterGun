import * as THREE from "three";

const outlineMaterial = new THREE.MeshBasicMaterial({
  color: "#ffffff",
  depthWrite: false,
  opacity: 0.78,
  side: THREE.BackSide,
  transparent: true,
});

export function addMeshOutline(root, thickness = 0.035) {
  const outlines = [];

  root.traverse((child) => {
    if (!shouldOutline(child)) return;
    child.userData.hasOutline = true;
    outlines.push([child.parent, createOutlineHalo(child, thickness)]);
  });

  outlines.forEach(([parent, outline]) => parent?.add(outline));
  return root;
}

function shouldOutline(child) {
  if (!child.isMesh || child.userData.isOutline || child.userData.hasOutline) return false;
  if (child.userData.skipOutline) return false;
  if (!child.geometry || child.material?.depthTest === false) return false;
  if (isTransparent(child.material)) return false;
  return true;
}

function isTransparent(material) {
  const materials = Array.isArray(material) ? material : [material];
  return materials.some((item) => item?.transparent || item?.opacity < 1);
}

export function createOutlineHalo(mesh, thickness) {
  const outline = new THREE.Mesh(mesh.geometry, outlineMaterial);
  outline.position.copy(mesh.position);
  outline.quaternion.copy(mesh.quaternion);
  outline.scale.copy(mesh.scale).multiplyScalar(1 + thickness);
  outline.renderOrder = 18;
  outline.userData.isOutline = true;
  return outline;
}
