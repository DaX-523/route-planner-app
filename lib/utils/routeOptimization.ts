import { haversineDistanceKm } from '@/lib/utils/geo';
import { Milestone, OptimizedRoute, RouteSegment, RouteValidationResult } from '@/lib/utils/types';

// n x n matrix of distances between all points
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


function twoOpt(order: number[], distanceMatrix: number[][]): number[] {
  let best = order.slice();
  let improved = true;
  while (improved) {
    improved = false;
    // we start at 1 because we don't want to swap the first and last point
    // we end at length - 2 because we don't want to swap the last and first point
    // we don't want to swap the first and last point because it would create a loop
 
    for (let i = 1; i < best.length - 2; i += 1) {
      for (let k = i + 1; k < best.length - 1; k += 1) {
        const a = best[i - 1];
        const b = best[i];
        const c = best[k];
        const d = best[k + 1];
        const current = distanceMatrix[a][b] + distanceMatrix[c][d];
        const swapped = distanceMatrix[a][c] + distanceMatrix[b][d];
        // If swapped is less than current by more than 1 nanometer (since 1e-9 km ≈ 1 micron), treat it as an improvement.
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


function buildSegmentsFromOrder(order: number[], points: Milestone[]): RouteSegment[] {
  const segments: RouteSegment[] = [];
  const speedKmPerHour = 40; // conservative city driving avg
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

export function validateRouteAccesible(segments: RouteSegment[]): RouteValidationResult {
  const reasons: string[] = [];
  let valid = true;
  
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

  const startIndex = options.startId
    ? Math.max(0, milestones.findIndex(m => m.id === options.startId))
    : suggestStartingPointIndex(milestones, options.userLocation ?? null);

  const coords = milestones.map(m => m.coordinates);
  const distMatrix = computeDistanceMatrixKm(coords);

  let order = nearestNeighborOrder(distMatrix, startIndex);
  if (options.useTwoOpt) {
    order = twoOpt(order, distMatrix);
  }

  const segments = buildSegmentsFromOrder(order, milestones);
  const totalDistance = segments.reduce((acc, s) => acc + s.distanceKm, 0);
  const travelTimeMinutes = segments.reduce((acc, s) => acc + s.travelTimeMinutes, 0);
  const visitTimeMinutes = milestones.reduce((acc, m) => acc + m.estimatedDuration, 0);

  const orderedMilestones = order.map((idx, i) => ({ ...milestones[idx], order: i }));

  const validation = validateRouteAccesible(segments);

  return {
    milestones: orderedMilestones,
    routeSegments: segments,
    totalDistance,
    estimatedTotalTime: travelTimeMinutes + visitTimeMinutes,
    startingPoint: orderedMilestones[0],
    validation,
  };
}


