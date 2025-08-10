import { haversineDistanceKm } from '@/app/utils/geo';
import { Milestone, OptimizedRoute, RouteSegment, TransportMode, RouteValidationResult } from '@/app/utils/types';

function computeDistanceMatrixKm(points: { latitude: number; longitude: number }[]): number[][] {
  const n = points.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const d = haversineDistanceKm(points[i], points[j]);
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }
  return matrix;
}

function nearestNeighborOrder(distanceMatrix: number[][], startIndex: number): number[] {
  const n = distanceMatrix.length;
  const visited = new Array<boolean>(n).fill(false);
  const order: number[] = [startIndex];
  visited[startIndex] = true;
  for (let step = 1; step < n; step += 1) {
    const last = order[order.length - 1];
    let bestIdx = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let j = 0; j < n; j += 1) {
      if (!visited[j] && distanceMatrix[last][j] < bestDist) {
        bestDist = distanceMatrix[last][j];
        bestIdx = j;
      }
    }
    if (bestIdx === -1) break;
    visited[bestIdx] = true;
    order.push(bestIdx);
  }
  return order;
}

// Helper kept for potential future UI breakdowns
// function orderDistance(order: number[], distanceMatrix: number[][]): number {
//   let total = 0;
//   for (let i = 0; i < order.length - 1; i += 1) {
//     total += distanceMatrix[order[i]][order[i + 1]];
//   }
//   return total;
// }

function twoOpt(order: number[], distanceMatrix: number[][]): number[] {
  let best = order.slice();
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 2; i += 1) {
      for (let k = i + 1; k < best.length - 1; k += 1) {
        const a = best[i - 1];
        const b = best[i];
        const c = best[k];
        const d = best[k + 1];
        const current = distanceMatrix[a][b] + distanceMatrix[c][d];
        const swapped = distanceMatrix[a][c] + distanceMatrix[b][d];
        if (swapped + 1e-9 < current) {
          const newOrder = best.slice(0, i)
            .concat(best.slice(i, k + 1).reverse())
            .concat(best.slice(k + 1));
          best = newOrder;
          improved = true;
        }
      }
    }
  }
  return best;
}

function speedKmPerHourForMode(mode: TransportMode): number {
  switch (mode) {
    case 'walking':
      return 5; // avg walking speed
    case 'cycling':
      return 15; // avg city cycling
    case 'driving':
      return 40; // conservative city driving avg
    default:
      return 5;
  }
}

function buildSegmentsFromOrder(order: number[], points: Milestone[], mode: TransportMode): RouteSegment[] {
  const segments: RouteSegment[] = [];
  const speedKmPerHour = speedKmPerHourForMode(mode);
  for (let i = 0; i < order.length - 1; i += 1) {
    const from = points[order[i]];
    const to = points[order[i + 1]];
    const distanceKm = haversineDistanceKm(from.coordinates, to.coordinates);
    const travelTimeMinutes = (distanceKm / speedKmPerHour) * 60;
    segments.push({ from, to, distanceKm, travelTimeMinutes });
  }
  return segments;
}

export function suggestStartingPointIndex(milestones: Milestone[], userLocation?: { latitude: number; longitude: number } | null): number {
  if (!milestones.length) return 0;
  if (!userLocation) return 0;
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < milestones.length; i += 1) {
    const d = haversineDistanceKm(userLocation, milestones[i].coordinates);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function validateRouteWalkable(segments: RouteSegment[], mode: TransportMode): RouteValidationResult {
  const reasons: string[] = [];
  let valid = true;
  if (mode === 'walking') {
    for (const seg of segments) {
      if (seg.distanceKm > 10) {
        valid = false;
        reasons.push(`Segment from "${seg.from.name}" to "${seg.to.name}" is too long for walking (${seg.distanceKm.toFixed(1)} km).`);
      }
    }
  }
  // Basic coordinate sanity check
  for (const seg of segments) {
    const { latitude: la1, longitude: lo1 } = seg.from.coordinates;
    const { latitude: la2, longitude: lo2 } = seg.to.coordinates;
    if (
      Number.isNaN(la1) || Number.isNaN(lo1) || Number.isNaN(la2) || Number.isNaN(lo2)
    ) {
      valid = false;
      reasons.push('Invalid coordinates detected in route.');
      break;
    }
  }
  return { valid, reasons };
}

export function optimizeRoute(
  milestones: Milestone[],
  options: {
    startId?: string | null;
    userLocation?: { latitude: number; longitude: number } | null;
    useTwoOpt?: boolean;
    mode?: TransportMode;
  } = {},
): OptimizedRoute {
  if (milestones.length < 2) {
    return {
      milestones,
      routeSegments: [],
      totalDistance: 0,
      estimatedTotalTime: milestones.reduce((acc, m) => acc + m.estimatedDuration, 0),
      startingPoint: milestones[0] ?? ({} as Milestone),
      validation: { valid: true, reasons: [] },
    };
  }

  const mode: TransportMode = options.mode ?? 'driving';
  const startIndex = options.startId
    ? Math.max(0, milestones.findIndex(m => m.id === options.startId))
    : suggestStartingPointIndex(milestones, options.userLocation ?? null);

  const coords = milestones.map(m => m.coordinates);
  const distMatrix = computeDistanceMatrixKm(coords);

  let order = nearestNeighborOrder(distMatrix, startIndex);
  if (options.useTwoOpt) {
    order = twoOpt(order, distMatrix);
  }

  const segments = buildSegmentsFromOrder(order, milestones, mode);
  const totalDistance = segments.reduce((acc, s) => acc + s.distanceKm, 0);
  const travelTimeMinutes = segments.reduce((acc, s) => acc + s.travelTimeMinutes, 0);
  const visitTimeMinutes = milestones.reduce((acc, m) => acc + m.estimatedDuration, 0);

  const orderedMilestones = order.map((idx, i) => ({ ...milestones[idx], order: i }));

  const validation = validateRouteWalkable(segments, mode);

  return {
    milestones: orderedMilestones,
    routeSegments: segments,
    totalDistance,
    estimatedTotalTime: travelTimeMinutes + visitTimeMinutes,
    startingPoint: orderedMilestones[0],
    validation,
  };
}


