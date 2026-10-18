import * as THREE from "three";

export interface MechanicalDoorsInstance {
  group: THREE.Group;
  setDoorOpenProgress: (t: number) => void;
  dispose: () => void;
}

export function createMechanicalDoors(): MechanicalDoorsInstance {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(7.2, 7.2, 0.28);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.28,
    emissive: 0x082f49,
    emissiveIntensity: 0.4,
  });
  const dirs = [
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
  ];
  const panels: THREE.Mesh[] = dirs.map((dir, i) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(dir.clone().multiplyScalar(3.2));
    mesh.position.z = 0.6;
    mesh.rotation.z = i < 2 ? 0 : Math.PI / 2;
    group.add(mesh);
    return mesh;
  });

  return {
    group,
    setDoorOpenProgress(t: number) {
      panels.forEach((mesh, i) => {
        mesh.position.copy(dirs[i].clone().multiplyScalar(3.2 + t * 9));
        mesh.position.z = 0.6;
      });
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
