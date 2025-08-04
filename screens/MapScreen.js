
//This page is not used anymore!
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Sample POI data
const SAMPLE_POIS = [
  {
    id: '1',
    name: 'Main Office',
    description: 'Company headquarters',
    type: 'office',
    status: 'active',
    coords: { latitude: 9.005401, longitude: 38.763611 }
  },
  {
    id: '2',
    name: 'Central Warehouse',
    description: 'Primary storage facility',
    type: 'warehouse',
    status: 'inactive',
    coords: { latitude: 9.015, longitude: 38.75 }
  },
  {
    id: '3',
    name: 'Downtown Pharmacy',
    description: '24-hour pharmacy',
    type: 'pharmacy',
    status: 'active',
    coords: { latitude: 9.008, longitude: 38.76 }
  }
];

const MapScreen = ({ navigation }) => {
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const mapRef = useRef(null);

  // Get icon based on POI type
  const getPoiIcon = (type) => {
    switch(type) {
      case 'office': return 'business';
      case 'warehouse': return 'warehouse';
      case 'pharmacy': return 'local-pharmacy';
      default: return 'place';
    }
  };

  // Get color based on POI status
  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#00C853'; // Green
      case 'inactive': return '#FFAB00'; // Yellow
      default: return '#FF3B30'; // Red
    }
  };

  // Setup map and user location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });

      } catch (err) {
        console.error("Location error:", err);
        setError('Error getting location');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-zoom to show all markers when map is ready
  const handleMapReady = () => {
    if (mapRef.current && SAMPLE_POIS.length > 0) {
      mapRef.current.fitToElements({
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading map...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        region={region}
        showsUserLocation
        showsMyLocationButton
        loadingEnabled={true}
        onMapReady={handleMapReady}
      >
        {SAMPLE_POIS.map(poi => (
          <Marker
            key={poi.id}
            coordinate={poi.coords}
            onPress={() => setSelectedPoi(poi)}
          >
            <View style={styles.markerContainer}>
              <View style={[
                styles.markerPin,
                { backgroundColor: getStatusColor(poi.status) }
              ]}>
                <MaterialIcons 
                  name={getPoiIcon(poi.type)} 
                  size={24} 
                  color="white" 
                />
              </View>
              <View style={[
                styles.markerPointer,
                { borderTopColor: getStatusColor(poi.status) }
              ]} />
              {selectedPoi?.id === poi.id && (
                <View style={[
                  styles.pulseEffect,
                  { backgroundColor: getStatusColor(poi.status) }
                ]} />
              )}
            </View>
            <Callout onPress={() => navigation.navigate('POIDetails', { poi })}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{poi.name}</Text>
                <Text style={styles.calloutDescription}>{poi.description}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(poi.status) + '20' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(poi.status) }
                  ]}>
                    {poi.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Active POIs Counter */}
      <View style={styles.activeBadge}>
        <Text style={styles.activeBadgeText}>
          {SAMPLE_POIS.filter(poi => poi.status === 'active').length}
        </Text>
        <Text style={styles.activeBadgeLabel}>Active Locations</Text>
      </View>

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={() => {
            setRegion(prev => ({
              ...prev,
              latitudeDelta: Math.max(prev.latitudeDelta / 2, 0.001),
              longitudeDelta: Math.max(prev.longitudeDelta / 2, 0.001),
            }));
          }}
        >
          <MaterialIcons name="zoom-in" size={24} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.zoomBtn}
          onPress={() => {
            setRegion(prev => ({
              ...prev,
              latitudeDelta: Math.min(prev.latitudeDelta * 2, 100),
              longitudeDelta: Math.min(prev.longitudeDelta * 2, 100),
            }));
          }}
        >
          <MaterialIcons name="zoom-out" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9FFFA',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    marginVertical: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    marginTop: -5,
  },
  pulseEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    opacity: 0.3,
    zIndex: -1,
  },
  calloutContainer: {
    width: 200,
    padding: 12,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
    color: '#172B4D',
  },
  calloutDescription: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 123, 255, 0.9)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },
  activeBadgeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 6,
  },
  activeBadgeLabel: {
    color: 'white',
    fontSize: 14,
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
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MapScreen;
