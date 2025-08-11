import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import { Milestone } from '@/app/utils/types';
import { haversineDistanceKm } from '@/app/utils/geo';

export const LOCATION_TASK = 'ROUTE_TRACKING_LOCATION_TASK';

export type ProgressUpdate = {
  coords: { latitude: number; longitude: number };
  reachedMilestoneIds: string[];
};

const LOG_TAG = '[RouteTracking]';
function log(message: string, data?: unknown) {
  if (data !== undefined) {
    console.log(LOG_TAG, message, data);
  } else {
    console.log(LOG_TAG, message);
  }
}

// Define background task once
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    log('Background task error', error);
    return;
  }
  // Background callbacks (when app is suspended). Foreground screen also uses a subscription.
  const payload = data as unknown as { locations?: Location.LocationObject[] };
  const locations = payload?.locations as Location.LocationObject[] | undefined;
  if (locations && locations.length > 0) {
    const last = locations[locations.length - 1];
    log('Background location', {
      lat: Number(last.coords.latitude.toFixed(6)),
      lon: Number(last.coords.longitude.toFixed(6)),
      acc: last.coords.accuracy,
      ts: last.timestamp,
    });
  } else {
    log('Background task fired with no locations');
  }
});


export async function requestBackgroundPermissions(): Promise<boolean> {
  log('Requesting permissions (FG + BG)');
  const fg = await Location.requestForegroundPermissionsAsync();
  log('Foreground permission status', fg.status);
  if (fg.status !== 'granted') return false;
  
  // Check current background status first
  const currentBg = await Location.getBackgroundPermissionsAsync();
  log('Current background permission status', currentBg.status);
  
  if (currentBg.status === 'granted') {
    log('Background permission already granted');
    return true;
  }
  
  if (Platform.OS === 'android' && currentBg.status === 'denied') {
    log('Background permission denied on Android - opening settings');
    Linking.openSettings();
    return false;
  }
  
  try {
    log('Requesting background permission');
    // Add timeout to prevent hanging
    const bgPromise = Location.requestBackgroundPermissionsAsync();
    const timeoutPromise = new Promise<Location.LocationPermissionResponse>((_, reject) => {
      setTimeout(() => reject(new Error('Background permission request timeout')), 10000);
    });
    
    const bg = await Promise.race([bgPromise, timeoutPromise]);
    log('Background permission response', bg.status);
    return bg.status === 'granted';
  } catch (error) {
    log('Background permission request failed', error);
    if (Platform.OS === 'android') {
      log('Opening Android settings for manual permission grant');
      Linking.openSettings();
    }
    return false;
  }
}

export async function startTracking(
  milestones: Milestone[],
  onUpdate: (update: ProgressUpdate) => void,
  options?: { distanceIntervalMeters?: number; radiusMeters?: number },
) {
  log('startTracking called', {
    milestones: milestones.length,
    options,
  });
  
  // Simplified for Expo Go: only use foreground tracking
  log('Using foreground-only tracking (Expo Go compatible)');
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    log('No foreground permission, requesting...');
    const fgRequest = await Location.requestForegroundPermissionsAsync();
    if (fgRequest.status !== 'granted') {
      log('Foreground permission denied, aborting');
      return;
    }
  }
  log('Foreground permission granted');

  const distanceInterval = options?.distanceIntervalMeters ?? 25;
  const radiusMeters = options?.radiusMeters ?? 75;

  // Skip background updates in Expo Go
  log('Skipping background updates - Expo Go foreground-only mode');

  log('Subscribing to foreground position updates', { distanceInterval });
  const subscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, distanceInterval },
    (loc) => {
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      // Find nearest incomplete milestone for quick progress insight
      let nearestId: string | null = null;
      let nearestMeters = Number.POSITIVE_INFINITY;
      for (const m of milestones) {
        if (m.completed) continue;
        const meters = haversineDistanceKm(m.coordinates, coords) * 1000;
        if (meters < nearestMeters) {
          nearestMeters = meters;
          nearestId = m.id;
        }
      }
      const reached = milestones
        .filter(m => !m.completed)
        .filter(m => haversineDistanceKm(m.coordinates, coords) * 1000 <= radiusMeters)
        .map(m => m.id);

      log('Position update', {
        lat: Number(coords.latitude.toFixed(6)),
        lon: Number(coords.longitude.toFixed(6)),
        nearestId,
        nearestMeters: Math.round(nearestMeters),
        reached,
      });

      onUpdate({ coords, reachedMilestoneIds: reached });
    },
  );

  log('Foreground subscription established');
  return subscription;
}

export async function stopTracking() {
  log('stopTracking called');
  const tasks = await TaskManager.getRegisteredTasksAsync();
  log('Registered tasks', tasks.map(t => t.taskName));
  const has = tasks.find(t => t.taskName === LOCATION_TASK);
  if (has) {
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      log('Stopped background updates');
    } catch (e) {
      log('Failed to stop background updates', e);
    }
  } else {
    log('No background task to stop');
  }
}


