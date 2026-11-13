export type RenderProfile = {
  mobile: boolean;
  pixelRatio: number;
  fogMaxCanvas: number;
  fogScale: number;
  fogIntervalMs: number;
  buildingLimit: number;
  pitch3d: number;
};

export function detectRenderProfile(): RenderProfile {
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const narrow = Math.min(window.innerWidth, window.innerHeight) <= 820;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const mobile = coarse || narrow || (memory != null && memory <= 4);
  return mobile
    ? {
        mobile: true,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        fogMaxCanvas: 1280,
        fogScale: 1.15,
        fogIntervalMs: 220,
        buildingLimit: 3000,
        pitch3d: 50,
      }
    : {
        mobile: false,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        fogMaxCanvas: 2048,
        fogScale: 1.6,
        fogIntervalMs: 120,
        buildingLimit: 8000,
        pitch3d: 60,
      };
}
