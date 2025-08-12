import * as Location from 'expo-location';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
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
import { styles } from './index.styles';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { haversineDistanceKm, formatDistanceKm } from '@/lib/utils/geo';
import { Milestone } from '@/lib/utils/types';
import { optimizeRoute } from '@/lib/utils/routeOptimization';
import { useRouter } from 'expo-router';
import { useRecentTrips } from '@/app/contexts/RecentTripsContext';

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
  const router = useRouter();
  const { addRecentTrip } = useRecentTrips();
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
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const fetchPredictionsDebounced = React.useCallback(async (text: string) => {
    if (!text || text.length < 2) {
      setPredictions([]);
      setLoading(false);
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

  const handleSearchInput = React.useCallback((text: string) => {
    setQuery(text);
    
    // Clear existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set loading state immediately if text is long enough
    if (text && text.length >= 2) {
      setLoading(true);
    } else {
      setLoading(false);
    }
    
    // Debounce the API call by 300ms
    debounceRef.current = setTimeout(() => {
      fetchPredictionsDebounced(text);
    }, 300);
  }, [fetchPredictionsDebounced]);

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
      
      // Clear predictions immediately and dismiss keyboard
      setPredictions([]);
      Keyboard.dismiss();
      
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
      setQuery("");
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
  }, []);

  const selectAsStart = React.useCallback((id: string) => {
    setStartingPointId(id);
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

  const onOptimize = React.useCallback(async () => {
    if (!canProceed) {
      Alert.alert('Add more milestones', 'Please add at least 3 milestones to continue.');
      return;
    }
    const result = optimizeRoute(milestones, {
      startId: startingPointId,
      userLocation,
      useTwoOpt,
    });
    
    // Save trip to recent trips
    try {
      addRecentTrip(result);
    } catch (error) {
      console.error('Error saving recent trip:', error);
    }
    
    // Navigate to route details screen with optimized route
    router.push({
      pathname: '/route-details' as any,
      params: {
        route: JSON.stringify(result),
      },
    });
  }, [canProceed, milestones, startingPointId, useTwoOpt, userLocation, router, addRecentTrip]);

  return (
    <ThemedView style={{ flex: 1, padding: 12, marginTop: 12 }}>
      <ThemedText type="title">Plan your route</ThemedText>
      <TextInput
        value={query}
        onChangeText={handleSearchInput}
        placeholder="Search for places"
        style={[styles.searchInput, { marginTop: 12 }]}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {loading && (
        <View style={[styles.loadingRow, { marginTop: 8 }]}>
          <ActivityIndicator />
          <Text style={{ marginLeft: 8 }}>Searching…</Text>
        </View>
      )}
      {predictions.length > 0 && (
        <View style={[styles.predictionList, { marginTop: 8 }]}>
          <FlatList
            data={predictions}
            keyExtractor={(p) => p.place_id}
            renderItem={renderPrediction}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <ThemedText type="subtitle" style={{ marginTop: 16 }}>Milestones ({milestones.length}/10)</ThemedText>
      <View style={[styles.optionsRow, { marginTop: 8 }]}>
        <Pressable onPress={() => setUseTwoOpt(v => !v)}>
          <Text style={[styles.togglePill, useTwoOpt && styles.togglePillOn]}>2-opt</Text>
        </Pressable>
      </View>
      
      <View style={{ flex: 1, marginTop: 8 }}>
        <DraggableFlatList
          data={milestones}
          keyExtractor={(m) => m.id}
          renderItem={renderMilestone}
          onDragEnd={onDragEnd}
          activationDistance={12}
          containerStyle={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <Pressable
        disabled={!canProceed}
        style={[styles.primaryButton, !canProceed && { opacity: 0.5 }, { marginTop: 16 }]}
        onPress={onOptimize}
      >
        <Text style={styles.primaryButtonText}>Optimize & Start Route</Text>
      </Pressable>
    </ThemedView>
  );
}

