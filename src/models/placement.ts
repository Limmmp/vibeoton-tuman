export type LandmarkPlacement = { id: string; lat: number; lon: number; buildingClearanceMeters: number };

/** Test the footprint, including edges and holes, rather than just its first vertex. */
export function overlapsLandmark(rings: number[][][], item: LandmarkPlacement): boolean {
  const radius = item.buildingClearanceMeters;
  if (!(radius > 0) || !rings[0]?.length) return false;
  const xScale = 111320 * Math.cos(item.lat * Math.PI / 180), yScale = 111320;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [lon, lat] of rings[0]) {
    const x = (lon - item.lon) * xScale, y = (lat - item.lat) * yScale;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (minX > radius || maxX < -radius || minY > radius || maxY < -radius) return false;
  const inside = (ring: number[][]) => {
    let contained = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const ax = (ring[i][0] - item.lon) * xScale, ay = (ring[i][1] - item.lat) * yScale;
      const bx = (ring[j][0] - item.lon) * xScale, by = (ring[j][1] - item.lat) * yScale;
      if ((ay > 0) !== (by > 0) && 0 < (bx - ax) * (-ay) / (by - ay) + ax) contained = !contained;
    }
    return contained;
  };
  if (inside(rings[0]) && !rings.slice(1).some(inside)) return true;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ax = (ring[j][0] - item.lon) * xScale, ay = (ring[j][1] - item.lat) * yScale;
    const bx = (ring[i][0] - item.lon) * xScale, by = (ring[i][1] - item.lat) * yScale;
    const dx = bx - ax, dy = by - ay, denominator = dx * dx + dy * dy;
    const t = denominator ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denominator)) : 0;
    if ((ax + t * dx) ** 2 + (ay + t * dy) ** 2 <= radius * radius) return true;
  }
  return false;
}
