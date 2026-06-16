/**
 * 发型 3D 模型生成脚本
 *
 * 使用 Three.js 生成几何体数据 + @gltf-transform/core 写入 GLB 文件。
 * 运行: npx tsx scripts/generate-hair-models.ts
 *
 * 生成 3 个发型 GLB 到 public/assets/hairstyles/:
 *   - short-hair.glb  — 短发 (compact dome)
 *   - long-hair.glb   — 长发 (dome + ponytail)
 *   - bob-hair.glb    — 波波头 (wider dome with fuller sides)
 */

import type { BufferGeometry } from 'three';
import { CylinderGeometry } from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/assets/hairstyles');

// ─── helpers ─────────────────────────────────────────────────────────────────

function extractArrays(geo: BufferGeometry) {
  const pos = geo.getAttribute('position');
  const idx = geo.getIndex();
  if (!idx) throw new Error('Geometry must be indexed');
  return {
    positions: new Float32Array(pos.array),
    indices: new Uint32Array(idx.array),
  };
}

const io = new NodeIO();

async function writeGlb(
  filename: string,
  positions: Float32Array,
  indices: Uint32Array,
) {
  const doc = new Document();
  doc.createBuffer();

  const prim = doc.createPrimitive();

  const posAcc = doc
    .createAccessor('position')
    .setType('VEC3')
    .setArray(positions);

  const idxAcc = doc
    .createAccessor('indices')
    .setType('SCALAR')
    .setArray(indices);

  prim.setAttribute('POSITION', posAcc);
  prim.setIndices(idxAcc);

  // Approximate normals: normalize each vertex position
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    normals[i] = x / len;
    normals[i + 1] = y / len;
    normals[i + 2] = z / len;
  }
  const normalAcc = doc
    .createAccessor('normal')
    .setType('VEC3')
    .setArray(normals);

  prim.setAttribute('NORMAL', normalAcc);

  const mesh = doc.createMesh('hair');
  mesh.addPrimitive(prim);

  const node = doc.createNode('hair-root');
  node.setMesh(mesh);

  doc.createScene().addChild(node);

  await io.write(filename, doc);
}

// ─── geometry functions ──────────────────────────────────────────────────────

/**
 * Dense hemisphere (upper half of a sphere/ellipsoid) with closing bottom.
 * The bottom is closed with a triangle fan so the mesh is watertight.
 */
function createHemisphere(
  rx: number,
  ry: number,
  rz: number,
  seg: number,
): { positions: Float32Array; indices: Uint32Array } {
  // sectors around, rings up
  const sectors = seg;

  // Build vertex grid: (s + 1) columns × (r + 1) rows for the hemisphere surface
  // plus one center vertex at the bottom.
  const cols = sectors; // around
  const rows = Math.floor(seg / 2); // vertical
  // We'll generate vertices for the dome from top pole (v=0) to equator (v=1),
  // then a bottom ring at y = -height margin + the bottom center.

  const vertices: number[] = [];
  const indices: number[] = [];

  // Helper: map (row, col) to vertex index in the grid
  // Row 0 = top pole, row rows-1 = equator row
  // We'll then add the bottom ring and center explicitly.

  // --- Dome surface ---
  // Top pole (row 0, single vertex)
  vertices.push(0, ry, 0); // Top pole

  // Rows 1..rows: latitude rings
  for (let r = 1; r <= rows; r++) {
    const phi = (r / rows) * Math.PI * 0.5; // 0 at top, PI/2 at equator
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    for (let s = 0; s < cols; s++) {
      const theta = (s / cols) * Math.PI * 2;
      const x = rx * sinPhi * Math.cos(theta);
      const y = ry * cosPhi;
      const z = rz * sinPhi * Math.sin(theta);
      vertices.push(x, y, z);
    }
  }

  // --- Bottom closing (slightly below equator) ---
  // Bottom ring (one more row, slightly below y=0 for closure)
  const bottomY = -ry * 0.08; // just below equator
  const bottomRingStart = vertices.length / 3;
  for (let s = 0; s < cols; s++) {
    const theta = (s / cols) * Math.PI * 2;
    const x = rx * 1.02 * Math.cos(theta);
    const z = rz * 1.02 * Math.sin(theta);
    vertices.push(x, bottomY, z);
  }

  // Bottom center
  const bottomCenter = vertices.length / 3;
  vertices.push(0, bottomY - 0.02, 0);

  // --- Indices ---

  // Top pole to first ring: triangles from pole (idx 0) to ring 1 vertices
  // Ring 1 vertices are at indices 1..cols
  const ring1Start = 1;
  for (let s = 0; s < cols; s++) {
    const a = 0; // pole
    const b = ring1Start + s;
    const c = ring1Start + ((s + 1) % cols);
    indices.push(a, b, c);
  }

  // Between rings: r=1..rows-1
  for (let r = 1; r < rows; r++) {
    const curStart = 1 + (r - 1) * cols;
    const nextStart = 1 + r * cols;
    for (let s = 0; s < cols; s++) {
      const a = curStart + s;
      const b = curStart + ((s + 1) % cols);
      const c = nextStart + s;
      const d = nextStart + ((s + 1) % cols);
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  // Last ring (equator of dome, row `rows`) to bottom ring
  const lastRingStart = 1 + (rows - 1) * cols;
  for (let s = 0; s < cols; s++) {
    const a = lastRingStart + s;
    const b = lastRingStart + ((s + 1) % cols);
    const c = bottomRingStart + s;
    const d = bottomRingStart + ((s + 1) % cols);
    indices.push(a, b, c);
    indices.push(b, d, c);
  }

  // Bottom ring to center: fan
  for (let s = 0; s < cols; s++) {
    const a = bottomCenter;
    const b = bottomRingStart + ((s + 1) % cols);
    const c = bottomRingStart + s;
    indices.push(a, b, c);
  }

  return {
    positions: new Float32Array(vertices),
    indices: new Uint32Array(indices),
  };
}

/**
 * Create a closed tube/cylinder (for ponytail / long-hair extension).
 */
function createCylinder(
  radiusTop: number,
  radiusBot: number,
  height: number,
  seg: number,
): { positions: Float32Array; indices: Uint32Array } {
  const { positions: spherePos, indices: sphereIdx } = (() => {
    const geo = new CylinderGeometry(radiusTop, radiusBot, height, seg, 1, true);
    const arrays = extractArrays(geo);
    // Close top and bottom
    const pos: number[] = Array.from(arrays.positions);
    const idx: number[] = Array.from(arrays.indices);
    const vertCount = pos.length / 3;

    // Top center
    const topCenter = vertCount;
    pos.push(0, height / 2, 0);
    // Close top ring (first `seg` vertices after the start)
    for (let s = 0; s < seg; s++) {
      const a = topCenter;
      const b = s;
      const c = (s + 1) % seg;
      idx.push(a, c, b); // reversed winding for top cap
    }

    // Bottom center
    const botCenter = vertCount + 1;
    const botStart = seg; // second row of vertices
    pos.push(0, -height / 2, 0);
    for (let s = 0; s < seg; s++) {
      const a = botCenter;
      const b = botStart + s;
      const c = botStart + ((s + 1) % seg);
      idx.push(a, b, c);
    }

    return { positions: new Float32Array(pos), indices: new Uint32Array(idx) };
  })();
  return { positions: spherePos, indices: sphereIdx };
}

/**
 * Merge two indexed geometries.
 */
function mergeGeometries(
  a: { positions: Float32Array; indices: Uint32Array },
  b: { positions: Float32Array; indices: Uint32Array },
): { positions: Float32Array; indices: Uint32Array } {
  const aVertCount = a.positions.length / 3;
  const mergedPos = new Float32Array(a.positions.length + b.positions.length);
  mergedPos.set(a.positions, 0);
  mergedPos.set(b.positions, a.positions.length);

  const mergedIdx = new Uint32Array(a.indices.length + b.indices.length);
  mergedIdx.set(a.indices, 0);
  for (let i = 0; i < b.indices.length; i++) {
    mergedIdx[a.indices.length + i] = b.indices[i] + aVertCount;
  }

  return { positions: mergedPos, indices: mergedIdx };
}

// ─── hairstyle definitions ───────────────────────────────────────────────────

interface HairModel {
  filename: string;
  generate(): { positions: Float32Array; indices: Uint32Array };
}

const MODELS: HairModel[] = [
  {
    // 短发 — 宽扁 dome, 头顶
    filename: 'short-hair.glb',
    generate() {
      const dome = createHemisphere(0.28, 0.16, 0.26, 32);
      // Offset up from forehead anchor
      const pos = dome.positions;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += 0.10; // y offset
      }
      return dome;
    },
  },
  {
    // 长发 — dome + 马尾辫垂在后面
    filename: 'long-hair.glb',
    generate() {
      const dome = createHemisphere(0.24, 0.15, 0.26, 32);
      // Offset dome up
      for (let i = 0; i < dome.positions.length; i += 3) {
        dome.positions[i + 1] += 0.08;
      }

      // Ponytail — a slightly bent cylinder at the back
      const pony = createCylinder(0.06, 0.04, 0.18, 16);

      // Offset ponytail to back-bottom of dome
      for (let i = 0; i < pony.positions.length; i += 3) {
        pony.positions[i] += -0.05; // slight left offset
        pony.positions[i + 1] += -0.02; // below dome
        pony.positions[i + 2] += -0.22; // back of head
      }

      return mergeGeometries(dome, pony);
    },
  },
  {
    // 波波头 — wider dome, 侧面延长
    filename: 'bob-hair.glb',
    generate() {
      // Bob has a wider, more cylindrical shape
      const dome = createHemisphere(0.30, 0.18, 0.28, 32);
      // Offset up
      for (let i = 0; i < dome.positions.length; i += 3) {
        dome.positions[i + 1] += 0.08;
      }

      // Add a lower section that extends down around the sides
      const lower = createCylinder(0.28, 0.30, 0.10, 24);
      for (let i = 0; i < lower.positions.length; i += 3) {
        lower.positions[i + 1] += -0.04; // below dome
        // Slightly squash the front and extend the sides
        const x = lower.positions[i];
        const z = lower.positions[i + 2];
        // Distinguish sides vs front/back
        const angle = Math.atan2(z, x);
        const sideFactor = Math.abs(Math.sin(angle)); // 1 at sides, 0 at front/back
        lower.positions[i] *= (1 + 0.08 * sideFactor);
        lower.positions[i + 2] *= (1 + 0.08 * sideFactor);
      }

      return mergeGeometries(dome, lower);
    },
  },
];

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  for (const model of MODELS) {
    const { positions, indices } = model.generate();
    const outPath = resolve(OUT_DIR, model.filename);
    await writeGlb(outPath, positions, indices);
    const verts = positions.length / 3;
    const tris = indices.length / 3;
    const size = (positions.byteLength + indices.byteLength);
    console.log(`✅ ${model.filename}  —  ${verts} vertices, ${tris} triangles, ${(size / 1024).toFixed(1)} KB`);
  }
  console.log(`\n📁 输出目录: ${OUT_DIR}`);
}

main().catch(console.error);
