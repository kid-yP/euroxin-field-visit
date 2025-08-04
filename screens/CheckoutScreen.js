import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  addDoc, 
  collection, 
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export default function CheckoutScreen({ route, navigation }) {
  // Safely extract visit data with defaults
  const { visit = {} } = route.params || {};
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState(visit.notes || '');
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const initializeData = () => {
    try {
      // Safely parse checkInTime
      let parsedCheckInTime;
      if (visit.checkInTime) {
        parsedCheckInTime = visit.checkInTime.toDate 
          ? visit.checkInTime.toDate() 
          : new Date(visit.checkInTime);
      } else if (visit.timestamp) {
        parsedCheckInTime = visit.timestamp.toDate 
          ? visit.timestamp.toDate() 
          : new Date(visit.timestamp);
      } else {
        parsedCheckInTime = new Date();
      }
      setCheckInTime(parsedCheckInTime);

      // Calculate duration if checkInTime exists
      if (parsedCheckInTime) {
        const now = new Date();
        const duration = Math.round((now - parsedCheckInTime) / (1000 * 60));
        setDurationMinutes(duration);
        setCheckOutTime(now);
      }

      // If durationSeconds was passed, use that for more accuracy
      if (visit.durationSeconds) {
        const minutesFromSeconds = Math.floor(visit.durationSeconds / 60);
        setDurationMinutes(minutesFromSeconds);
      }
    } catch (error) {
      console.error('Error initializing checkout data:', error);
      // Fallback values
      setCheckInTime(new Date());
      setCheckOutTime(new Date());
      setDurationMinutes(0);
    }
  };

  useEffect(() => {
    initializeData();
  }, [visit]);

  const onRefresh = () => {
    setRefreshing(true);
    initializeData();
    setRefreshing(false);
  };

  const formatTime = (date) => {
    if (!date) return 'Not recorded';
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const handleSubmitVisit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!auth.currentUser?.uid) {
        throw new Error('User not authenticated');
      }

      // Ensure we have at least a POI name if ID is missing
      if (!visit?.poiName) {
        throw new Error('Please provide at least a location name');
      }

      const currentTimestamp = serverTimestamp();
      const now = new Date();

      // Prepare visit data with all required fields
      const visitData = {
        notes,
        checkOutTime: currentTimestamp,
        status: 'completed',
        durationMinutes: durationMinutes,
        durationSeconds: visit.durationSeconds || durationMinutes * 60,
        date: Timestamp.fromDate(now), // For grouping in HomeScreen
        timestamp: currentTimestamp,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Rep',
        poiId: visit.poiId || 'unknown-poi',
        poiName: visit.poiName || 'Unknown Location',
        contactName: visit.contactName || null,
        checkInTime: visit.checkInTime || currentTimestamp,
        checkInLocation: visit.checkInLocation || null
      };

      // Update or create visit document
      let visitId = visit.id;
      if (visit.id && visit.id !== 'new-visit') {
        await updateDoc(doc(db, 'visits', visit.id), visitData);
      } else {
        const docRef = await addDoc(collection(db, 'visits'), visitData);
        visitId = docRef.id;
      }

      // Only update POI if we have a poiId
      if (visit.poiId) {
        await setDoc(
          doc(db, 'pois', visit.poiId),
          {
            lastVisit: currentTimestamp,
            lastVisitBy: auth.currentUser.uid,
            lastVisitName: auth.currentUser.displayName || 'Rep',
            lastVisitDuration: durationMinutes
          },
          { merge: true }
        );
      }

      // Update rep status
      await setDoc(
        doc(db, 'repLocations', auth.currentUser.uid),
        {
          currentStatus: ['available'],
          lastCheckOut: currentTimestamp,
          lastUpdated: currentTimestamp,
          lastPoiVisited: visit.poiId || null,
          lastPoiName: visit.poiName || null
        },
        { merge: true }
      );

      // Create visit history log
      await addDoc(collection(db, 'visitHistory'), {
        ...visitData,
        visitId: visitId,
        checkOutTime: currentTimestamp
      });

      // Success - navigate to Home screen with stack reset
      Alert.alert(
        'Visit Completed',
        'Your visit has been successfully recorded!',
        [
          {
            text: 'OK',
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'Tabs' }]
            })
          }
        ]
      );

    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert(
        'Error',
        error.message || 'Could not complete visit. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!checkInTime) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading visit data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2962FF']}
            tintColor="#2962FF"
          />
        }
      >
        {/* POI Information Card */}
        <View style={[styles.card, { backgroundColor: '#E6F7FF' }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={20} color="#2962FF" />
            <Text style={styles.cardTitle}>POI Information</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="business" size={18} color="#6B778C" />
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{visit.poiName || 'Unknown POI'}</Text>
          </View>
          
          {visit.poiAddress && (
            <View style={styles.infoRow}>
              <Ionicons name="map" size={18} color="#6B778C" />
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>{visit.poiAddress}</Text>
            </View>
          )}
        </View>

        {/* Visit Details Card */}
        <View style={[styles.card, { backgroundColor: '#FFF5E6' }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={20} color="#FF6B00" />
            <Text style={styles.cardTitle}>Visit Details</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="log-in" size={18} color="#6B778C" />
            <Text style={styles.infoLabel}>Check-in:</Text>
            <Text style={styles.infoValue}>{formatTime(checkInTime)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="log-out" size={18} color="#6B778C" />
            <Text style={styles.infoLabel}>Check-out:</Text>
            <Text style={styles.infoValue}>{formatTime(checkOutTime)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="hourglass" size={18} color="#6B778C" />
            <Text style={styles.infoLabel}>Duration:</Text>
            <Text style={styles.infoValue}>
              {formatDuration(durationMinutes)} ({(durationMinutes)} mins)
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="flag" size={18} color="#6B778C" />
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={[
              styles.statusBadge,
              { 
                backgroundColor: '#E6FFEE',
                borderColor: '#00C853'
              }
            ]}>
              <Text style={[
                styles.statusText,
                { color: '#00C853' }
              ]}>
                Completing Visit
              </Text>
            </View>
          </View>
        </View>

        {/* Notes Card */}
        <View style={[styles.card, { backgroundColor: '#FFFFFF' }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="create-outline" size={20} color="#6B778C" />
            <Text style={styles.cardTitle}>Visit Notes</Text>
          </View>
          
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="Add notes about your visit..."
            placeholderTextColor="#999"
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>

        {/* Complete Button */}
        <TouchableOpacity 
          style={[
            styles.checkoutButton,
            isSubmitting && styles.disabledButton
          ]} 
          onPress={handleSubmitVisit}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="checkmark-done" size={24} color="#fff" />
              <Text style={styles.checkoutButtonText}>Complete Visit</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 8,
  },
  cardTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#172B4D',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#6B778C',
    marginLeft: 8,
    width: 80,
  },
  infoValue: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#172B4D',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: 8,
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  notesInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
    fontFamily: 'Poppins-Regular',
  },
  checkoutButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#9e9e9e',
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    marginLeft: 10,
  },
});
