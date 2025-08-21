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
  Image,
  RefreshControl
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  serverTimestamp, 
  query, 
  getDocs, 
  GeoPoint 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';

const { width } = Dimensions.get('window');

const POIScreen = ({ navigation }) => {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const mapRef = useRef(null);

  const validateCoordinates = (coords) => {
    if (!coords) return { latitude: 0, longitude: 0 };
    return {
      latitude: typeof coords.latitude === 'number' ? coords.latitude : 0,
      longitude: typeof coords.longitude === 'number' ? coords.longitude : 0
    };
  };

  const fetchPOIs = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'pois'));
      const querySnapshot = await getDocs(q);
      
      const pois = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        const contact = typeof data.contact === 'object' 
          ? `${data.contact.name || ''} ${data.contact.phone || ''}`.trim()
          : data.contact || '';
        
        pois.push({
          id: doc.id,
          name: data.name || 'Unnamed POI',
          description: data.description || '',
          address: data.address || '',
          type: data.category === 'facility' ? 'hospital' : 'pharmacy',
          contact: contact,
          coords: validateCoordinates(data.location),
          image: data.image || null,
        });
      });

      setLocations(pois);
      if (pois.length > 0) setSelectedLocation(pois[0]);
      return pois;
    } catch (error) {
      console.error('Error fetching POIs:', error);
      Alert.alert('Error', 'Failed to load locations');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is required');
        return null;
      }
      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  };

  const calculateRegion = (userCoords, pois) => {
    const allCoords = pois.map(poi => poi.coords);
    if (userCoords) allCoords.push(userCoords);

    if (allCoords.length === 0) {
      return {
        latitude: 9.005401,
        longitude: 38.763611,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    const lats = allCoords.map(c => c.latitude);
    const lngs = allCoords.map(c => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5,
      longitudeDelta: (maxLng - minLng) * 1.5,
    };
  };

  const initializeMap = async () => {
    try {
      const [userCoords, pois] = await Promise.all([
        fetchUserLocation(),
        fetchPOIs()
      ]);
      setUserLocation(userCoords);
      setRegion(calculateRegion(userCoords, pois));
    } catch (error) {
      console.error('Initialization error:', error);
      setRegion({
        latitude: 9.005401,
        longitude: 38.763611,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeMap();
    setRefreshing(false);
  };

  useEffect(() => {
    initializeMap();
  }, []);

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
  };

  const handleCheckIn = async (location) => {
    if (!auth.currentUser?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

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

      const geoPoint = new GeoPoint(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );

      const visitRef = await addDoc(collection(db, 'visits'), {
        userId: auth.currentUser.uid,
        poiId: location.id,
        poiName: location.name,
        poiAddress: location.address,
        poiContact: location.contact,
        poiType: location.type,
        status: 'checked-in',
        checkInTime: serverTimestamp(),
        timestamp: serverTimestamp(),
        notes: '',
        checkInLocation: geoPoint
      });

      await setDoc(
        doc(db, 'repLocations', auth.currentUser.uid),
        {
          userId: auth.currentUser.uid,
          name: auth.currentUser.displayName || 'Rep',
          currentStatus: ['checked-in'],
          lastCheckIn: {
            location: geoPoint,
            timestamp: serverTimestamp(),
          },
          lastUpdated: serverTimestamp(),
          currentVisitId: visitRef.id,
          currentPoiId: location.id
        },
        { merge: true }
      );

      navigation.navigate('VisitDetails', {
        visit: {
          id: visitRef.id,
          userId: auth.currentUser.uid,
          poiId: location.id,
          poiName: location.name,
          checkInTime: serverTimestamp(),
          timestamp: serverTimestamp(),
          notes: '',
          status: 'checked-in',
          checkInLocation: geoPoint
        }
      });

    } catch (error) {
      console.error('Check-in error:', error);
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
    return type === 'pharmacy' ? 28 : 24;
  };

  const getCheckInButtonColor = (dist) => {
    if (dist === null) return '#CCCCCC';
    return dist <= 200 ? '#34C759' : '#FF3B30';
  };

  if (loading && !refreshing) {
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
          provider={PROVIDER_GOOGLE}
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
                <Ionicons name="person-circle" size={50} color="#007bff" />
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
                }
              ]}>
                <View style={styles.markerIconBackground}>
                  <MaterialIcons 
                    name={getLocationIcon(location.type)} 
                    size={getMarkerSize(location.type)} 
                    color="white" 
                  />
                </View>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007bff']}
              tintColor="#007bff"
            />
          }
        >
          {locations.length === 0 && !loading ? (
            <View style={styles.noLocationsContainer}>
              <Ionicons name="location-off" size={50} color="#CCCCCC" />
              <Text style={styles.noLocationsText}>No locations found</Text>
            </View>
          ) : (
            locations.map((location) => (
              <TouchableOpacity 
                key={location.id} 
                style={[
                  styles.locationCard,
                  selectedLocation?.id === location.id && styles.selectedLocationCard
                ]}
                onPress={() => handleLocationSelect(location)}
                activeOpacity={0.8}
              >
                {location.image && (
                  <Image 
                    source={{ uri: location.image }} 
                    style={styles.locationImage}
                    resizeMode="cover"
                  />
                )}
                
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
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

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
  noLocationsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noLocationsText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins-Regular',
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
    borderRadius: 30,
    padding: 8,
    borderWidth: 3,
    borderColor: '#007bff'
  },
  markerContainer: {
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 6,
    padding: 10,
  },
  markerIconBackground: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  selectedMarker: {
    borderColor: 'white',
    transform: [{ scale: 1.3 }],
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  pharmacyPulse: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#007AFF',
    opacity: 0.6,
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
    fontFamily: 'Poppins-SemiBold',
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
  locationImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
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
    fontFamily: 'Poppins-SemiBold',
    color: '#172B4D',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginBottom: 4,
  },
  locationDescription: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#888',
    fontStyle: 'italic',
  },
  locationFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 12,
    marginBottom: 4,
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
    fontFamily: 'Poppins-SemiBold',
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
    fontFamily: 'Poppins-SemiBold',
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
    fontFamily: 'Poppins-Regular',
    color: '#555',
  },
});

export default POIScreen;
