import * as Location from 'expo-location';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { haversineDistanceKm, formatDistanceKm } from '@/app/utils/geo';
import { Milestone, OptimizedRoute } from '@/app/utils/types';
import { optimizeRoute } from '@/app/utils/routeOptimization';
import { ScrollView } from 'react-native-gesture-handler';

type PlacePrediction = {
  place_id: string;
  description: string;
  structured_formatting?: { main_text: string; secondary_text?: string };
  distance_meters?: number;
};

type PlaceDetails = {
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
};

const DURATION_OPTIONS = [15, 30, 60, 120];

export default function HomeScreen() {
  const [query, setQuery] = React.useState('');
  const [predictions, setPredictions] = React.useState<PlacePrediction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [milestones, setMilestones] = React.useState<Milestone[]>([]);
  const [startingPointId, setStartingPointId] = React.useState<string | null>(null);
  const [userLocation, setUserLocation] = React.useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [useTwoOpt, setUseTwoOpt] = React.useState<boolean>(false);
  const [optimized, setOptimized] = React.useState<OptimizedRoute | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch {
        console.log('Error getting user location');
      }
    })();
  }, []);

  const fetchPredictions = React.useCallback(async (text: string) => {
    setQuery(text);
    if (!text || text.length < 2) {
      setPredictions([]);
      return;
    }
    try {
      setLoading(true);
      const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      if (!key) return;
      const originParam = userLocation
        ? `&origin=${userLocation.latitude},${userLocation.longitude}`
        : '';
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        text,
      )}&types=establishment|geocode${originParam}&key=${key}`;
      const res = await fetch(url);
      const data = await res.json();
      setPredictions(data.predictions || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  const getPlaceDetails = React.useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    try {
      const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      if (!key) return null;
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry/location&key=${key}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.result as PlaceDetails;
    } catch {
      return null;
    }
  }, []);

  const addMilestoneFromPrediction = React.useCallback(
    async (prediction: PlacePrediction) => {
      if (milestones.length >= 10) {
        Alert.alert('Limit reached', 'You can add up to 10 milestones per route.');
        return;
      }
      const details = await getPlaceDetails(prediction.place_id);
      if (!details) return;

      const newMilestone: Milestone = {
        id: prediction.place_id,
        name: details.name,
        address: details.formatted_address,
        coordinates: {
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
        },
        estimatedDuration: 30,
        order: milestones.length,
        completed: false,
      };
      const next = [...milestones, newMilestone];
      setMilestones(next);
      if (startingPointId == null) {
        setStartingPointId(newMilestone.id);
      }
    },
    [getPlaceDetails, milestones, startingPointId],
  );

  const removeMilestone = React.useCallback(
    (id: string) => {
      const next = milestones.filter(m => m.id !== id).map((m, idx) => ({ ...m, order: idx }));
      setMilestones(next);
      if (startingPointId === id) {
        setStartingPointId(next.length ? next[0].id : null);
      }
    },
    [milestones, startingPointId],
  );

  const setDuration = React.useCallback(
    (id: string, minutes: number) => {
      setMilestones(prev => prev.map(m => (m.id === id ? { ...m, estimatedDuration: minutes } : m)));
    },
    [],
  );

  const onDragEnd = React.useCallback(({ data }: { data: Milestone[] }) => {
    const reordered = data.map((m, idx) => ({ ...m, order: idx }));
    setMilestones(reordered);
    setOptimized(null);
  }, []);

  const selectAsStart = React.useCallback((id: string) => {
    setStartingPointId(id);
    setOptimized(null);
  }, []);

  // starting point derived in-line by id; no need to compute object here

  const renderPrediction = ({ item }: { item: PlacePrediction }) => {
    const distanceLabel = item.distance_meters != null ? (
      <Text style={styles.distanceTextSmall}>{formatDistanceKm(item.distance_meters / 1000)}</Text>
    ) : null;
    return (
      <Pressable style={styles.predictionItem} onPress={() => addMilestoneFromPrediction(item)}>
        <Text style={styles.predictionTitle}>
          {item.structured_formatting?.main_text ?? item.description}
        </Text>
        {!!item.structured_formatting?.secondary_text && (
          <Text style={styles.predictionSubtitle}>{item.structured_formatting.secondary_text}</Text>
        )}
        {distanceLabel}
      </Pressable>
    );
  };

  const renderMilestone = ({ item, drag, isActive }: RenderItemParams<Milestone>) => {
    const isStart = startingPointId === item.id;
    const userToPlaceKm = userLocation
      ? haversineDistanceKm(userLocation, item.coordinates)
      : null;
    return (
      <Pressable
        onLongPress={drag}
        disabled={isActive}
        style={[styles.milestoneItem, isActive && { opacity: 0.9 }]}
      >
        <View style={styles.milestoneHeader}>
          <Text style={styles.milestoneTitle}>{item.name}</Text>
          <View style={styles.milestoneActions}>
            <Pressable onPress={() => removeMilestone(item.id)}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.milestoneAddress}>{item.address}</Text>
        <View style={styles.milestoneMetaRow}>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map(opt => (
              <Pressable
                key={opt}
                onPress={() => setDuration(item.id, opt)}
                style={[
                  styles.durationPill,
                  item.estimatedDuration === opt && styles.durationPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.durationPillText,
                    item.estimatedDuration === opt && styles.durationPillTextSelected,
                  ]}
                >
                  {opt === 60 ? '1h' : opt === 120 ? '2h' : `${opt}m`}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={() => selectAsStart(item.id)}>
              <Text style={[styles.startBadge, isStart && styles.startBadgeSelected]}>
                {isStart ? 'Starting point' : 'Set as start'}
              </Text>
            </Pressable>
            {userToPlaceKm != null && (
              <Text style={styles.distanceText}>{formatDistanceKm(userToPlaceKm)}</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const canProceed = milestones.length >= 3 && milestones.length <= 10 && startingPointId != null;

  const onOptimize = React.useCallback(() => {
    if (!canProceed) {
      Alert.alert('Add more milestones', 'Please add at least 3 milestones to continue.');
      return;
    }
    const result = optimizeRoute(milestones, {
      startId: startingPointId,
      userLocation,
      useTwoOpt,
    });
    setOptimized(result);
    setMilestones(result.milestones);
  }, [canProceed, milestones, startingPointId, useTwoOpt, userLocation]);

  return (
    <ScrollView style={{ padding: 12, marginTop: 12 }}>
      <ThemedView style={{ gap: 12, padding: 12 }}>
        <ThemedText type="title">Plan your route</ThemedText>
        <TextInput
          value={query}
          onChangeText={fetchPredictions}
          placeholder="Search for places"
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={{ marginLeft: 8 }}>Searching…</Text>
          </View>
        )}
        {!loading && predictions.length > 0 && (
          <FlatList
            data={predictions}
            keyExtractor={(p) => p.place_id}
            renderItem={renderPrediction}
            keyboardShouldPersistTaps="handled"
            style={styles.predictionList}
          />
        )}

        <ThemedText type="subtitle">Milestones ({milestones.length}/10)</ThemedText>
        <View style={styles.optionsRow}>
          
          <Pressable onPress={() => setUseTwoOpt(v => !v)}>
            <Text style={[styles.togglePill, useTwoOpt && styles.togglePillOn]}>2-opt</Text>
          </Pressable>
        </View>
        <DraggableFlatList
          data={milestones}
          keyExtractor={(m) => m.id}
          renderItem={renderMilestone}
          onDragEnd={onDragEnd}
          activationDistance={12}
          containerStyle={{ minHeight: 120 }}
        />

        <Pressable
          disabled={!canProceed}
          style={[styles.primaryButton, !canProceed && { opacity: 0.5 }]}
          onPress={onOptimize}
        >
          <Text style={styles.primaryButtonText}>Optimize Order</Text>
        </Pressable>

        {optimized && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Route summary</Text>
            <Text>Total distance: {optimized.totalDistance.toFixed(1)} km</Text>
            <Text>Estimated total time: {Math.round(optimized.estimatedTotalTime)} min</Text>
            {!optimized.validation.valid && (
              <View style={{ marginTop: 6 }}>
                <Text style={{ color: '#a00', fontWeight: '700' }}>Warnings:</Text>
                {optimized.validation.reasons.map((r, i) => (
                  <Text key={i} style={{ color: '#a00' }}>• {r}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 8, default: 10 }),
    backgroundColor: 'white',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  predictionList: {
    maxHeight: 240,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  predictionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  predictionTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  predictionSubtitle: {
    color: '#666',
    marginTop: 2,
  },
  milestoneItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  milestoneAddress: {
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  milestoneMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 6,
  },
  durationPill: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'white',
  },
  durationPillSelected: {
    backgroundColor: '#1D3D47',
    borderColor: '#1D3D47',
  },
  durationPillText: {
    color: '#333',
    fontWeight: '600',
  },
  durationPillTextSelected: {
    color: 'white',
  },
  startBadge: {
    borderWidth: 1,
    borderColor: '#1D3D47',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: '#1D3D47',
  },
  startBadgeSelected: {
    backgroundColor: '#1D3D47',
    color: 'white',
  },
  distanceText: {
    color: '#333',
  },
  distanceTextSmall: {
    color: '#666',
    marginTop: 4,
  },
  milestoneActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#1D3D47',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  removeText: {
    color: '#a00',
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modePill: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textTransform: 'capitalize',
    color: '#333',
  },
  modePillSelected: {
    backgroundColor: '#1D3D47',
    borderColor: '#1D3D47',
    color: 'white',
  },
  togglePill: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#333',
  },
  togglePillOn: {
    backgroundColor: '#1D3D47',
    borderColor: '#1D3D47',
    color: 'white',
  },
  summaryBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    marginTop: 8,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
});
