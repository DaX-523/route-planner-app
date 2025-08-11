import { Milestone, RouteSegment } from '@/app/utils/types';

export interface TimelineEntry {
  milestone: Milestone;
  arrivalMinutes: number;
}

export function buildTimeline(
  milestones: Milestone[],
  segments: RouteSegment[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  let cumulative = 0;
  for (let i = 0; i < milestones.length; i += 1) {
    entries.push({ milestone: milestones[i], arrivalMinutes: cumulative });
    // Add stay duration after arrival
    cumulative += milestones[i].estimatedDuration;
    // Add travel time to next
    if (i < segments.length) {
      cumulative += segments[i].travelTimeMinutes;
    }
  }
  return entries;
}


