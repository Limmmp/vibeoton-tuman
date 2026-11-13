import { AmbientLight, Camera, DirectionalLight, Matrix4, Scene, Vector3, WebGLRenderer, type Object3D } from "three";
import { MercatorCoordinate, type Map as MLMap, type CustomLayerInterface, type CustomRenderMethodInput } from "maplibre-gl";
import { LANDMARKS, type Landmark } from "./catalog";
import { disposeModel, loadLandmark } from "./assets";

type Entry = { item: Landmark; scene: Scene; object: Object3D; placeholder: boolean };

/** At most four static models, available in 2D and 3D on balanced/high. No animation loop. */
export class LandmarkLayer implements CustomLayerInterface {
  id = "landmark-models";
  type = "custom" as const;
  renderingMode = "3d" as const;
  private map!: MLMap;
  private renderer!: WebGLRenderer;
  private camera = new Camera();
  private entries = new Map<string, Entry>();
  private requested = new Set<string>();
  private disposed = false;
  private visible: (item: Landmark) => boolean;
  private changed: () => void;

  constructor(visible: (item: Landmark) => boolean, changed: () => void) { this.visible = visible; this.changed = changed; }

  readyIds(): string[] { return [...this.entries.keys()]; }

  onAdd(map: MLMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.map = map;
    this.renderer = new WebGLRenderer({ canvas: map.getCanvas(), context: gl as WebGL2RenderingContext, antialias: false });
    this.renderer.autoClear = false;
  }

  render(_gl: WebGLRenderingContext | WebGL2RenderingContext, input: CustomRenderMethodInput) {
    const projection = new Matrix4().fromArray(input.defaultProjectionData.mainMatrix);
    for (const item of LANDMARKS) {
      if (!this.visible(item)) continue;
      if (!this.requested.has(item.id)) {
        this.requested.add(item.id);
        void loadLandmark(item).then(loaded => {
          if (this.disposed) { disposeModel(loaded.object); return; }
          const scene = new Scene(); scene.add(new AmbientLight(0xffffff, 2));
          const light = new DirectionalLight(0xffffff, 2); light.position.set(0, 2, 1); scene.add(light);
          scene.add(loaded.object); this.entries.set(item.id, { item, scene, object: loaded.object, placeholder: loaded.placeholder });
          this.changed();
          this.map.triggerRepaint();
        });
      }
      const entry = this.entries.get(item.id); if (!entry) continue;
      const altitude = (this.map.queryTerrainElevation([item.lon, item.lat]) ?? 0) + item.altitudeMeters;
      const origin = MercatorCoordinate.fromLngLat([item.lon, item.lat], altitude);
      const scale = origin.meterInMercatorCoordinateUnits() * item.mapSizeMeters;
      const transform = new Matrix4().makeTranslation(origin.x, origin.y, origin.z)
        .scale(new Vector3(scale, -scale, scale))
        .multiply(new Matrix4().makeRotationX(Math.PI / 2))
        .multiply(new Matrix4().makeRotationY(item.rotationDegrees * Math.PI / 180));
      this.camera.projectionMatrix.copy(projection).multiply(transform);
      this.renderer.resetState(); this.renderer.render(entry.scene, this.camera);
    }
    this.renderer.resetState();
  }

  onRemove() {
    this.disposed = true;
    for (const entry of this.entries.values()) disposeModel(entry.object);
    this.entries.clear(); this.renderer.dispose();
  }
}
