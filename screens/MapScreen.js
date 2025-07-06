import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import * as Location from 'expo-location';

export default function MapScreen({ navigation }) {
  const [pois, setPOIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(null);

  useEffect(() => {
    (async () => {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        setLoading(false);
        return;
      }

      // Get current user location
      const location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      // Fetch POIs from Firestore
      try {
        const snapshot = await getDocs(collection(db, 'pois'));
        const poiData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(
            (poi) =>
              typeof poi.latitude === 'number' &&
              typeof poi.longitude === 'number' &&
              !isNaN(poi.latitude) &&
              !isNaN(poi.longitude)
          );
        setPOIs(poiData);
      } catch (error) {
        console.error('Failed to fetch POIs:', error);
        alert('Failed to load POIs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!region || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
      >
        {pois.map((poi) => (
          <Marker
            key={poi.id}
            coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
            title={poi.name}
            description={poi.description || ''}
            onPress={() => {
              if (poi && poi.id) {
                navigation.navigate('POIDetails', { poi });
              } else {
                alert('Invalid POI data');
              }
            }}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
