
//This page is not used anymore!
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function EditVisitScreen({ route, navigation }) {
  // Validate and safely extract visit data with defaults
  const { visit = {} } = route.params || {};
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [durationSeconds, setDurationSeconds] = useState(visit.durationSeconds || 0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [visitDataValid, setVisitDataValid] = useState(false);

  // Validate visit data on component mount
  useEffect(() => {
    const validateVisitData = () => {
      if (!visit || !visit.id || !visit.userId) {
        console.error('Invalid visit data:', visit);
        Alert.alert(
          'Error', 
          'Invalid visit data. Please go back and try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return false;
      }
      return true;
    };

    setVisitDataValid(validateVisitData());
  }, [visit]);

  // Start timer immediately when component mounts
  useEffect(() => {
    if (!visitDataValid) return;

    const startTimer = () => {
      // Clear any existing interval
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      // Start new interval
      const interval = setInterval(() => {
        setDurationSeconds(prev => {
          const newDuration = prev + 1;
          // Update Firestore every 60 seconds to save progress
          if (newDuration % 60 === 0) {
            updateDurationInFirestore(newDuration);
          }
          return newDuration;
        });
      }, 1000);
      
      setTimerInterval(interval);
      return interval;
    };

    const updateDurationInFirestore = async (duration) => {
      try {
        await updateDoc(doc(db, 'visits', visit.id), {
          durationSeconds: duration
        });
      } catch (error) {
        console.error('Error updating duration:', error);
      }
    };

    const fetchVisitData = async () => {
      try {
        const visitDoc = await getDoc(doc(db, 'visits', visit.id));
        if (visitDoc.exists()) {
          const visitData = visitDoc.data();
          const timestamp = visitData.checkInTime || visitData.timestamp;
          const checkInDate = timestamp?.toDate ? timestamp.toDate() : new Date();
          
          setCheckInTime(checkInDate);
          setDurationSeconds(visitData.durationSeconds || 0);

          if (visitData.status === 'checked-in') {
            startTimer();
          }
        } else {
          throw new Error('Visit document not found');
        }
      } catch (error) {
        console.error('Error fetching visit data:', error);
        const fallbackDate = visit.checkInTime?.toDate ? visit.checkInTime.toDate() : 
                         visit.timestamp?.toDate ? visit.timestamp.toDate() : new Date();
        setCheckInTime(fallbackDate);
        setDurationSeconds(visit.durationSeconds || 0);

        if (visit.status === 'checked-in') {
          startTimer();
        }
      }
    };

    fetchVisitData();

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [visit.id, visitDataValid]);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const formatTimeOnly = (date) => {
    if (!date) return 'Not recorded';
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCheckout = async () => {
    if (!visitDataValid) {
      Alert.alert('Error', 'Cannot checkout with invalid visit data');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!checkInTime) {
        throw new Error('Check-in time not available');
      }

      // Calculate final duration in minutes
      const finalDurationMinutes = Math.floor(durationSeconds / 60);

      // Update the visit status in Firestore
      await updateDoc(doc(db, 'visits', visit.id), {
        status: 'checked-out',
        checkOutTime: serverTimestamp(),
        durationMinutes: finalDurationMinutes,
        durationSeconds: durationSeconds
      });

      // Update the rep's location status
      await updateDoc(doc(db, 'repLocations', visit.userId), {
        currentStatus: ['checked-out'],
        lastUpdated: serverTimestamp()
      });

      // Clear the timer interval
      if (timerInterval) {
        clearInterval(timerInterval);
      }

      // Safely navigate to Checkout screen with all required data
      navigation.navigate('Checkout', { 
        visit: {
          id: visit.id,
          userId: visit.userId,
          poiId: visit.poiId || '',
          poiName: visit.poiName || 'Unknown POI',
          status: 'checked-out',
          durationMinutes: finalDurationMinutes,
          durationSeconds: durationSeconds,
          checkInTime: checkInTime.toISOString(),
          checkOutTime: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error during checkout:', error);
      Alert.alert(
        'Checkout Error', 
        error.message || 'Failed to complete checkout. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visitDataValid) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Validating visit data...</Text>
      </View>
    );
  }

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
            
            {visit.poiContact && (
              <View style={styles.infoRow}>
                <Ionicons name="call" size={18} color="#6B778C" />
                <Text style={styles.infoLabel}>Contact:</Text>
                <Text style={styles.infoValue}>{visit.poiContact}</Text>
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
              <Text style={styles.infoValue}>
                {formatTimeOnly(checkInTime)}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="hourglass" size={18} color="#6B778C" />
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={[styles.infoValue, { fontFamily: 'monospace' }]}>
                {formatDuration(durationSeconds)}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="flag" size={18} color="#6B778C" />
              <Text style={styles.infoLabel}>Status:</Text>
              <View style={[
                styles.statusBadge,
                { 
                  backgroundColor: visit.status === 'completed' ? '#E6FFEE' : '#FFF5E6',
                  borderColor: visit.status === 'completed' ? '#00C853' : '#FF6B00'
                }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: visit.status === 'completed' ? '#00C853' : '#FF6B00' }
                ]}>
                  {visit.status || 'In Progress'}
                </Text>
              </View>
            </View>
          </View>

          {/* Checkout Button */}
          <TouchableOpacity 
            style={styles.checkoutButton} 
            onPress={handleCheckout}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="exit-outline" size={24} color="#fff" />
                <Text style={styles.checkoutButtonText}>Check Out</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
