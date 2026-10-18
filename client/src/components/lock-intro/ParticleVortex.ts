import * as THREE from "three";

export interface ParticleVortexInstance {
  group: THREE.Group;
  update: (delta: number) => void;
  setDisintegrationProgress: (t: number) => void;
  setVortexProgress: (t: number) => void;
  setVoidActive: (active: boolean) => void;
  dispose: () => void;
}

export function createParticleVortex(count: number): ParticleVortexInstance {
  const group = new THREE.Group();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    seeds[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x67e8f9,
    size: 0.045,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  group.add(points);

  const voidGeo = new THREE.PlaneGeometry(2.2, 2.2);
  const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const voidSquare = new THREE.Mesh(voidGeo, voidMat);
  voidSquare.visible = false;
  voidSquare.position.z = 0.9;
  group.add(voidSquare);

  let disintegration = 0;
  let vortex = 0;
  let time = 0;

  return {
    group,
    update(delta) {
      time += delta;
      const attr = geo.getAttribute("position") as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const a = seeds[i] + time * (1.2 + vortex * 6);
        const r = (1 - vortex) * (2.8 + disintegration * 1.4) * (0.2 + (i % 17) / 17);
        const spiral = vortex * 4.5;
        arr[i * 3] = Math.cos(a) * r * (1 - vortex * 0.92);
        arr[i * 3 + 1] = Math.sin(a) * r * (1 - vortex * 0.92);
        arr[i * 3 + 2] = Math.sin(a * 1.7) * 0.4 - spiral * 0.08;
      }
      attr.needsUpdate = true;
      mat.opacity = Math.min(1, disintegration * 1.2 + vortex * 0.4);
      mat.size = 0.04 + vortex * 0.02;
    },
    setDisintegrationProgress(t) {
      disintegration = t;
    },
    setVortexProgress(t) {
      vortex = t;
    },
    setVoidActive(active) {
      voidSquare.visible = active;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      voidGeo.dispose();
      voidMat.dispose();
    },
  };
}
