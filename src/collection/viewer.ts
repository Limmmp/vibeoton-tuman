import { AmbientLight, Box3, Color, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer, type Object3D } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { disposeModel, loadLandmark } from "../models/assets";
import type { Landmark } from "../models/catalog";

export function createViewer(container: HTMLElement) {
  const renderer = new WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  container.append(renderer.domElement);
  const scene = new Scene(); scene.background = null;
  scene.add(new AmbientLight(new Color("#d8e9f0"), 2));
  const light = new DirectionalLight(0xffffff, 3); light.position.set(2, 4, 3); scene.add(light);
  const camera = new PerspectiveCamera(40, 1, 0.01, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false; controls.minDistance = 0.25; controls.maxDistance = 8;
  let object: Object3D | undefined, generation = 0, disposed = false;
  const draw = () => { if (!disposed && !document.hidden) renderer.render(scene, camera); };
  controls.addEventListener("change", draw);
  const resize = new ResizeObserver(() => {
    const width = container.clientWidth, height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); draw();
  });
  resize.observe(container);
  document.addEventListener("visibilitychange", draw);
  const reset = () => {
    const center = object ? new Box3().setFromObject(object).getCenter(new Vector3()) : new Vector3(0, 0.4, 0);
    controls.target.copy(center); camera.position.copy(center).add(new Vector3(1.8, 1.1, 1.8)); controls.update(); draw();
  };
  return {
    async show(item: Landmark) {
      const token = ++generation;
      if (object) { scene.remove(object); disposeModel(object); object = undefined; draw(); }
      const loaded = await loadLandmark(item);
      if (disposed || token !== generation) { disposeModel(loaded.object); return null; }
      object = loaded.object; scene.add(object); reset(); return loaded;
    },
    reset,
    dispose() {
      disposed = true; generation++; resize.disconnect(); controls.dispose();
      document.removeEventListener("visibilitychange", draw);
      if (object) disposeModel(object);
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
