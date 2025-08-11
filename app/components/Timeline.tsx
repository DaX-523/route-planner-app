import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Milestone } from '@/app/utils/types';

export interface TimelineItemData {
  milestone: Milestone;
  arrivalMinutes: number;
}

export function Timeline({
  items,
  currentMilestoneId,
  onPressItem,
}: {
  items: TimelineItemData[];
  currentMilestoneId?: string | null;
  onPressItem?: (milestoneId: string) => void;
}) {
  const renderItem = ({ item, index }: { item: TimelineItemData; index: number }) => {
    const isCurrent = currentMilestoneId === item.milestone.id;
    const isCompleted = item.milestone.completed;
    return (
      <Pressable
        onPress={() => onPressItem?.(item.milestone.id)}
        style={[styles.card, isCurrent && styles.cardCurrent, isCompleted && styles.cardCompleted]}
      >
        <View style={styles.badge}><Text style={styles.badgeText}>{index + 1}</Text></View>
        <Text numberOfLines={1} style={styles.title}>{item.milestone.name}</Text>
        <Text style={styles.subtle}>{formatMinutes(item.arrivalMinutes)} • stay {formatStay(item.milestone.estimatedDuration)}</Text>
      </Pressable>
    );
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.milestone.id}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
    />
  );
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatStay(mins: number): string {
  if (mins === 60) return '1h';
  if (mins === 120) return '2h';
  return `${mins}m`;
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
    gap: 8,
  },
  card: {
    width: 220,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginRight: 8,
  },
  cardCurrent: {
    borderColor: '#1D3D47',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardCompleted: {
    opacity: 0.6,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1D3D47',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  badgeText: { color: 'white', fontWeight: '700' },
  title: { fontWeight: '700' },
  subtle: { color: '#666', marginTop: 4 },
});


