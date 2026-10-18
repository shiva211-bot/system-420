import * as THREE from "three";

export interface DiamondFrameInstance {
  group: THREE.Group;
  dispose: () => void;
}

export function createDiamondFrame(): DiamondFrameInstance {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.08, 18, 0.08);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0e7490,
    emissiveIntensity: 0.6,
    metalness: 0.8,
    roughness: 0.25,
  });
  const extras: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(geo, mat);
    bar.rotation.z = Math.PI / 4 + (i * Math.PI) / 2;
    bar.position.z = -0.4;
    group.add(bar);
  }
  const ringGeo = new THREE.RingGeometry(8.6, 8.85, 4);
  extras.push(ringGeo);
  const ring = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({ color: 0x67e8f9, side: THREE.DoubleSide, transparent: true, opacity: 0.35 }),
  );
  ring.rotation.z = Math.PI / 4;
  group.add(ring);

  return {
    group,
    dispose() {
      geo.dispose();
      ringGeo.dispose();
      mat.dispose();
      (ring.material as THREE.Material).dispose();
    },
  };
}
