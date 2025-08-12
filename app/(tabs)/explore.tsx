import React from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useRecentTrips, RecentTrip } from '@/app/contexts/RecentTripsContext';
import { formatDistanceKm } from '@/lib/utils/geo';

export default function RecentTripsScreen() {
  const { recentTrips, removeRecentTrip, clearAllTrips, isLoading } = useRecentTrips();
  const router = useRouter();

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = (minutes % 60).toFixed(0);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleTripPress = (trip: RecentTrip) => {
    // Navigate to route details with the stored route
    router.push({
      pathname: '/route-details' as any,
      params: {
        route: JSON.stringify(trip.route),
      },
    });
  };

  const handleDeleteTrip = (trip: RecentTrip) => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${trip.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => removeRecentTrip(trip.id)
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Trips',
      'Are you sure you want to delete all recent trips?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => clearAllTrips()
        },
      ]
    );
  };

  const renderTripItem = ({ item }: { item: RecentTrip }) => (
    <Pressable style={styles.tripItem} onPress={() => handleTripPress(item)}>
      <View style={styles.tripHeader}>
        <View style={styles.tripIcon}>
          <IconSymbol name="map" size={20} color="#1D3D47" />
        </View>
        <View style={styles.tripInfo}>
          <Text style={styles.tripName}>{item.name}</Text>
          <Text style={styles.tripDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Pressable 
          style={styles.deleteButton}
          onPress={() => handleDeleteTrip(item)}
        >
          <IconSymbol name="trash" size={16} color="#999" />
        </Pressable>
      </View>
      <View style={styles.tripStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.milestoneCount}</Text>
          <Text style={styles.statLabel}>stops</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDistanceKm(item.totalDistance)}</Text>
          <Text style={styles.statLabel}>distance</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatTime(item.estimatedTotalTime)}</Text>
          <Text style={styles.statLabel}>time</Text>
        </View>
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Recent Trips</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1D3D47" />
          <Text style={styles.loadingText}>Loading trips...</Text>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Recent Trips</ThemedText>
        {recentTrips.length > 0 && (
          <Pressable onPress={handleClearAll}>
            <Text style={styles.clearAllButton}>Clear All</Text>
          </Pressable>
        )}
      </View>
      
      {recentTrips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="map" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Recent Trips</Text>
          <Text style={styles.emptyMessage}>
            Start planning routes to see them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={recentTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  clearAllButton: {
    color: '#ff4444',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
  },
  tripItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  tripDate: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D3D47',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
});
