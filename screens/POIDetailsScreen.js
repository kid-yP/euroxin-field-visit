// screens/POIDetailsScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { db, auth } from '../firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import * as Location from 'expo-location';

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function POIDetailsScreen({ route, navigation }) {
  const { poi } = route.params;
  const [lastVisit, setLastVisit] = useState(null);
  const [loadingVisit, setLoadingVisit] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    const fetchLastVisit = async () => {
      setLoadingVisit(true);
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const visitsRef = collection(db, 'visits');
        const q = query(
          visitsRef,
          where('userId', '==', userId),
          where('poiId', '==', poi.id),
          orderBy('timestamp', 'desc'),
          limit(1)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setLastVisit({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        } else {
          setLastVisit(null);
        }
      } catch (error) {
        console.error('Error fetching last visit:', error);
      } finally {
        setLoadingVisit(false);
      }
    };

    fetchLastVisit();
  }, [poi]);

  const handleCheckIn = async () => {
    setProcessing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required.');
        setProcessing(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const distance = getDistanceFromLatLonInMeters(
        location.coords.latitude,
        location.coords.longitude,
        poi.latitude,
        poi.longitude
      );

      if (distance > 200) {
        Alert.alert('Too Far', `You are ${Math.round(distance)} meters away from the POI.`);
        setProcessing(false);
        return;
      }

      // Create visit record
      const docRef = await addDoc(collection(db, 'visits'), {
        userId: auth.currentUser.uid,
        poiId: poi.id,
        timestamp: serverTimestamp(),
        status: 'checked-in',
        checkInLocation: location.coords,
        date: new Date().toISOString().slice(0, 10),
      });

      // Update repLocations doc
      await setDoc(doc(db, 'repLocations', auth.currentUser.uid), {
        userId: auth.currentUser.uid,
        name: auth.currentUser.displayName || 'Unknown',
        avatarURL: auth.currentUser.photoURL || '',
        coords: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        currentStatus: ['checked-in', 'moving'],
        lastCheckIn: {
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          timestamp: serverTimestamp(),
        },
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      Alert.alert('Success', 'You are now checked in.');
      setLastVisit({
        id: docRef.id,
        status: 'checked-in',
        timestamp: new Date(),
        checkInLocation: location.coords,
      });
    } catch (error) {
      Alert.alert('Error', `Failed to check in.\n${error.message}`);
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    if (!lastVisit || lastVisit.status !== 'checked-in') {
      Alert.alert('Not Checked In', 'You need to check in first.');
      return;
    }

    setProcessing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied');
        setProcessing(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      await performCheckout(location);
    } catch (error) {
      console.error('Checkout location error:', error);
      Alert.alert('Error', `Failed to get location.\n${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const performCheckout = async (location) => {
    try {
      const visitDocRef = doc(db, 'visits', lastVisit.id);

      await updateDoc(visitDocRef, {
        checkoutTime: serverTimestamp(),
        status: 'completed',
        checkOutLocation: location.coords,
      });

      const now = new Date();
      const checkInTime = lastVisit.timestamp?.toDate?.() || new Date();
      const durationMinutes = Math.floor((now - checkInTime) / 60000);

      // Prepare summary data for modal
      setSummaryData({
        distance: Math.round(
          getDistanceFromLatLonInMeters(
            lastVisit.checkInLocation.latitude,
            lastVisit.checkInLocation.longitude,
            location.coords.latitude,
            location.coords.longitude
          )
        ),
        checkInTime,
        duration: durationMinutes,
      });

      setLastVisit((prev) => ({
        ...prev,
        status: 'completed',
        checkoutTime: new Date(),
      }));

      setShowSummary(true);

      // Update repLocations document to mark rep offline or idle on checkout (optional)
      await setDoc(doc(db, 'repLocations', auth.currentUser.uid), {
        currentStatus: ['idle'],
        lastUpdated: serverTimestamp(),
      }, { merge: true });

    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', `Failed to check out.\n${error.message}`);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{poi.name}</Text>

        <View style={styles.infoBox}>
          {Object.entries(poi).map(([key, value]) => {
            if (['id', 'latitude', 'longitude'].includes(key)) return null;
            return (
              <View key={key} style={styles.infoRow}>
                <Text style={styles.infoKey}>{key}:</Text>
                <Text style={styles.infoValue}>{value?.toString()}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.lastVisitBox}>
          <Text style={styles.sectionTitle}>Last Visit</Text>
          {loadingVisit ? (
            <ActivityIndicator />
          ) : lastVisit ? (
            <>
              <Text>Contact: {lastVisit.contactName || 'N/A'}</Text>
              <Text>
                Date:{' '}
                {lastVisit.date ||
                  (lastVisit.timestamp?.toDate
                    ? lastVisit.timestamp.toDate().toLocaleString()
                    : 'N/A')}
              </Text>
              <Text>Status: {lastVisit.status || 'N/A'}</Text>
              <Text>Notes: {lastVisit.notes || 'None'}</Text>
            </>
          ) : (
            <Text>No previous visits.</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#007bff' }]}
          onPress={handleCheckIn}
          disabled={processing}
        >
          <Text style={styles.buttonText}>
            {processing ? 'Processing...' : 'Check In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor:
                lastVisit && lastVisit.status === 'checked-in' ? '#28a745' : 'gray',
              marginTop: 12,
            },
          ]}
          onPress={handleCheckOut}
          disabled={processing || !(lastVisit && lastVisit.status === 'checked-in')}
        >
          <Text style={styles.buttonText}>
            {processing ? 'Processing...' : 'Check Out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Visit Summary Modal */}
      <Modal visible={showSummary} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.summaryModal}>
            <Text style={styles.modalTitle}>Visit Summary</Text>

            {summaryData && (
              <>
                <View style={styles.summaryItem}>
                  <Text style={styles.label}>📍 Distance Moved</Text>
                  <Text style={styles.value}>{summaryData.distance} meters</Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.label}>🕒 Check-in Time</Text>
                  <Text style={styles.value}>
                    {summaryData.checkInTime.toLocaleTimeString()}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.label}>⏱️ Duration</Text>
                  <Text style={styles.value}>{summaryData.duration} minutes</Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#28a745', marginTop: 18 }]}
              onPress={() => setShowSummary(false)}
            >
              <Text style={styles.buttonText}>✅ Confirm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setShowSummary(false);
                navigation.navigate('EditVisit', { visit: lastVisit });
              }}
            >
              <Text style={styles.editButtonText}>✏️ Edit Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
  infoBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  infoKey: { fontWeight: 'bold', marginRight: 6, textTransform: 'capitalize' },
  infoValue: { flex: 1, flexWrap: 'wrap' },
  lastVisitBox: { marginBottom: 30 },
  sectionTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 10 },
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryModal: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    width: '85%',
    borderColor: '#ccc',
    borderWidth: 1,
    alignItems: 'center',
  },
  modalTitle: { fontWeight: 'bold', fontSize: 20, marginBottom: 10 },
  summaryItem: {
    backgroundColor: '#f6f6f6',
    borderRadius: 6,
    padding: 10,
    width: '100%',
    marginVertical: 6,
  },
  label: { fontWeight: '600', color: '#333', marginBottom: 4 },
  value: { color: '#555' },
  editButton: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#007bff',
    width: '100%',
    alignItems: 'center',
  },
  editButtonText: { color: '#007bff', fontWeight: 'bold' },
});

