import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { collection, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function RepTrackingScreen({ navigation }) {
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 9.03,
    longitude: 38.75,
    latitudeDelta: 0.3,
    longitudeDelta: 0.3,
  });

  useEffect(() => {
    let unsubscribe;

    const fetchReps = async () => {
      try {
        // First load with getDocs for initial data
        const snapshot = await getDocs(collection(db, 'repLocations'));
        const initialReps = snapshot.docs.map(doc => ({
          id: doc.id,
          ...formatRepData(doc.data())
        }));
        setReps(initialReps);
        setLoading(false);

        // Set up real-time listener
        unsubscribe = onSnapshot(collection(db, 'repLocations'), (snapshot) => {
          const updatedReps = snapshot.docs.map(doc => ({
            id: doc.id,
            ...formatRepData(doc.data())
          }));
          setReps(updatedReps);
        });

      } catch (error) {
        console.error('Error fetching rep data:', error);
        Alert.alert('Error', 'Failed to load representative data');
        setLoading(false);
      }
    };

    const formatRepData = (repData) => {
      return {
        name: repData.name || 'Unknown',
        userId: repData.userId || '',
        avatarURL: repData.avatarURL || 'https://via.placeholder.com/150',
        currentStatus: Array.isArray(repData.currentStatus) ? repData.currentStatus : ['offline'],
        coords: repData.lastCheckIn?.location || null,
        lastUpdated: repData.lastUpdated?.toDate?.() || null,
        lastCheckIn: {
          location: repData.lastCheckIn?.location || null,
          timestamp: repData.lastCheckIn?.timestamp?.toDate?.() || null
        }
      };
    };

    fetchReps();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getStatusColor = (statusArray = []) => {
    if (!Array.isArray(statusArray) || statusArray.length === 0) return '#FF3B30';
    if (statusArray.includes('checked-in')) return '#00C853';
    if (statusArray.includes('moving')) return '#FFAB00';
    if (statusArray.includes('idle')) return '#FFAB00';
    return '#FF3B30';
  };

  const getStatusText = (statusArray = []) => {
    if (!Array.isArray(statusArray)) return 'Offline';
    if (statusArray.includes('checked-in')) return 'Check';
    if (statusArray.includes('moving')) return 'Moving';
    if (statusArray.includes('idle')) return 'Idle';
    return 'Offline';
  };

  const activeRepsCount = reps.filter(rep => 
    Array.isArray(rep.currentStatus) && 
    (rep.currentStatus.includes('checked-in') || 
     rep.currentStatus.includes('moving') ||
     rep.currentStatus.includes('idle'))
  ).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading representatives...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map Container */}
      <View style={styles.mapBox}>
        <MapView style={styles.map} region={region}>
          {reps.map((rep) => {
            if (!rep.coords?.latitude || !rep.coords?.longitude) return null;
            return (
              <Marker
                key={rep.id}
                coordinate={{
                  latitude: rep.coords.latitude,
                  longitude: rep.coords.longitude,
                }}
                title={rep.name}
                description={`Status: ${getStatusText(rep.currentStatus)}`}
              >
                <View style={styles.markerContainer}>
                  <Ionicons
                    name="person-circle"
                    size={32}
                    color={getStatusColor(rep.currentStatus)}
                  />
                  {rep.currentStatus?.includes('checked-in') && (
                    <View style={[styles.statusPulse, { backgroundColor: getStatusColor(rep.currentStatus) }]} />
                  )}
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* Active Reps Badge */}
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>{activeRepsCount}</Text>
          <Text style={styles.activeBadgeLabel}>Active</Text>
        </View>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() =>
              setRegion((prev) => ({
                ...prev,
                latitudeDelta: Math.max(prev.latitudeDelta / 2, 0.001),
                longitudeDelta: Math.max(prev.longitudeDelta / 2, 0.001),
              }))
            }
          >
            <Ionicons name="add" size={20} color="#007bff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() =>
              setRegion((prev) => ({
                ...prev,
                latitudeDelta: Math.min(prev.latitudeDelta * 2, 100),
                longitudeDelta: Math.min(prev.longitudeDelta * 2, 100),
              }))
            }
          >
            <Ionicons name="remove" size={20} color="#007bff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Field Representatives Box */}
      <View style={styles.repsContainer}>
        <View style={styles.repsHeader}>
          <MaterialIcons name="location-on" size={24} color="#007bff" />
          <Text style={styles.repsTitle}>Field Representatives</Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.repsScrollContent}
        >
          {reps.map((rep) => (
            <TouchableOpacity 
              key={rep.id} 
              style={styles.repCard}
              onPress={() => {
                if (rep.coords?.latitude && rep.coords?.longitude) {
                  setRegion({
                    latitude: rep.coords.latitude,
                    longitude: rep.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
                }
              }}
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: rep.avatarURL }}
                  style={styles.avatar}
                  defaultSource={{ uri: 'https://via.placeholder.com/150' }}
                />
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: getStatusColor(rep.currentStatus) }
                ]} />
              </View>
              <Text style={styles.repName} numberOfLines={1}>
                {rep.name}
              </Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(rep.currentStatus) + '20' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(rep.currentStatus) }
                ]}>
                  {getStatusText(rep.currentStatus)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9FFFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E9FFFA',
  },
  mapBox: {
    height: width * 0.75,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    backgroundColor: 'white',
    top: -4,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    position: 'relative',
  },
  statusPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    opacity: 0.3,
  },
  activeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 123, 255, 0.9)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    minWidth: 60,
    justifyContent: 'center',
  },
  activeBadgeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 4,
    fontFamily: 'Poppins-Bold',
  },
  activeBadgeLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  zoomControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  zoomBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    marginTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E0E0E0',
    bottom: 18,
    marginBottom: -18,
  },
  repsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  repsTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#172B4D',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  repsScrollContent: {
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  repCard: {
    width: 90,
    alignItems: 'center',
    marginRight: 16,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: -3,
    height: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -26,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'white',
  },
  repName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#172B4D',
    textAlign: 'center',
    marginBottom: 6,
    bottom: -33,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: 'center',
    bottom: -28,
  },
  statusText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    textAlign: 'center',
  },
});
