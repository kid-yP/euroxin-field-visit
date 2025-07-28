import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Image
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, doc, setDoc, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

const { width } = Dimensions.get('window');

const SAMPLE_LOCATIONS = [
  {
    id: 'loc1',
    name: 'Central Pharmacy',
    description: '24-hour pharmacy with full services',
    address: '123 Main St, Addis Ababa',
    type: 'pharmacy',
    lastVisit: '2 days ago',
    contact: 'Dr. Alemayehu (0912345678)',
    coords: {
      latitude: 9.005401,
      longitude: 38.763611
    },
    image: 'https://via.placeholder.com/150/007bff/ffffff?text=CP'
  },
  {
    id: 'loc2',
    name: 'City Hospital',
    description: 'General hospital with emergency services',
    address: '456 Health Ave, Addis Ababa',
    type: 'hospital',
    lastVisit: '1 week ago',
    contact: 'Dr. Selam (0911223344)',
    coords: {
      latitude: 9.015,
      longitude: 38.77
    },
    image: 'https://via.placeholder.com/150/ff3b30/ffffff?text=CH'
  },
  {
    id: 'loc3',
    name: 'Downtown Clinic',
    description: 'Primary care medical clinic',
    address: '789 Care Blvd, Addis Ababa',
    type: 'clinic',
    lastVisit: 'Never visited',
    contact: 'Nurse Tigist (0922334455)',
    coords: {
      latitude: 8.995,
      longitude: 38.755
    },
    image: 'https://via.placeholder.com/150/34c759/ffffff?text=DC'
  }
];

const POIScreen = ({ navigation }) => {
  const [locations, setLocations] = useState(SAMPLE_LOCATIONS);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Location access is required');
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        setUserLocation(userCoords);

        const updatedLocations = [...SAMPLE_LOCATIONS];
        updatedLocations[0].coords = {
          latitude: userCoords.latitude + (Math.random() * 0.001 - 0.0005),
          longitude: userCoords.longitude + (Math.random() * 0.001 - 0.0005)
        };

        setLocations(updatedLocations);
        setSelectedLocation(updatedLocations[0]);

        const allCoords = updatedLocations.map(loc => loc.coords);
        allCoords.push(userCoords);

        const lats = allCoords.map(c => c.latitude);
        const lngs = allCoords.map(c => c.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        setRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: (maxLat - minLat) * 1.5,
          longitudeDelta: (maxLng - minLng) * 1.5,
        });
      } catch (error) {
        console.error('Location error:', error);
        setRegion({
          latitude: 9.005401,
          longitude: 38.763611,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setLocations(SAMPLE_LOCATIONS);
        setSelectedLocation(SAMPLE_LOCATIONS[0]);
      } finally {
        setLoading(false);
      }
    };

    initializeLocation();
  }, []);

  const getLastVisit = async (poiId) => {
    try {
      const q = query(
        collection(db, 'visits'),
        where('userId', '==', auth.currentUser.uid),
        where('poiId', '==', poiId),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting last visit:', error);
      return null;
    }
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const handleMarkerPress = (location) => {
    setSelectedLocation(location);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const handleCheckIn = async (location) => {
    setProcessingId(location.id);
    try {
      const currentLocation = await Location.getCurrentPositionAsync({});
      const distance = calculateDistance(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        location.coords.latitude,
        location.coords.longitude
      );

      if (distance > 200) {
        Alert.alert('Too Far Away', `You're ${distance}m away (max 200m)`);
        return;
      }

      const visitRef = await addDoc(collection(db, 'visits'), {
        userId: auth.currentUser.uid,
        poiId: location.id,
        poiName: location.name,
        poiType: location.type,
        status: 'checked-in',
        checkInLocation: currentLocation.coords,
        timestamp: serverTimestamp(),
        notes: '',
      });

      await setDoc(
        doc(db, 'repLocations', auth.currentUser.uid),
        {
          userId: auth.currentUser.uid,
          name: auth.currentUser.displayName || 'Rep',
          currentStatus: ['checked-in'],
          lastCheckIn: {
            location: currentLocation.coords,
            timestamp: serverTimestamp(),
          },
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert(
        'Success', 
        'You are now checked in!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('EditVisitScreen', {
                visit: {
                  id: visitRef.id,
                  poiId: location.id,
                  poiName: location.name,
                  checkInLocation: currentLocation.coords,
                  timestamp: new Date(),
                  notes: '',
                  status: 'checked-in'
                }
              });
            }
          }
        ]
      );

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const getLocationIcon = (type) => {
    switch(type) {
      case 'hospital': return 'local-hospital';
      case 'clinic': return 'medical-services';
      default: return 'local-pharmacy';
    }
  };

  const getLocationColor = (type) => {
    switch(type) {
      case 'hospital': return '#FF3B30';
      case 'clinic': return '#34C759';
      default: return '#007AFF';
    }
  };

  const getMarkerSize = (type) => {
    return type === 'pharmacy' ? 40 : 32;
  };

  const getCheckInButtonColor = (dist) => {
    if (dist === null) return '#CCCCCC';
    return dist <= 200 ? '#34C759' : '#FF3B30';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading locations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapBox}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          region={region}
          loadingEnabled={true}
          onPress={() => {}}
        >
          {userLocation && (
            <Marker 
              coordinate={userLocation} 
              title="Your Location"
              tracksViewChanges={false}
            >
              <View style={styles.userMarker}>
                <Ionicons name="person-circle" size={40} color="#007bff" />
              </View>
            </Marker>
          )}

          {locations.map((location) => (
            <Marker
              key={location.id}
              coordinate={location.coords}
              title={location.name}
              description={location.address}
              onPress={() => handleMarkerPress(location)}
              tracksViewChanges={false}
            >
              <View style={[
                styles.markerContainer,
                selectedLocation?.id === location.id && styles.selectedMarker,
                { 
                  backgroundColor: getLocationColor(location.type),
                  padding: location.type === 'pharmacy' ? 18 : 14,
                }
              ]}>
                <MaterialIcons 
                  name={getLocationIcon(location.type)} 
                  size={getMarkerSize(location.type)} 
                  color="white" 
                />
                {location.type === 'pharmacy' && (
                  <View style={styles.pharmacyPulse} />
                )}
              </View>
            </Marker>
          ))}
        </MapView>

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

      <View style={styles.locationsBox}>
        <Text style={styles.locationsTitle}>Nearby Locations</Text>
        
        <ScrollView 
          contentContainerStyle={styles.locationsScroll}
          showsVerticalScrollIndicator={false}
        >
          {locations.map((location) => (
            <TouchableOpacity 
              key={location.id} 
              style={[
                styles.locationCard,
                selectedLocation?.id === location.id && styles.selectedLocationCard
              ]}
              onPress={() => handleLocationSelect(location)}
              activeOpacity={0.8}
            >
              <View style={styles.locationHeader}>
                <View style={[
                  styles.locationIconContainer,
                  { backgroundColor: getLocationColor(location.type) }
                ]}>
                  <MaterialIcons 
                    name={getLocationIcon(location.type)} 
                    size={28} 
                    color="white" 
                  />
                </View>
                <View style={styles.locationDetails}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationAddress}>{location.address}</Text>
                  <Text style={styles.locationDescription}>{location.description}</Text>
                </View>
              </View>
              
              <View style={styles.locationFooter}>
                <View style={styles.distanceBadge}>
                  <MaterialIcons name="directions-walk" size={16} color="white" />
                  <Text style={styles.distanceText}>
                    {userLocation 
                      ? `${calculateDistance(
                          userLocation.latitude,
                          userLocation.longitude,
                          location.coords.latitude,
                          location.coords.longitude
                        )}m`
                      : '--'}
                  </Text>
                </View>
                
                <View style={styles.visitBadge}>
                  <MaterialIcons name="history" size={16} color="#666" />
                  <Text style={styles.visitText}>{location.lastVisit}</Text>
                </View>
              </View>

              {location.contact && (
                <View style={styles.contactContainer}>
                  <MaterialIcons name="person" size={16} color="#666" />
                  <Text style={styles.contactText}>{location.contact}</Text>
                </View>
              )}
              
              <TouchableOpacity
                style={[
                  styles.checkInButton,
                  { 
                    backgroundColor: getCheckInButtonColor(
                      userLocation 
                        ? calculateDistance(
                            userLocation.latitude,
                            userLocation.longitude,
                            location.coords.latitude,
                            location.coords.longitude
                          )
                        : null
                    )
                  }
                ]}
                onPress={() => handleCheckIn(location)}
                disabled={processingId !== null}
              >
                {processingId === location.id ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <MaterialIcons name="login" size={20} color="white" />
                    <Text style={styles.checkInText}>Check In</Text>
                  </>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapBox: {
    height: width * 0.6,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  userMarker: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 6,
    borderWidth: 3,
    borderColor: '#007bff'
  },
  markerContainer: {
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  selectedMarker: {
    borderColor: 'white',
    transform: [{ scale: 1.3 }],
  },
  pharmacyPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#007AFF',
    opacity: 0.5,
    zIndex: -1,
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
  locationsBox: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    padding: 16,
  },
  locationsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#172B4D',
  },
  locationsScroll: {
    paddingBottom: 16,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedLocationCard: {
    borderColor: '#007bff',
    borderWidth: 1.5,
    backgroundColor: '#F5F9FF',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIconContainer: {
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#172B4D',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationDescription: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  locationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  distanceText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  visitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  visitText: {
    color: '#666',
    marginLeft: 6,
    fontSize: 14,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  checkInText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  contactText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
  },
});

export default POIScreen;
