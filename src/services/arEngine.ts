import { MindARThree } from '../vendor/mindar-face-three.js';
import type { Object3D, WebGLRenderer, Scene, PerspectiveCamera, Mesh } from 'three';
import { Color } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

export interface AREngineConfig {
  licenseKey: string;
  previewElement: HTMLElement;
}

export interface HairstyleAsset {
  id: string;
  name: string;
  effectUrl: string;
  thumbnailUrl: string;
  scale?: [number, number, number];
  position?: [number, number, number];
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
  private mindarThree: InstanceType<typeof MindARThree> | null = null;
  private anchor: any = null;
  private currentModel: Object3D | null = null;
  private ready = false;
  private faceCb: FaceTrackingCallback | null = null;
  private lastFaceDetected = false;
  private faceCheckTimer: ReturnType<typeof setInterval> | null = null;
  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;
  private camera: PerspectiveCamera | null = null;
  private modelCleanupFns: Array<() => void> = [];
  private rafHandle: number | null = null;
  private renderLoop = (): void => {};

  async init(config: AREngineConfig): Promise<void> {
    const containerEl = config.previewElement;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前浏览器不支持摄像头访问，请使用现代浏览器并允许摄像头权限');
    }

    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('webgl2');
    if (!gl) {
      throw new Error('当前浏览器不支持 WebGL，无法运行 AR 引擎');
    }

    this.mindarThree = new MindARThree({
      container: containerEl,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
    });

    this.scene = (this.mindarThree as any).scene as Scene;
    this.camera = (this.mindarThree as any).camera as PerspectiveCamera;
    this.renderer = (this.mindarThree as any).renderer as WebGLRenderer;
    // Transparent clear — camera video sits behind Three.js (z-index: -2 in MindAR)
    this.renderer.setClearAlpha(0);

    // Use anchor 10 (forehead top) — good for hair placement
    this.anchor = this.mindarThree.addAnchor(10);

    await (this.mindarThree as any).start();

    // Force resize — MindAR's internal _resize may not run reliably in StrictMode
    try { (this.mindarThree as any)._resize(); } catch { /* StrictMode: recovers next frame */ console.warn('MindAR _resize failed (harmless in StrictMode)'); }

    // Start Three.js render loop — MindAR does NOT auto-render
    this.renderLoop = () => {
      if (!this.mindarThree || !this.renderer || !this.scene || !this.camera) return;
      this.renderer.render(this.scene, this.camera);
      (this.mindarThree as any).cssRenderer?.render((this.mindarThree as any).cssScene, this.camera);
      this.rafHandle = requestAnimationFrame(this.renderLoop);
    };
    this.rafHandle = requestAnimationFrame(this.renderLoop);

    this.faceCheckTimer = setInterval(() => {
      if (!this.mindarThree) return;
      const estimate = (this.mindarThree as any).getLatestEstimate();
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

    try {
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        loader.load(asset.effectUrl, resolve, undefined, reject);
      });

      // Remove old model only after new one loads successfully
      this._removeCurrentModel();

      this.currentModel = gltf.scene;

      const s = asset.scale ?? [1, 1, 1];
      const p = asset.position ?? [0, 0.15, -0.02];
      this.currentModel.scale.set(s[0], s[1], s[2]);
      this.currentModel.position.set(p[0], p[1], p[2]);

      this.currentModel.traverse((child) => {
        if ((child as Mesh).isMesh) {
          (child as Mesh).frustumCulled = false;
        }
      });

      this.anchor.group.add(this.currentModel);

      this.modelCleanupFns.push(() => {
        gltf.scene.traverse((child) => {
          if ((child as Mesh).isMesh) {
            const mesh = child as Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
      });
    } catch (err) {
      console.error('Failed to load hairstyle model:', asset.effectUrl, err);
    }
  }

  setHairColor(hex: string): void {
    if (!this.currentModel) return;
    const color = new Color(hex);
    this.currentModel.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of materials) {
          if ('color' in mat) (mat.color as Color).copy(color);
        }
      }
    });
  }

  onFaceTracked(cb: FaceTrackingCallback): void {
    this.faceCb = cb;
  }

  async takeScreenshot(): Promise<string> {
    if (!this.renderer) return '';
    return (this.renderer as any).domElement.toDataURL('image/png');
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
      try {
        (this.mindarThree as any).stop();
      } catch { /* destroy: no recovery path */ console.warn('MindAR stop failed during destroy'); }
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
