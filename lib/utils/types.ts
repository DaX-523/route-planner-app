export interface Milestone {
    id: string;
    name: string;
    address: string;
    coordinates: {latitude: number, longitude: number};
    estimatedDuration: number; // in minutes
    order: number;
    completed: boolean;
  }
  

  export interface OptimizedRoute {
    milestones: Milestone[];
    totalDistance: number;
    estimatedTotalTime: number;
    startingPoint: Milestone;
    routeSegments: RouteSegment[];
  validation: RouteValidationResult;
  }
  
  export interface RouteSegment {
    from: Milestone;
    to: Milestone;
    distanceKm: number;
    travelTimeMinutes: number;
  }

  export type TransportMode = 'walking' | 'cycling' | 'driving';

  export interface RouteValidationResult {
    valid: boolean;
    reasons: string[];
  }
  