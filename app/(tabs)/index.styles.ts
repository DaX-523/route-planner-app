import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
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
      color: '#fff',
      
    },
    togglePillOn: {
      backgroundColor: '#1D3D47',
      borderColor: '#1D3D47',
      color: 'white',
    },
  
  });
  