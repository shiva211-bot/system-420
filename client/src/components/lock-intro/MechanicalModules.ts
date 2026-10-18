import * as THREE from "three";
import { makeLetterBadge } from "./proceduralAssets";

export type LetterType = "L" | "O" | "C" | "K";

export interface ModuleInstance {
  group: THREE.Group;
  setTravelProgress: (t: number) => void;
  setDocked: (docked: boolean) => void;
  dispose: () => void;
}

const START: Record<LetterType, THREE.Vector3> = {
  L: new THREE.Vector3(-6.2, 4.6, 0.2),
  O: new THREE.Vector3(6.2, 4.6, 0.2),
  C: new THREE.Vector3(-6.2, -4.6, 0.2),
  K: new THREE.Vector3(6.2, -4.6, 0.2),
};

const DOCK: Record<LetterType, THREE.Vector3> = {
  L: new THREE.Vector3(-1.55, 1.15, 0.35),
  O: new THREE.Vector3(1.55, 1.15, 0.35),
  C: new THREE.Vector3(-1.55, -1.15, 0.35),
  K: new THREE.Vector3(1.55, -1.15, 0.35),
};

export function createTriangularModule(letter: LetterType, _idx: number): ModuleInstance {
  const group = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(1.05, 1.05, 1.05);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.7,
    roughness: 0.3,
    emissive: 0x083344,
    emissiveIntensity: 0.35,
  });
  const badge = makeLetterBadge(letter);
  const badgeMat = new THREE.MeshBasicMaterial({ map: badge });
  const offsets = [
    new THREE.Vector3(-0.38, 0.22, 0),
    new THREE.Vector3(0.38, 0.22, 0),
    new THREE.Vector3(0, -0.42, 0),
  ];
  offsets.forEach((off) => {
    const box = new THREE.Mesh(boxGeo, mat);
    box.scale.setScalar(0.42);
    box.position.copy(off);
    group.add(box);
  });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), badgeMat);
  plate.position.z = 0.55;
  group.add(plate);
  group.position.copy(START[letter]);

  return {
    group,
    setTravelProgress(t) {
      group.position.lerpVectors(START[letter], DOCK[letter], t);
      group.rotation.z = (1 - t) * 0.4;
    },
    setDocked(docked) {
      mat.emissiveIntensity = docked ? 0.9 : 0.35;
    },
    dispose() {
      boxGeo.dispose();
      mat.dispose();
      badge.dispose();
      badgeMat.dispose();
      (plate.geometry as THREE.BufferGeometry).dispose();
    },
  };
}
