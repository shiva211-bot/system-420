import * as THREE from "three";

export interface WheelFieldInstance {
  group: THREE.Group;
  update: (delta: number, speed: number) => void;
  dispose: () => void;
}

export const WHEEL_FIELD_CONFIGS = [
  { id: "N", position: new THREE.Vector3(0, 6.4, -1.2), rotationZ: 0 },
  { id: "E", position: new THREE.Vector3(6.4, 0, -1.2), rotationZ: -Math.PI / 2 },
  { id: "S", position: new THREE.Vector3(0, -6.4, -1.2), rotationZ: Math.PI },
  { id: "W", position: new THREE.Vector3(-6.4, 0, -1.2), rotationZ: Math.PI / 2 },
];

export function createMechanicalWheelField(_id: string): WheelFieldInstance {
  const group = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(1.35, 0.08, 10, 48);
  const spokeGeo = new THREE.BoxGeometry(2.4, 0.07, 0.07);
  const hubGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.18, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.22,
    emissive: 0x164e63,
    emissiveIntensity: 0.25,
  });
  const ring = new THREE.Mesh(ringGeo, mat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const hub = new THREE.Mesh(hubGeo, mat);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(spokeGeo, mat);
    spoke.rotation.z = (i * Math.PI) / 8;
    group.add(spoke);
  }
  let spin = 0;
  return {
    group,
    update(delta, speed) {
      spin += delta * 1.4 * speed;
      group.rotation.y = spin;
    },
    dispose() {
      ringGeo.dispose();
      spokeGeo.dispose();
      hubGeo.dispose();
      mat.dispose();
    },
  };
}
