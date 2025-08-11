import React from 'react';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Milestone, RouteSegment } from '@/app/utils/types';

export function RouteMap({
  milestones,
  segments,
  userLocation,
  focusId,
}: {
  milestones: Milestone[];
  segments: RouteSegment[];
  userLocation?: { latitude: number; longitude: number } | null;
  focusId?: string | null;
}) {
  const initialRegion = React.useMemo(() => {
    const points = milestones.length
      ? milestones.map(m => m.coordinates)
      : userLocation
        ? [{ latitude: userLocation.latitude, longitude: userLocation.longitude }]
        : [];
    if (points.length === 0) {
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }
    const lat = points.reduce((a, p) => a + p.latitude, 0) / points.length;
    const lng = points.reduce((a, p) => a + p.longitude, 0) / points.length;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
  }, [milestones, userLocation]);

  // For now we don't switch between controlled/uncontrolled region to avoid crashes.
  // If focus is needed, animate camera with a ref rather than toggling the region prop.

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text>Map preview not available on Web in this view.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
      >
        {segments.length > 0 && (
          <Polyline
            coordinates={segments.flatMap((s) => [s.from.coordinates, s.to.coordinates])}
            strokeColor="#1D3D47"
            strokeWidth={4}
          />
        )}
        {milestones.map((m, idx) => (
          <Marker
            key={m.id}
            coordinate={m.coordinates}
            title={`${idx + 1}. ${m.name}`}
            description={m.address}
            pinColor={m.completed ? '#7cb342' : '#1D3D47'}
          />
        ))}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="You"
            pinColor="#1976d2"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: 'white',
  },
});


