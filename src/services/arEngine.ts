import { MindARThree } from '../vendor/mindar-face-three.js';
import type { Object3D, WebGLRenderer, Scene, PerspectiveCamera } from 'three';
import { Color } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface AREngineConfig {
  licenseKey: string;
  previewElement: HTMLElement;
}

export interface HairstyleAsset {
  id: string;
  name: string;
  effectUrl: string;
  thumbnailUrl: string;
}

export type GestureCallback = (gesture: 'swipe_left' | 'swipe_right' | 'nod' | 'shake') => void;
export type FaceTrackingCallback = (detected: boolean) => void;

export interface AREngineInstance {
  init(config: AREngineConfig): Promise<void>;
  switchHairstyle(asset: HairstyleAsset): Promise<void>;
  setHairColor(hex: string): void;
  onGesture(cb: GestureCallback): void;
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
  private container: HTMLElement | null = null;
  private gestureCb: GestureCallback | null = null;
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
    // Capture container ref locally — StrictMode destroy() can null this.container
    // during await gaps, causing "Cannot read properties of null" in MindARThree.
    const containerEl = config.previewElement;

    // Quick pre-checks before MindAR starts
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前浏览器不支持摄像头访问，请使用现代浏览器并允许摄像头权限');
    }

    // Test WebGL availability
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('webgl2');
    if (!gl) {
      throw new Error('当前浏览器不支持 WebGL，无法运行 AR 引擎');
    }

    // Set instance ref only after all async pre-checks
    this.container = containerEl;

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

    // Start MindAR (camera + face tracking)
    await (this.mindarThree as any).start();

    // Force resize — MindAR's internal _resize may not run reliably in StrictMode
    try { (this.mindarThree as any)._resize(); } catch {}

    // Start Three.js render loop — MindAR does NOT auto-render
    this.renderLoop = () => {
      if (!this.mindarThree || !this.renderer || !this.scene || !this.camera) return;
      this.renderer.render(this.scene, this.camera);
      (this.mindarThree as any).cssRenderer?.render((this.mindarThree as any).cssScene, this.camera);
      this.rafHandle = requestAnimationFrame(this.renderLoop);
    };
    this.rafHandle = requestAnimationFrame(this.renderLoop);

    // Poll face detection and fire callback
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

    // Clean up previous model
    this._removeCurrentModel();

    if (!asset.effectUrl) return;

    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(asset.effectUrl, resolve, undefined, reject);
      });

      this.currentModel = gltf.scene;

      // Scale — generated test models are ~0.3–0.4 units; real models may need tuning
      this.currentModel.scale.set(1, 1, 1);

      // Offset upward from forehead anchor to sit on top of head
      this.currentModel.position.set(0, 0.15, -0.02);

      // Enable shadows / frustum culling
      this.currentModel.traverse((child: any) => {
        if (child.isMesh) {
          child.frustumCulled = false;
        }
      });

      this.anchor.group.add(this.currentModel);

      // Track cleanup for disposal
      this.modelCleanupFns.push(() => {
        gltf.scene.traverse((child: any) => {
          if (child.isMesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m: any) => m.dispose());
            } else {
              child.material?.dispose();
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
    this.currentModel.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mat = child.material;
        if (mat.color) mat.color.copy(color);
      }
    });
  }

  onGesture(cb: GestureCallback): void {
    this.gestureCb = cb;
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
      } catch {}
      this.mindarThree = null;
    }

    this.ready = false;
    this.container = null;
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

export function createAREngine(_licenseKey?: string): AREngineInstance {
  return new MindAREngine();
}
