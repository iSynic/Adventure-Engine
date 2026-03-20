import type { WalkboxDefinition, Point, RoomDefinition } from "../core/types";

export interface WalkboxGraphWarning {
  type: "one-way-adjacency" | "no-portal" | "missing-walkbox";
  message: string;
  walkboxA: string;
  walkboxB?: string;
}

export function verifyWalkboxGraph(walkboxes: WalkboxDefinition[]): WalkboxGraphWarning[] {
  const warnings: WalkboxGraphWarning[] = [];
  const wbMap = new Map<string, WalkboxDefinition>(walkboxes.map((w) => [w.id, w]));

  for (const wb of walkboxes) {
    for (const adjId of wb.adjacentIds) {
      const adj = wbMap.get(adjId);
      if (!adj) {
        warnings.push({
          type: "missing-walkbox",
          message: `Walkbox "${wb.id}" references adjacent "${adjId}" which does not exist.`,
          walkboxA: wb.id,
          walkboxB: adjId,
        });
        continue;
      }
      if (!adj.adjacentIds.includes(wb.id)) {
        warnings.push({
          type: "one-way-adjacency",
          message: `Walkbox "${wb.id}" → "${adjId}" is one-way (B does not list A).`,
          walkboxA: wb.id,
          walkboxB: adjId,
        });
      }
      const portal = findPortalMidpoint(wb.polygon, adj.polygon);
      if (!portal) {
        warnings.push({
          type: "no-portal",
          message: `Walkbox "${wb.id}" ↔ "${adjId}" declared adjacent but no shared edge found.`,
          walkboxA: wb.id,
          walkboxB: adjId,
        });
      }
    }
  }

  return warnings;
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const { x, y } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonCentroid(polygon: Point[]): Point {
  let cx = 0, cy = 0;
  for (const p of polygon) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / polygon.length, y: cy / polygon.length };
}

export function closestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { ...a };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

export function insetPolygon(polygon: Point[], margin: number, edgeMargins?: number[]): Point[] {
  const n = polygon.length;
  if (n < 3 || margin <= 0) return polygon;

  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area2 += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
  }
  const inwardSign = area2 > 0 ? 1 : -1;

  const edgeNormals: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-10) {
      edgeNormals.push({ x: 0, y: 0 });
    } else {
      edgeNormals.push({
        x: inwardSign * -dy / len,
        y: inwardSign * dx / len,
      });
    }
  }

  const result: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prevEdge = (i - 1 + n) % n;
    const mPrev = edgeMargins ? edgeMargins[prevEdge] : margin;
    const mCurr = edgeMargins ? edgeMargins[i] : margin;

    const p1: Point = {
      x: polygon[prevEdge].x + mPrev * edgeNormals[prevEdge].x,
      y: polygon[prevEdge].y + mPrev * edgeNormals[prevEdge].y,
    };
    const d1: Point = {
      x: polygon[i].x - polygon[prevEdge].x,
      y: polygon[i].y - polygon[prevEdge].y,
    };

    const p2: Point = {
      x: polygon[i].x + mCurr * edgeNormals[i].x,
      y: polygon[i].y + mCurr * edgeNormals[i].y,
    };
    const d2: Point = {
      x: polygon[(i + 1) % n].x - polygon[i].x,
      y: polygon[(i + 1) % n].y - polygon[i].y,
    };

    const cross = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(cross) < 1e-10) {
      result.push(p2);
    } else {
      const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / cross;
      result.push({ x: p1.x + t * d1.x, y: p1.y + t * d1.y });
    }
  }

  let insetArea2 = 0;
  for (let i = 0; i < result.length; i++) {
    const j = (i + 1) % result.length;
    insetArea2 += result[i].x * result[j].y - result[j].x * result[i].y;
  }
  if (Math.sign(insetArea2) !== Math.sign(area2) || Math.abs(insetArea2) < 1) {
    const cx = polygon.reduce((s, v) => s + v.x, 0) / n;
    const cy = polygon.reduce((s, v) => s + v.y, 0) / n;
    return [{ x: cx, y: cy }];
  }

  return result;
}

export function findPortalEdgeIndices(wb: WalkboxDefinition, room: RoomDefinition, tolerance = 2): Set<number> {
  const portalEdges = new Set<number>();
  const wbMap = new Map<string, WalkboxDefinition>(room.walkboxes.map((w) => [w.id, w]));
  for (const adjId of wb.adjacentIds) {
    const adj = wbMap.get(adjId);
    if (!adj) continue;
    for (let i = 0; i < wb.polygon.length; i++) {
      const a1 = wb.polygon[i];
      const a2 = wb.polygon[(i + 1) % wb.polygon.length];
      for (let j = 0; j < adj.polygon.length; j++) {
        const b1 = adj.polygon[j];
        const b2 = adj.polygon[(j + 1) % adj.polygon.length];
        const overlap = segmentsOverlap(a1, a2, b1, b2, tolerance);
        if (overlap) {
          portalEdges.add(i);
        }
      }
    }
  }
  return portalEdges;
}

export function buildEdgeMargins(wb: WalkboxDefinition, room: RoomDefinition, margin: number): number[] {
  const portalEdges = findPortalEdgeIndices(wb, room);
  const n = wb.polygon.length;

  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area2 += wb.polygon[i].x * wb.polygon[j].y - wb.polygon[j].x * wb.polygon[i].y;
  }
  const inwardSign = area2 > 0 ? 1 : -1;

  return wb.polygon.map((_, i) => {
    if (portalEdges.has(i)) return 0;
    const a = wb.polygon[i];
    const b = wb.polygon[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-10) return 0;
    const normalX = inwardSign * -dy / len;
    return margin * Math.abs(normalX);
  });
}

export function closestPointInPolygon(p: Point, polygon: Point[], margin = 0, edgeMargins?: number[]): Point {
  const effective = margin > 0 ? insetPolygon(polygon, margin, edgeMargins) : polygon;
  if (effective.length >= 3 && pointInPolygon(p, effective)) return p;
  if (effective.length < 2) return effective[0] ?? polygon[0];
  let best: Point = effective[0];
  let bestDist = Infinity;
  for (let i = 0; i < effective.length; i++) {
    const a = effective[i];
    const b = effective[(i + 1) % effective.length];
    const closest = closestPointOnSegment(p, a, b);
    const dist = Math.hypot(closest.x - p.x, closest.y - p.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = closest;
    }
  }
  return best;
}

function distToPolygon(p: Point, polygon: Point[]): number {
  if (pointInPolygon(p, polygon)) return 0;
  let bestDist = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const closest = closestPointOnSegment(p, a, b);
    const dist = Math.hypot(closest.x - p.x, closest.y - p.y);
    if (dist < bestDist) bestDist = dist;
  }
  return bestDist;
}

function segmentsOverlap(a1: Point, a2: Point, b1: Point, b2: Point, tolerance: number): { start: Point; end: Point } | null {
  const projections: { t: number; point: Point }[] = [];
  const edgeDx = a2.x - a1.x;
  const edgeDy = a2.y - a1.y;
  const edgeLenSq = edgeDx * edgeDx + edgeDy * edgeDy;
  if (edgeLenSq === 0) return null;

  for (const bp of [b1, b2]) {
    const cp = closestPointOnSegment(bp, a1, a2);
    const d = Math.hypot(cp.x - bp.x, cp.y - bp.y);
    if (d <= tolerance) {
      const t = ((bp.x - a1.x) * edgeDx + (bp.y - a1.y) * edgeDy) / edgeLenSq;
      projections.push({ t: Math.max(0, Math.min(1, t)), point: cp });
    }
  }

  for (const ap of [a1, a2]) {
    const cp = closestPointOnSegment(ap, b1, b2);
    const d = Math.hypot(cp.x - ap.x, cp.y - ap.y);
    if (d <= tolerance) {
      const t = ((ap.x - a1.x) * edgeDx + (ap.y - a1.y) * edgeDy) / edgeLenSq;
      projections.push({ t: Math.max(0, Math.min(1, t)), point: ap });
    }
  }

  if (projections.length < 2) return null;

  projections.sort((a, b) => a.t - b.t);
  const first = projections[0];
  const last = projections[projections.length - 1];
  if (Math.abs(last.t - first.t) < 1e-6) return null;

  return { start: first.point, end: last.point };
}

function findPortalMidpoint(polyA: Point[], polyB: Point[], tolerance = 2): Point | null {
  let bestOverlap: { start: Point; end: Point } | null = null;
  let bestLen = 0;

  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];
      const overlap = segmentsOverlap(a1, a2, b1, b2, tolerance);
      if (overlap) {
        const len = Math.hypot(overlap.end.x - overlap.start.x, overlap.end.y - overlap.start.y);
        if (len > bestLen) {
          bestLen = len;
          bestOverlap = overlap;
        }
      }
    }
  }

  if (bestOverlap) {
    return {
      x: (bestOverlap.start.x + bestOverlap.end.x) / 2,
      y: (bestOverlap.start.y + bestOverlap.end.y) / 2,
    };
  }

  return null;
}

export function findWalkboxForPoint(
  point: Point,
  room: RoomDefinition
): WalkboxDefinition | null {
  for (const wb of room.walkboxes) {
    if (pointInPolygon(point, wb.polygon)) return wb;
  }
  return null;
}

export function findNearestWalkbox(
  point: Point,
  room: RoomDefinition
): WalkboxDefinition | null {
  if (room.walkboxes.length === 0) return null;
  let best = room.walkboxes[0];
  let bestDist = Infinity;
  for (const wb of room.walkboxes) {
    const d = distToPolygon(point, wb.polygon);
    if (d < bestDist) {
      bestDist = d;
      best = wb;
    }
  }
  return best;
}

export function findPathBetweenWalkboxes(
  startId: string,
  endId: string,
  room: RoomDefinition
): string[] {
  if (startId === endId) return [startId];
  const queue: Array<{ id: string; path: string[] }> = [{ id: startId, path: [startId] }];
  const visited = new Set<string>([startId]);
  const wbMap = new Map<string, WalkboxDefinition>(room.walkboxes.map((w) => [w.id, w]));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const wb = wbMap.get(current.id);
    if (!wb) continue;
    for (const adjId of wb.adjacentIds) {
      if (visited.has(adjId)) continue;
      const newPath = [...current.path, adjId];
      if (adjId === endId) return newPath;
      visited.add(adjId);
      queue.push({ id: adjId, path: newPath });
    }
  }
  console.warn(`[Walkbox] No path from walkbox "${startId}" to "${endId}" — walkboxes are disconnected.`);
  return [startId];
}

export function getReachableWalkboxIds(
  startId: string,
  room: RoomDefinition
): Set<string> {
  const visited = new Set<string>([startId]);
  const queue = [startId];
  const wbMap = new Map<string, WalkboxDefinition>(room.walkboxes.map((w) => [w.id, w]));
  while (queue.length > 0) {
    const id = queue.shift()!;
    const wb = wbMap.get(id);
    if (!wb) continue;
    for (const adjId of wb.adjacentIds) {
      if (!visited.has(adjId)) {
        visited.add(adjId);
        queue.push(adjId);
      }
    }
  }
  return visited;
}

export interface WaypointPathResult {
  waypoints: Point[];
  unreachable: boolean;
}

export function computeWaypointPath(
  startPoint: Point,
  endPoint: Point,
  room: RoomDefinition
): Point[] {
  return computeWaypointPathEx(startPoint, endPoint, room).waypoints;
}

export function computeWaypointPathEx(
  startPoint: Point,
  endPoint: Point,
  room: RoomDefinition,
  margin = 0
): WaypointPathResult {
  if (room.walkboxes.length === 0) return { waypoints: [endPoint], unreachable: false };

  const startWb = findWalkboxForPoint(startPoint, room) ?? findNearestWalkbox(startPoint, room);
  const endWb = findWalkboxForPoint(endPoint, room) ?? findNearestWalkbox(endPoint, room);

  if (!startWb || !endWb) return { waypoints: [endPoint], unreachable: false };

  const wbPath = findPathBetweenWalkboxes(startWb.id, endWb.id, room);

  if (wbPath.length <= 1 && startWb.id !== endWb.id) {
    const reachable = getReachableWalkboxIds(startWb.id, room);
    const startEM = margin > 0 ? buildEdgeMargins(startWb, room, margin) : undefined;
    let bestPoint: Point = closestPointInPolygon(endPoint, startWb.polygon, margin, startEM);
    let bestDist = Infinity;
    for (const wb of room.walkboxes) {
      if (!reachable.has(wb.id)) continue;
      const em = margin > 0 ? buildEdgeMargins(wb, room, margin) : undefined;
      const cp = closestPointInPolygon(endPoint, wb.polygon, margin, em);
      const d = Math.hypot(cp.x - endPoint.x, cp.y - endPoint.y);
      if (d < bestDist) {
        bestDist = d;
        bestPoint = cp;
      }
    }
    const fallbackWb = findWalkboxForPoint(bestPoint, room) ?? startWb;
    if (fallbackWb.id === startWb.id) {
      return { waypoints: [bestPoint], unreachable: true };
    }
    const fallbackPath = findPathBetweenWalkboxes(startWb.id, fallbackWb.id, room);
    return { waypoints: buildWaypointsFromPath(fallbackPath, startPoint, bestPoint, room, margin), unreachable: true };
  }

  if (wbPath.length <= 1) {
    const targetWb = startWb.id === endWb.id ? startWb : endWb;
    const em = margin > 0 ? buildEdgeMargins(targetWb, room, margin) : undefined;
    const constrainedEnd = closestPointInPolygon(endPoint, targetWb.polygon, margin, em);
    const clampedStart = closestPointInPolygon(startPoint, targetWb.polygon);
    const intraPath = findPathWithinPolygon(clampedStart, constrainedEnd, targetWb.polygon);
    return { waypoints: intraPath, unreachable: false };
  }

  return { waypoints: buildWaypointsFromPath(wbPath, startPoint, endPoint, room, margin), unreachable: false };
}

function buildWaypointsFromPath(wbPath: string[], startPoint: Point, endPoint: Point, room: RoomDefinition, margin = 0): Point[] {
  const wbMap = new Map<string, WalkboxDefinition>(room.walkboxes.map((w) => [w.id, w]));

  const rawWaypoints: { point: Point; wbId: string }[] = [];

  for (let i = 0; i < wbPath.length - 1; i++) {
    const wbA = wbMap.get(wbPath[i]);
    const wbB = wbMap.get(wbPath[i + 1]);
    if (wbA && wbB) {
      const portal = findPortalMidpoint(wbA.polygon, wbB.polygon);
      if (portal) {
        rawWaypoints.push({ point: portal, wbId: wbPath[i] });
      } else {
        rawWaypoints.push({ point: polygonCentroid(wbB.polygon), wbId: wbPath[i + 1] });
      }
    }
  }

  const finalWb = wbMap.get(wbPath[wbPath.length - 1]);
  if (finalWb) {
    const em = margin > 0 ? buildEdgeMargins(finalWb, room, margin) : undefined;
    const constrainedEnd = closestPointInPolygon(endPoint, finalWb.polygon, margin, em);
    const lastRaw = rawWaypoints[rawWaypoints.length - 1];
    if (!lastRaw || Math.hypot(constrainedEnd.x - lastRaw.point.x, constrainedEnd.y - lastRaw.point.y) > 1) {
      rawWaypoints.push({ point: constrainedEnd, wbId: wbPath[wbPath.length - 1] });
    }
  }

  const waypoints: Point[] = [];
  let currentPos = startPoint;
  for (const rw of rawWaypoints) {
    const wb = wbMap.get(rw.wbId);
    if (wb) {
      const subPath = findPathWithinPolygon(currentPos, rw.point, wb.polygon);
      for (const p of subPath) waypoints.push(p);
    } else {
      waypoints.push(rw.point);
    }
    currentPos = rw.point;
  }

  return waypoints;
}

function segmentsProperlyIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const cross = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);

  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

function pointOnPolygonEdge(p: Point, polygon: Point[], eps = 1e-4): boolean {
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-12) continue;
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    if (t < -eps || t > 1 + eps) continue;
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    const distSq = (p.x - projX) * (p.x - projX) + (p.y - projY) * (p.y - projY);
    if (distSq < eps * eps) return true;
  }
  return false;
}

function isSegmentInsidePolygon(a: Point, b: Point, polygon: Point[]): boolean {
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const c = polygon[i];
    const d = polygon[(i + 1) % n];
    if (segmentsProperlyIntersect(a, b, c, d)) return false;
  }
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return pointInPolygon(mid, polygon) || pointOnPolygonEdge(mid, polygon);
}

export function findPathWithinPolygon(start: Point, end: Point, polygon: Point[]): Point[] {
  if (polygon.length < 3) return [end];
  if (isSegmentInsidePolygon(start, end, polygon)) return [end];

  const nodes: Point[] = [start, end, ...polygon];
  const startIdx = 0;
  const endIdx = 1;
  const nodeCount = nodes.length;

  const adj: number[][] = Array.from({ length: nodeCount }, () => []);

  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      if (Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) < 1e-6) {
        adj[i].push(j);
        adj[j].push(i);
        continue;
      }
      if (isSegmentInsidePolygon(nodes[i], nodes[j], polygon)) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  const dist = new Float64Array(nodeCount).fill(Infinity);
  const prev = new Int32Array(nodeCount).fill(-1);
  const visited = new Uint8Array(nodeCount);
  dist[startIdx] = 0;

  for (let step = 0; step < nodeCount; step++) {
    let u = -1;
    let uDist = Infinity;
    for (let i = 0; i < nodeCount; i++) {
      if (!visited[i] && dist[i] < uDist) {
        u = i;
        uDist = dist[i];
      }
    }
    if (u === -1 || u === endIdx) break;
    visited[u] = 1;

    for (const v of adj[u]) {
      if (visited[v]) continue;
      const d = dist[u] + Math.hypot(nodes[v].x - nodes[u].x, nodes[v].y - nodes[u].y);
      if (d < dist[v]) {
        dist[v] = d;
        prev[v] = u;
      }
    }
  }

  if (dist[endIdx] === Infinity) return [end];

  const path: Point[] = [];
  let cur = endIdx;
  while (cur !== startIdx && cur !== -1) {
    path.push(nodes[cur]);
    cur = prev[cur];
  }
  path.reverse();
  return path;
}

export function getScaleAtY(y: number, wb: WalkboxDefinition, roomHeight: number): number {
  if (!wb.scale) return 1;
  const { near, far, yNear, yFar } = wb.scale;
  const t = Math.max(0, Math.min(1, (y - yFar) / (yNear - yFar)));
  return far + (near - far) * t;
}
