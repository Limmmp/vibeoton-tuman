import manifest from "../../public/models/landmarks/manifest.json";

export type Landmark = {
  id: string; name: string; model: string; kind: string; lat: number; lon: number;
  mapSizeMeters: number; rotationDegrees: number; altitudeMeters: number; source: string; verified: boolean; notes: string;
};
export const LANDMARKS: Landmark[] = manifest;
export function modelUrl(item: Landmark): string {
  const url = new URL(`${import.meta.env.BASE_URL}models/landmarks/${item.model}`, location.href);
  const version = new URLSearchParams(location.search).get("v"); if (version) url.searchParams.set("v", version);
  return url.href;
}
