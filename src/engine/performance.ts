import { load, save } from "./storage.ts";

export const RENDER_QUALITIES = ["low", "balanced", "high"] as const;
export type RenderQuality = (typeof RENDER_QUALITIES)[number];

export type RenderProfile = {
  quality: RenderQuality;
  mobile: boolean;
  pixelRatio: number;
  fogMaxCanvas: number;
  fogScale: number;
  fogIntervalMs: number;
  buildingLimit: number;
  show3dBuildings: boolean;
  terrain: boolean;
  hillshade: boolean;
  pitch3d: number;
};

export function profileFor(quality: RenderQuality, mobile: boolean, devicePixelRatio = 1): RenderProfile {
  switch (quality) {
    case "low":
      return {
        quality, mobile,
        pixelRatio: Math.min(devicePixelRatio, 1),
        fogMaxCanvas: 960,
        fogScale: 1,
        fogIntervalMs: 330,
        buildingLimit: 0,
        show3dBuildings: false,
        terrain: false,
        hillshade: false,
        pitch3d: 40,
      };
    case "balanced":
      return {
        quality, mobile,
        pixelRatio: Math.min(devicePixelRatio, mobile ? 1.25 : 1.75),
        fogMaxCanvas: mobile ? 1024 : 1600,
        fogScale: mobile ? 1.15 : 1.35,
        fogIntervalMs: mobile ? 330 : 160,
        buildingLimit: mobile ? 1200 : 5000,
        show3dBuildings: true,
        terrain: true,
        hillshade: !mobile,
        pitch3d: mobile ? 45 : 55,
      };
    case "high":
      return {
        quality, mobile,
        pixelRatio: Math.min(devicePixelRatio, 2),
        fogMaxCanvas: 2048,
        fogScale: 1.6,
        fogIntervalMs: 120,
        buildingLimit: 8000,
        show3dBuildings: true,
        terrain: true,
        hillshade: true,
        pitch3d: 60,
      };
  }
}

export function saveRenderQuality(quality: RenderQuality) {
  save("render-quality", quality);
}

export function detectRenderProfile(): RenderProfile {
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const narrow = Math.min(window.innerWidth, window.innerHeight) <= 820;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const mobile = coarse || narrow || (memory != null && memory <= 4);
  const saved = load<RenderQuality | null>("render-quality", null);
  const quality = saved && (RENDER_QUALITIES as readonly string[]).includes(saved) ? saved : mobile ? "low" : "high";
  return profileFor(quality, mobile, window.devicePixelRatio || 1);
}
