import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from 'react-native-gesture-handler';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { RouteMap } from '@/app/components/RouteMap';
import { Timeline } from '@/app/components/Timeline';
import { buildTimeline } from '@/app/utils/schedule';
import { startTracking, stopTracking } from '@/app/utils/navigationTracking';
import { Milestone, OptimizedRoute } from '@/app/utils/types';

export default function RouteDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Parse the route data from navigation params
  const optimizedRoute: OptimizedRoute = React.useMemo(() => {
    try {
      return JSON.parse(params.route as string);
    } catch {
      // Fallback if parsing fails
      return {
        milestones: [],
        routeSegments: [],
        totalDistance: 0,
        estimatedTotalTime: 0,
        startingPoint: {} as Milestone,
        validation: { valid: true, reasons: [] },
      };
    }
  }, [params.route]);

  const [milestones, setMilestones] = React.useState<Milestone[]>(optimizedRoute.milestones);
  const [userLocation, setUserLocation] = React.useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const trackingRef = React.useRef<null | { remove: () => void }>(null);
  const [isTracking, setIsTracking] = React.useState(false);

  // Get user location on mount
  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch {
        // ignore
      }
    })();
  }, []);

  const toggleTracking = React.useCallback(async () => {
    if (isTracking) {
      await stopTracking();
      trackingRef.current?.remove?.();
      trackingRef.current = null;
      setIsTracking(false);
      return;
    }
    
    const sub = await startTracking(milestones, ({ coords, reachedMilestoneIds }) => {
      setUserLocation(coords);
      if (reachedMilestoneIds.length) {
        setMilestones(prev => 
          prev.map(m => 
            reachedMilestoneIds.includes(m.id) ? { ...m, completed: true } : m
          )
        );
      }
    });
    
    if (sub) {
      trackingRef.current = sub as any;
      setIsTracking(true);
    }
  }, [isTracking, milestones]);

  const currentMilestone = milestones.find(m => !m.completed);
  const completedCount = milestones.filter(m => m.completed).length;
  const progress = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title">Route Navigation</ThemedText>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        </View>

        {/* Progress Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Route Progress</Text>
          <Text style={styles.progressText}>
            {completedCount} of {milestones.length} milestones completed ({Math.round(progress)}%)
          </Text>
          <Text>Total distance: {optimizedRoute.totalDistance.toFixed(1)} km</Text>
          <Text>Estimated time: {Math.round(optimizedRoute.estimatedTotalTime)} min</Text>
          
          {currentMilestone && (
            <View style={styles.currentMilestone}>
              <Text style={styles.currentText}>
                Next: {currentMilestone.name}
              </Text>
            </View>
          )}
        </View>

        {/* Map */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Route Map</ThemedText>
          <RouteMap
            milestones={milestones}
            segments={optimizedRoute.routeSegments}
            userLocation={userLocation}
          />
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Timeline</ThemedText>
          <Timeline
            items={buildTimeline(milestones, optimizedRoute.routeSegments)}
            currentMilestoneId={currentMilestone?.id}
          />
        </View>

        {/* Navigation Controls */}
        <View style={styles.controls}>
          <Pressable 
            style={[styles.primaryButton, isTracking && styles.stopButton]} 
            onPress={toggleTracking}
          >
            <Text style={styles.primaryButtonText}>
              {isTracking ? 'Stop Navigation' : 'Start Navigation'}
            </Text>
          </Pressable>

          {completedCount === milestones.length && milestones.length > 0 && (
            <View style={styles.completionCard}>
              <Text style={styles.completionTitle}>🎉 Route Complete!</Text>
              <Text style={styles.completionText}>
                You&apos;ve visited all {milestones.length} milestones!
              </Text>
              <Pressable 
                style={styles.secondaryButton}
                onPress={() => {
                  Alert.alert('Success', 'Adventure completed successfully!', [
                    { text: 'Plan Another Route', onPress: () => router.back() }
                  ]);
                }}
              >
                <Text style={styles.secondaryButtonText}>Finish Adventure</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Route Validation Warnings */}
        {!optimizedRoute.validation.valid && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>⚠️ Route Warnings</Text>
            {optimizedRoute.validation.reasons.map((reason, i) => (
              <Text key={i} style={styles.warningText}>• {reason}</Text>
            ))}
          </View>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#1D3D47',
    fontWeight: '600',
  },
  section: {
    gap: 8,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D3D47',
    marginBottom: 4,
  },
  currentMilestone: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  currentText: {
    fontWeight: '600',
    color: '#1D3D47',
  },
  controls: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#1D3D47',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#dc3545',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  completionCard: {
    backgroundColor: '#d4edda',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c3e6cb',
    alignItems: 'center',
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#155724',
    marginBottom: 4,
  },
  completionText: {
    color: '#155724',
    textAlign: 'center',
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    color: '#856404',
  },
});
