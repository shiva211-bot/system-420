import * as THREE from "three";
import type { LockConfig } from "./types";
import { makeDialIndex, makeTracePlate } from "./proceduralAssets";

export interface ProcessorInstance {
  group: THREE.Group;
  setDialAngle: (rad: number) => void;
  setSocketClamped: (clamped: boolean) => void;
  setLockUnlocked: (unlocked: boolean) => void;
  setUnfoldProgress: (t: number) => void;
  setAssemblyOpacity: (t: number) => void;
  dispose: () => void;
}

export function createCentralProcessor(_config: LockConfig): ProcessorInstance {
  const group = new THREE.Group();
  const plateTex = makeTracePlate();
  const dialTex = makeDialIndex();
  const baseGeo = new THREE.BoxGeometry(3.4, 3.4, 0.28);
  const baseMat = new THREE.MeshStandardMaterial({
    map: plateTex,
    color: 0xffffff,
    metalness: 0.55,
    roughness: 0.4,
    transparent: true,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  group.add(base);

  const clampGeo = new THREE.BoxGeometry(0.28, 1.6, 0.22);
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, metalness: 0.8, roughness: 0.25, transparent: true });
  const clamps: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(clampGeo, clampMat);
    c.rotation.z = (i * Math.PI) / 2;
    c.position.set(Math.cos((i * Math.PI) / 2) * 1.7, Math.sin((i * Math.PI) / 2) * 1.7, 0.28);
    group.add(c);
    clamps.push(c);
  }

  const dialGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.22, 48);
  const dialMat = new THREE.MeshStandardMaterial({
    map: dialTex,
    metalness: 0.7,
    roughness: 0.28,
    emissive: 0x155e75,
    emissiveIntensity: 0.35,
    transparent: true,
  });
  const dial = new THREE.Mesh(dialGeo, dialMat);
  dial.rotation.x = Math.PI / 2;
  dial.position.z = 0.38;
  group.add(dial);

  const mats = [baseMat, clampMat, dialMat];

  return {
    group,
    setDialAngle(rad) {
      dial.rotation.z = rad;
    },
    setSocketClamped(clamped) {
      clampMat.emissive = new THREE.Color(clamped ? 0x22d3ee : 0x000000);
      clampMat.emissiveIntensity = clamped ? 0.7 : 0;
    },
    setLockUnlocked(unlocked) {
      dialMat.emissiveIntensity = unlocked ? 1.2 : 0.35;
    },
    setUnfoldProgress(t) {
      clamps.forEach((c, i) => {
        const dir = new THREE.Vector3(Math.cos((i * Math.PI) / 2), Math.sin((i * Math.PI) / 2), 0);
        c.position.copy(dir.multiplyScalar(1.7 + t * 2.4));
        c.position.z = 0.28;
      });
      base.scale.setScalar(1 + t * 0.25);
    },
    setAssemblyOpacity(t) {
      mats.forEach((m) => {
        m.opacity = t;
        m.transparent = t < 1;
      });
    },
    dispose() {
      baseGeo.dispose();
      clampGeo.dispose();
      dialGeo.dispose();
      mats.forEach((m) => m.dispose());
      plateTex.dispose();
      dialTex.dispose();
    },
  };
}
