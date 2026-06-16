import type { Object3D, WebGLRenderer, Scene, PerspectiveCamera } from 'three';
import { Color, Mesh } from 'three';
import type { MindARThree } from '../vendor/mindar-face-three.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { HairstyleAsset } from '../types';

export interface AREngineConfig {
  previewElement: HTMLElement;
}

export type FaceTrackingCallback = (detected: boolean) => void;

export interface AREngineInstance {
  init(config: AREngineConfig): Promise<void>;
  switchHairstyle(asset: HairstyleAsset): Promise<void>;
  setHairColor(hex: string): void;
  onFaceTracked(cb: FaceTrackingCallback): void;
  takeScreenshot(): Promise<string>;
  destroy(): void;
  isReady(): boolean;
}

const loader = new GLTFLoader();

class MindAREngine implements AREngineInstance {
  private mindarThree: MindARThree | null = null;
  private anchor: { group: Object3D } | null = null;
  private currentModel: Object3D | null = null;
  private ready = false;
  private faceCb: FaceTrackingCallback | null = null;
  private lastFaceDetected = false;
  private faceCheckTimer: ReturnType<typeof setInterval> | null = null;
  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;
  private camera: PerspectiveCamera | null = null;
  private containerEl: HTMLElement | null = null;
  private modelCleanupFns: Array<() => void> = [];
  private rafHandle: number | null = null;
  private renderLoop = (): void => {};
  private _loadVersion = 0;

  async init(config: AREngineConfig): Promise<void> {
    const containerEl = config.previewElement;
    this.containerEl = containerEl;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前浏览器不支持摄像头访问，请使用现代浏览器并允许摄像头权限');
    }

    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('webgl2');
    if (!gl) {
      testCanvas.remove();
      throw new Error('当前浏览器不支持 WebGL，无法运行 AR 引擎');
    }
    testCanvas.remove();

    // Dynamic import — 2.2MB model weights only load when user opens LiveCamera tab
    const { MindARThree: MindARThreeCtor } = await import('../vendor/mindar-face-three.js');
    this.mindarThree = new MindARThreeCtor({
      container: containerEl,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
    });

    this.scene = this.mindarThree.scene;
    this.camera = this.mindarThree.camera;
    this.renderer = this.mindarThree.renderer;
    this.renderer.setClearAlpha(0);

    this.anchor = this.mindarThree.addAnchor(10);

    await this.mindarThree.start();

    // _resize may not run reliably in StrictMode
    try { this.mindarThree._resize(); } catch (err) { console.warn('MindAR _resize failed (expected in StrictMode, next frame recovers):', err); }

    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.renderLoop = () => {
      if (!this.mindarThree || !this.renderer || !this.scene || !this.camera) return;
      this.renderer.render(this.scene, this.camera);
      this.mindarThree.cssRenderer.render(this.mindarThree.cssScene, this.camera);
      this.rafHandle = requestAnimationFrame(this.renderLoop);
    };
    this.rafHandle = requestAnimationFrame(this.renderLoop);

    this.faceCheckTimer = setInterval(() => {
      if (!this.mindarThree) return;
      const estimate = this.mindarThree.getLatestEstimate();
      const detected = estimate !== null;
      if (detected !== this.lastFaceDetected) {
        this.lastFaceDetected = detected;
        this.faceCb?.(detected);
      }
    }, 200);

    this.ready = true;
  }

  async switchHairstyle(asset: HairstyleAsset): Promise<void> {
    if (!this.anchor || !this.scene) return;
    if (!asset.effectUrl) return;

    const version = ++this._loadVersion;

    try {
      const gltf = await new Promise<GLTF | undefined>((resolve, reject) => {
        loader.load(asset.effectUrl, (model) => {
          if (version !== this._loadVersion) { resolve(undefined); return; }
          resolve(model);
        }, undefined, reject);
      });
      if (!gltf) return;

      this._removeCurrentModel();

      this.currentModel = gltf.scene;

      const s = asset.scale ?? [1, 1, 1];
      const p = asset.position ?? [0, 0.15, -0.02];
      this.currentModel.scale.set(s[0], s[1], s[2]);
      this.currentModel.position.set(p[0], p[1], p[2]);

      this.currentModel.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.computeBoundingSphere();
        }
      });

      this.anchor.group.add(this.currentModel);

      this.modelCleanupFns.push(() => {
        gltf.scene.traverse((child) => {
          if (child instanceof Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      });
    } catch (err) {
      console.error('Failed to load hairstyle model:', asset.effectUrl, err);
      throw err;
    }
  }

  setHairColor(hex: string): void {
    if (!this.currentModel) return;
    const color = new Color(hex);
    this.currentModel.traverse((child) => {
      if (child instanceof Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of materials) {
          if ('color' in mat && mat.color instanceof Color) mat.color.copy(color);
        }
      }
    });
  }

  onFaceTracked(cb: FaceTrackingCallback): void {
    this.faceCb = cb;
  }

  async takeScreenshot(): Promise<string> {
    const r = this.renderer;
    if (!r || !r.domElement) return '';

    // Composite: draw video frame first, then 3D rendering on top
    const w = r.domElement.width || 640;
    const h = r.domElement.height || 480;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return r.domElement.toDataURL('image/png');

    // Draw current video frame as background
    const video = this.containerEl?.querySelector('video');
    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(video, 0, 0, w, h);
    }

    // Overlay 3D render (transparent background from setClearAlpha(0))
    ctx.drawImage(r.domElement, 0, 0);

    return canvas.toDataURL('image/png');
  }

  destroy(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }

    if (this.faceCheckTimer) {
      clearInterval(this.faceCheckTimer);
      this.faceCheckTimer = null;
    }

    this._removeCurrentModel();

    if (this.mindarThree) {
      try { this.mindarThree.stop(); } catch (err) { console.warn('MindAR stop failed during destroy:', err); }
      this.mindarThree = null;
    }

    this.ready = false;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }

  isReady(): boolean {
    return this.ready;
  }

  private _removeCurrentModel(): void {
    if (this.currentModel && this.anchor) {
      this.anchor.group.remove(this.currentModel);
    }
    this.currentModel = null;
    for (const fn of this.modelCleanupFns) fn();
    this.modelCleanupFns = [];
  }
}

export function createAREngine(): AREngineInstance {
  return new MindAREngine();
}
