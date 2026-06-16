/**
 * Generate simple GLB hair models for AR testing.
 * Run: npx tsx scripts/generate-hair-glb.ts
 */

import { Document, NodeIO, Scene } from '@gltf-transform/core';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

const OUT_DIR = resolve(import.meta.dirname, '../public/assets/hairstyles');

/** Build a box mesh positioned as part of a hairstyle */
function addBox(
  doc: Document,
  scene: Scene,
  name: string,
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  color: [number, number, number],
) {
  const hw = w / 2, hh = h / 2, hd = d / 2;

  const positions = new Float32Array([
    -hw, -hh,  hd,  hw, -hh,  hd,  hw,  hh,  hd, -hw,  hh,  hd,
     hw, -hh, -hd, -hw, -hh, -hd, -hw,  hh, -hd,  hw,  hh, -hd,
    -hw, -hh, -hd, -hw, -hh,  hd, -hw,  hh,  hd, -hw,  hh, -hd,
     hw, -hh,  hd,  hw, -hh, -hd,  hw,  hh, -hd,  hw,  hh,  hd,
    -hw,  hh,  hd,  hw,  hh,  hd,  hw,  hh, -hd, -hw,  hh, -hd,
    -hw, -hh, -hd,  hw, -hh, -hd,  hw, -hh,  hd, -hw, -hh,  hd,
  ]);

  const indices = new Uint16Array([
    0,1,2, 0,2,3, 4,5,6, 4,6,7,
    8,9,10, 8,10,11, 12,13,14, 12,14,15,
    16,17,18, 16,18,19, 20,21,22, 20,22,23,
  ]);

  const normals = new Float32Array([
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
    0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
    -1,0,0, -1,0,0, -1,0,0, -1,0,0,
    1,0,0, 1,0,0, 1,0,0, 1,0,0,
    0,1,0, 0,1,0, 0,1,0, 0,1,0,
    0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
  ]);

  const mat = doc.createMaterial(name + 'Mat')
    .setBaseColorFactor([...color, 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(0.9);

  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(positions))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(normals))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(indices))
    .setMaterial(mat);

  const mesh = doc.createMesh(name).addPrimitive(prim);
  const node = doc.createNode(name)
    .setTranslation([x, y, z])
    .setMesh(mesh);

  scene.addChild(node);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const io = new NodeIO();

  // --- Short Hair ---
  {
    const doc = new Document();
    doc.createBuffer(); // Required for GLB export
    const scene = doc.createScene('hair');
    const c: [number, number, number] = [0.16, 0.10, 0.06];
    addBox(doc, scene, 'top1', 0.26, 0.06, 0.26, 0, 0.10, 0, c);
    addBox(doc, scene, 'top2', 0.30, 0.06, 0.30, 0, 0.06, 0, c);
    addBox(doc, scene, 'top3', 0.34, 0.04, 0.34, 0, 0.02, 0, c);
    addBox(doc, scene, 'left', 0.04, 0.08, 0.20, -0.17, 0.00, 0, c);
    addBox(doc, scene, 'right', 0.04, 0.08, 0.20, 0.17, 0.00, 0, c);
    addBox(doc, scene, 'back', 0.24, 0.06, 0.04, 0, 0.02, -0.17, c);
    await io.write(resolve(OUT_DIR, 'short-hair.glb'), doc);
    console.log('✓ short-hair.glb');
  }

  // --- Long Hair ---
  {
    const doc = new Document();
    doc.createBuffer(); // Required for GLB export
    const scene = doc.createScene('hair');
    const c: [number, number, number] = [0.12, 0.06, 0.03];
    addBox(doc, scene, 'top1', 0.26, 0.06, 0.26, 0, 0.10, 0, c);
    addBox(doc, scene, 'top2', 0.30, 0.06, 0.30, 0, 0.06, 0, c);
    addBox(doc, scene, 'top3', 0.34, 0.04, 0.34, 0, 0.02, 0, c);
    addBox(doc, scene, 'left', 0.04, 0.22, 0.18, -0.16, -0.06, 0, c);
    addBox(doc, scene, 'right', 0.04, 0.22, 0.18, 0.16, -0.06, 0, c);
    addBox(doc, scene, 'left2', 0.04, 0.14, 0.10, -0.12, -0.01, 0.14, c);
    addBox(doc, scene, 'right2', 0.04, 0.14, 0.10, 0.12, -0.01, 0.14, c);
    addBox(doc, scene, 'back', 0.20, 0.20, 0.04, 0, -0.04, -0.18, c);
    addBox(doc, scene, 'back2', 0.14, 0.10, 0.04, 0, 0.04, -0.20, c);
    await io.write(resolve(OUT_DIR, 'long-hair.glb'), doc);
    console.log('✓ long-hair.glb');
  }

  // --- Bob Hair ---
  {
    const doc = new Document();
    doc.createBuffer(); // Required for GLB export
    const scene = doc.createScene('hair');
    const c: [number, number, number] = [0.20, 0.12, 0.08];
    addBox(doc, scene, 'top1', 0.26, 0.06, 0.26, 0, 0.10, 0, c);
    addBox(doc, scene, 'top2', 0.30, 0.06, 0.30, 0, 0.06, 0, c);
    addBox(doc, scene, 'top3', 0.34, 0.04, 0.34, 0, 0.02, 0, c);
    addBox(doc, scene, 'left', 0.04, 0.16, 0.20, -0.16, -0.02, 0, c);
    addBox(doc, scene, 'right', 0.04, 0.16, 0.20, 0.16, -0.02, 0, c);
    addBox(doc, scene, 'back', 0.24, 0.14, 0.04, 0, 0.00, -0.18, c);
    await io.write(resolve(OUT_DIR, 'bob-hair.glb'), doc);
    console.log('✓ bob-hair.glb');
  }

  console.log('\nDone! 3 hairstyles generated.');
}

main().catch(console.error);
