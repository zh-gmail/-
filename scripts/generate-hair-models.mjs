/**
 * 3D 发型模型生成器 — v2
 *
 * 使用 Three.js LatheGeometry 生成三种发型的 GLB 文件：
 * - short-hair: 干练短发
 * - long-hair:  披肩长发
 * - bob-hair:   经典波波头
 *
 * 特点：多层几何体叠加、有机细节、PBR 材质
 *
 * 运行: node scripts/generate-hair-models.mjs
 */

// --- Polyfill FileReader for Node.js ---
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    constructor() { this.result = null; }
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(buf => {
        this.result = buf;
        this.onloadend && this.onloadend();
      });
    }
  };
}

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../public/assets/hairstyles');
const SEGMENTS = 48; // Higher = smoother curves

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── Materials ────────────────────────────────────────────────────────────────

function createHairMaterial(color, roughness = 0.8, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    side: THREE.DoubleSide,
    flatShading: false,
  });
}

// ─── Geometry utilities ───────────────────────────────────────────────────────

/**
 * Create a stylized hair mesh using LatheGeometry.
 * @param {THREE.Vector2[]} profile  — 2D profile points (x=radius, y=height)
 * @param {number} segments          — radial segments
 * @returns {THREE.BufferGeometry}
 */
function latheHair(profile, segments = SEGMENTS) {
  return new THREE.LatheGeometry(profile, segments);
}

/**
 * Add small hair-like tufts around a region to break up the smooth surface.
 */
function addTufts(group, count, radiusRange, yRange, scaleRange, mat) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
    const y = yRange[0] + Math.random() * (yRange[1] - yRange[0]);
    const s = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
    const tuft = new THREE.Mesh(
      new THREE.SphereGeometry(s * 0.5, 5, 4),
      mat
    );
    tuft.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
    tuft.scale.set(1, 0.6 + Math.random() * 0.8, 1);
    // Random slight rotation
    tuft.rotation.set(
      (Math.random() - 0.5) * 0.3,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.3
    );
    group.add(tuft);
  }
}

// ─── Hairstyle generators ─────────────────────────────────────────────────────

/**
 * 短发 — short, textured crop
 * Layers: inner dome + outer shell, subtle spikes
 */
function createShortHair() {
  const group = new THREE.Group();
  const baseColor = 0x2a1a0a;
  const mat = createHairMaterial(baseColor);

  // Inner layer — tight to the head
  const innerProfile = [
    new THREE.Vector2(0, 0.20),
    new THREE.Vector2(0.02, 0.198),
    new THREE.Vector2(0.05, 0.19),
    new THREE.Vector2(0.08, 0.175),
    new THREE.Vector2(0.11, 0.155),
    new THREE.Vector2(0.14, 0.125),
    new THREE.Vector2(0.16, 0.09),
    new THREE.Vector2(0.175, 0.05),
    new THREE.Vector2(0.18, 0.01),
    new THREE.Vector2(0.18, -0.03),
    new THREE.Vector2(0.17, -0.07),
    new THREE.Vector2(0.15, -0.10),
    new THREE.Vector2(0.12, -0.11),
    new THREE.Vector2(0.08, -0.11),
    new THREE.Vector2(0.04, -0.10),
    new THREE.Vector2(0, -0.09),
  ];
  const innerGeo = latheHair(innerProfile);
  const innerMesh = new THREE.Mesh(innerGeo, mat);
  group.add(innerMesh);

  // Outer shell — slightly larger, spiky silhouette
  const outerMat = createHairMaterial(baseColor, 0.9, 0.0);
  const outerProfile = innerProfile.map(
    p => new THREE.Vector2(p.x * 1.08, p.y * 1.04 + 0.01)
  );
  const outerGeo = latheHair(outerProfile);
  const outerMesh = new THREE.Mesh(outerGeo, outerMat);
  group.add(outerMesh);

  // Surface tufts for texture
  addTufts(group, 30, [0.06, 0.16], [0.02, 0.16], [0.008, 0.018], mat);

  return group;
}

/**
 * 长发 — long flowing hair reaching shoulders
 * Main body + back strands + slight wave
 */
function createLongHair() {
  const group = new THREE.Group();
  const baseColor = 0x1a0e05;
  const mat = createHairMaterial(baseColor);

  // Main body — smooth long profile
  const mainProfile = [
    new THREE.Vector2(0, 0.26),
    new THREE.Vector2(0.025, 0.255),
    new THREE.Vector2(0.05, 0.24),
    new THREE.Vector2(0.08, 0.22),
    new THREE.Vector2(0.10, 0.20),
    new THREE.Vector2(0.13, 0.17),
    new THREE.Vector2(0.15, 0.13),
    new THREE.Vector2(0.17, 0.08),
    new THREE.Vector2(0.18, 0.03),
    new THREE.Vector2(0.18, -0.02),
    new THREE.Vector2(0.17, -0.07),
    new THREE.Vector2(0.165, -0.12),
    new THREE.Vector2(0.16, -0.17),
    new THREE.Vector2(0.15, -0.22),
    new THREE.Vector2(0.14, -0.28),
    new THREE.Vector2(0.13, -0.34),
    new THREE.Vector2(0.11, -0.40),
    new THREE.Vector2(0.09, -0.44),
    new THREE.Vector2(0.06, -0.47),
    new THREE.Vector2(0.03, -0.48),
    new THREE.Vector2(0, -0.48),
  ];
  const mainGeo = latheHair(mainProfile);
  const mainMesh = new THREE.Mesh(mainGeo, mat);
  group.add(mainMesh);

  // Slightly lighter outer layer
  const outerMat = createHairMaterial(0x221105, 0.75, 0.02);
  const outerProfile = mainProfile.map(
    p => new THREE.Vector2(p.x * 1.06, p.y * 1.01)
  );
  const outerGeo = latheHair(outerProfile);
  const outerMesh = new THREE.Mesh(outerGeo, outerMat);
  group.add(outerMesh);

  // Back strands — fine cylinder strands at the back
  const strandMat = createHairMaterial(0x1a0e05, 0.7, 0.0);
  for (let i = 0; i < 18; i++) {
    const t = (i / 17) * Math.PI - Math.PI / 2; // -90° to +90°
    const spread = 0.04 + Math.random() * 0.10;
    const len = 0.08 + Math.random() * 0.14;
    const strand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.002, len, 4, 1),
      strandMat
    );
    strand.position.set(
      Math.sin(t) * spread * 0.5,
      -0.28 - Math.random() * 0.16,
      -(0.14 + Math.cos(t) * spread * 0.3)
    );
    strand.rotation.x = -0.1 + Math.random() * 0.3;
    strand.rotation.z = (Math.random() - 0.5) * 0.2;
    group.add(strand);
  }

  return group;
}

/**
 * 波波头 — classic bob, wider at sides, chin-length
 */
function createBobHair() {
  const group = new THREE.Group();
  const baseColor = 0x221105;
  const mat = createHairMaterial(baseColor);

  // Main bob shape — wider sides, flat bottom
  const mainProfile = [
    new THREE.Vector2(0, 0.24),
    new THREE.Vector2(0.03, 0.235),
    new THREE.Vector2(0.06, 0.225),
    new THREE.Vector2(0.09, 0.21),
    new THREE.Vector2(0.12, 0.19),
    new THREE.Vector2(0.15, 0.16),
    new THREE.Vector2(0.18, 0.12),
    new THREE.Vector2(0.20, 0.07),
    new THREE.Vector2(0.21, 0.02),
    new THREE.Vector2(0.22, -0.02),
    new THREE.Vector2(0.22, -0.06),
    new THREE.Vector2(0.23, -0.10),
    new THREE.Vector2(0.24, -0.14),
    new THREE.Vector2(0.24, -0.18),
    new THREE.Vector2(0.235, -0.22),
    new THREE.Vector2(0.22, -0.25),
    new THREE.Vector2(0.20, -0.27),
    new THREE.Vector2(0.17, -0.28),
    new THREE.Vector2(0.12, -0.28),
    new THREE.Vector2(0.06, -0.27),
    new THREE.Vector2(0, -0.26),
  ];
  const mainGeo = latheHair(mainProfile);
  const mainMesh = new THREE.Mesh(mainGeo, mat);
  group.add(mainMesh);

  // Slightly smaller inner layer for depth
  const innerMat = createHairMaterial(0x1a0a05, 0.85, 0.02);
  const innerProfile = mainProfile.map(
    p => new THREE.Vector2(p.x * 0.96, p.y * 0.98)
  );
  const innerGeo = latheHair(innerProfile);
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  group.add(innerMesh);

  // Side volume tufts (bob is fuller at the sides)
  addTufts(group, 24, [0.15, 0.24], [-0.22, -0.04], [0.008, 0.016], mat);

  return group;
}

// ─── Export helper ────────────────────────────────────────────────────────────

async function exportGLB(name, scene) {
  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        const outputPath = path.join(OUTPUT_DIR, `${name}.glb`);
        fs.writeFileSync(outputPath, Buffer.from(result));
        const stats = fs.statSync(outputPath);
        console.log(`  ✅ ${name}.glb (${(stats.size / 1024).toFixed(1)} KB)`);
        resolve();
      },
      (error) => {
        console.error(`  ❌ ${name}:`, error);
        reject(error);
      },
      { binary: true, trs: false, onlyVisible: true }
    );
  });
}

function countTriangles(scene) {
  let tris = 0;
  scene.traverse(child => {
    if (child.isMesh && child.geometry) {
      const idx = child.geometry.index;
      if (idx) tris += idx.count / 3;
    }
  });
  return tris;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🧑 生成 3D 发型 GLB 模型 v2\n');

  console.log('1. 短发 (short-hair)');
  const shortScene = new THREE.Scene();
  shortScene.add(createShortHair());
  const shortTris = countTriangles(shortScene);
  await exportGLB('short-hair', shortScene);

  console.log('2. 长发 (long-hair)');
  const longScene = new THREE.Scene();
  longScene.add(createLongHair());
  const longTris = countTriangles(longScene);
  await exportGLB('long-hair', longScene);

  console.log('3. 波波头 (bob-hair)');
  const bobScene = new THREE.Scene();
  bobScene.add(createBobHair());
  const bobTris = countTriangles(bobScene);
  await exportGLB('bob-hair', bobScene);

  console.log(`\n📊 面数统计: short=${shortTris}, long=${longTris}, bob=${bobTris}`);
  console.log('✅ 所有发型模型生成完毕!');
}

main().catch(console.error);
