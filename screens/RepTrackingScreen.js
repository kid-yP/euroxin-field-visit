// screens/RepTrackingScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Ionicons } from '@expo/vector-icons';

export default function RepTrackingScreen() {
  const [reps, setReps] = useState([]);
  const [region, setRegion] = useState({
    latitude: 9.03,
    longitude: 38.75,
    latitudeDelta: 0.3,
    longitudeDelta: 0.3,
  });

  useEffect(() => {
    const fetchReps = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'repLocations'));
        const repData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReps(repData);
      } catch (error) {
        console.error('Error fetching rep data:', error);
      }
    };

    fetchReps();
  }, []);

  const getStatusColor = (statusArray = []) => {
    if (!Array.isArray(statusArray) || statusArray.length === 0) return 'red';
    if (statusArray.includes('checked-in')) return 'green';
    if (statusArray.includes('moving') || statusArray.includes('idle')) return 'orange';
    return 'red';
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
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
                title={rep.name || 'Unnamed Rep'}
                description={`Status: ${
                  Array.isArray(rep.currentStatus)
                    ? rep.currentStatus.join(', ')
                    : 'N/A'
                }`}
              >
                <Ionicons
                  name="person-circle"
                  size={32}
                  color={getStatusColor(rep.currentStatus)}
                />
              </Marker>
            );
          })}
        </MapView>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() =>
              setRegion((prev) => ({
                ...prev,
                latitudeDelta: prev.latitudeDelta / 2,
                longitudeDelta: prev.longitudeDelta / 2,
              }))
            }
          >
            <Text style={styles.zoomText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() =>
              setRegion((prev) => ({
                ...prev,
                latitudeDelta: prev.latitudeDelta * 2,
                longitudeDelta: prev.longitudeDelta * 2,
              }))
            }
          >
            <Text style={styles.zoomText}>-</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Timeline View */}
      <View style={styles.timelineContainer}>
        <Text style={styles.timelineTitle}>All Field Reps</Text>
        <ScrollView>
          {reps.map((rep) => (
            <View key={rep.id} style={styles.repItem}>
              <Image
                source={{ uri: rep.avatarURL || 'https://via.placeholder.com/50' }}
                style={styles.avatar}
              />
              <View style={styles.repInfo}>
                <Text style={styles.repName}>{rep.name || 'Unnamed Rep'}</Text>
                <Text style={styles.repTime}>
                  Last Check-in:{' '}
                  {rep.lastCheckIn?.timestamp?.toDate
                    ? rep.lastCheckIn.timestamp.toDate().toLocaleTimeString()
                    : 'N/A'}
                </Text>
              </View>
              <Ionicons
                name="radio-button-on"
                size={18}
                color={getStatusColor(rep.currentStatus)}
                style={{ marginLeft: 6 }}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  map: { width: '100%', height: '100%' },
  zoomControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'column',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 8,
    padding: 4,
  },
  zoomBtn: {
    padding: 6,
    alignItems: 'center',
  },
  zoomText: { fontSize: 18, fontWeight: 'bold' },
  timelineContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopColor: '#eee',
    borderTopWidth: 1,
    height: '45%',
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#007bff',
  },
  repItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  repInfo: {
    flex: 1,
  },
  repName: {
    fontSize: 16,
    fontWeight: '600',
  },
  repTime: {
    fontSize: 12,
    color: '#666',
  },
});
