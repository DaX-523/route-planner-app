import React, { createContext, useContext, useState } from 'react';
import { OptimizedRoute } from '@/lib/utils/types';

export interface RecentTrip {
  id: string;
  name: string;
  createdAt: Date;
  route: OptimizedRoute;
  totalDistance: number;
  estimatedTotalTime: number;
  milestoneCount: number;
}

interface RecentTripsContextType {
  recentTrips: RecentTrip[];
  addRecentTrip: (route: OptimizedRoute, name?: string) => void;
  removeRecentTrip: (id: string) => void;
  clearAllTrips: () => void;
  isLoading: boolean;
}

const RecentTripsContext = createContext<RecentTripsContextType | undefined>(undefined);

const MAX_RECENT_TRIPS = 20;

export function RecentTripsProvider({ children }: { children: React.ReactNode }) {
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [isLoading, setIsLoading] = useState(false); // No loading needed for in-memory storage

  const addRecentTrip = (route: OptimizedRoute, name?: string) => {
    const tripName = name || generateTripName(route);
    const newTrip: RecentTrip = {
      id: Date.now().toString(),
      name: tripName,
      createdAt: new Date(),
      route,
      totalDistance: route.totalDistance,
      estimatedTotalTime: route.estimatedTotalTime,
      milestoneCount: route.milestones.length,
    };

    const updatedTrips = [newTrip, ...recentTrips].slice(0, MAX_RECENT_TRIPS);
    setRecentTrips(updatedTrips);
  };

  const removeRecentTrip = (id: string) => {
    const updatedTrips = recentTrips.filter(trip => trip.id !== id);
    setRecentTrips(updatedTrips);
  };

  const clearAllTrips = () => {
    setRecentTrips([]);
  };

  const generateTripName = (route: OptimizedRoute): string => {
    if (route.milestones.length === 0) return 'Empty Route';
    
    const startName = route.startingPoint?.name || route.milestones[0]?.name || 'Unknown';
    const count = route.milestones.length;
    
    if (count === 1) {
      return `Trip to ${startName}`;
    } else if (count === 2) {
      const endName = route.milestones[1]?.name || 'Unknown';
      return `${startName} → ${endName}`;
    } else {
      return `${startName} + ${count - 1} stops`;
    }
  };

  return (
    <RecentTripsContext.Provider
      value={{
        recentTrips,
        addRecentTrip,
        removeRecentTrip,
        clearAllTrips,
        isLoading,
      }}
    >
      {children}
    </RecentTripsContext.Provider>
  );
}

export function useRecentTrips() {
  const context = useContext(RecentTripsContext);
  if (context === undefined) {
    throw new Error('useRecentTrips must be used within a RecentTripsProvider');
  }
  return context;
}
