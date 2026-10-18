import * as THREE from "three";

function canvasTex(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeLetterBadge(letter: string) {
  return canvasTex(256, (ctx, size) => {
    ctx.fillStyle = "#071018";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 16, size - 32, size - 32);
    ctx.fillStyle = "#e0f2fe";
    ctx.font = "bold 140px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, size / 2, size / 2 + 8);
  });
}

export function makeDialIndex() {
  return canvasTex(512, (ctx, size) => {
    ctx.fillStyle = "#0b1220";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#67e8f9";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 18, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const inner = i % 5 === 0 ? size / 2 - 70 : size / 2 - 42;
      ctx.strokeStyle = i % 5 === 0 ? "#e0f2fe" : "#22d3ee";
      ctx.lineWidth = i % 5 === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(size / 2 + Math.cos(a) * inner, size / 2 + Math.sin(a) * inner);
      ctx.lineTo(size / 2 + Math.cos(a) * (size / 2 - 24), size / 2 + Math.sin(a) * (size / 2 - 24));
      ctx.stroke();
    }
    ctx.fillStyle = "#22d3ee";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 28, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function makeTracePlate() {
  return canvasTex(512, (ctx, size) => {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#155e75";
    ctx.lineWidth = 2;
    for (let y = 24; y < size; y += 36) {
      ctx.beginPath();
      ctx.moveTo(12, y);
      ctx.lineTo(size - 12, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 18; i++) {
      const x = 40 + (i * 97) % (size - 80);
      ctx.strokeRect(x, 30 + (i * 41) % (size - 80), 48, 18);
    }
  });
}
