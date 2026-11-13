import { Box3, BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Vector3, type Object3D, type Material, type Texture } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { modelUrl, type Landmark } from "./catalog";

export function placeholder(kind: string): Group {
  const group = new Group();
  const teal = new MeshStandardMaterial({ color: "#3fb8af", roughness: 0.9 });
  const gold = new MeshStandardMaterial({ color: "#f5b83d", roughness: 0.9 });
  const box = (x: number, y: number, z: number, px: number, py: number, pz: number, material = teal) => {
    const mesh = new Mesh(new BoxGeometry(x, y, z), material); mesh.position.set(px, py, pz); group.add(mesh);
  };
  if (kind === "lighthouse") {
    const tower = new Mesh(new CylinderGeometry(0.22, 0.35, 1.5, 10), teal); tower.position.y = 0.75; group.add(tower);
    box(0.55, 0.25, 0.55, 0, 1.6, 0, gold);
  } else if (kind === "bridge") {
    box(3, 0.12, 0.45, 0, 0.65, 0); for (const x of [-0.8, 0.8]) box(0.15, 1.3, 0.25, x, 0.65, 0, gold);
  } else if (kind === "submarine") {
    box(2.5, 0.4, 0.6, 0, 0.2, 0); box(0.45, 0.35, 0.35, 0, 0.55, 0, gold);
  } else {
    box(1.3, 0.12, 0.65, 0, 0.06, 0); box(0.9, 0.6, 0.5, 0, 0.4, 0, gold);
  }
  return group;
}

export function normalizeModel(object: Object3D): Object3D {
  const bounds = new Box3().setFromObject(object), size = bounds.getSize(new Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(longest) || longest <= 0) throw new Error("В модели нет видимой геометрии");
  const wrapper = new Group();
  object.position.sub(new Vector3((bounds.min.x + bounds.max.x) / 2, bounds.min.y, (bounds.min.z + bounds.max.z) / 2));
  wrapper.add(object); wrapper.scale.setScalar(1 / longest);
  return wrapper;
}

export async function loadLandmark(item: Landmark): Promise<{ object: Object3D; placeholder: boolean; message: string }> {
  try {
    const url = modelUrl(item);
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(response.status === 404 ? "GLB ещё не добавлен" : `HTTP ${response.status}`);
    const data = await response.arrayBuffer();
    if (data.byteLength > 20 * 1024 * 1024) throw new Error("Модель больше 20 МБ");
    const loaded = await new GLTFLoader().parseAsync(data, new URL(".", url).href);
    return { object: normalizeModel(loaded.scene), placeholder: false, message: "Модель загружена" };
  } catch (error) {
    return { object: normalizeModel(placeholder(item.kind)), placeholder: true, message: `Заглушка · ${(error as Error).message}` };
  }
}

export function disposeModel(object: Object3D) {
  const disposed = new Set<unknown>();
  const dispose = (value: { dispose(): void }) => { if (!disposed.has(value)) { disposed.add(value); value.dispose(); } };
  object.traverse(node => {
    const mesh = node as Mesh; if (!mesh.isMesh) return;
    dispose(mesh.geometry);
    for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[]) {
      for (const value of Object.values(material)) if ((value as Texture)?.isTexture) dispose(value as Texture);
      dispose(material);
    }
  });
}
