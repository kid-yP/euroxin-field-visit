
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  addDoc, 
  collection, 
  setDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export default function CheckoutScreen({ route, navigation }) {
  const { visit } = route.params || {};
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState(visit?.notes || '');
  const [isProcessing, setIsProcessing] = useState(false); // New state to track processing

  const calculateDurationMinutes = (checkInTime) => {
    if (!checkInTime) return 0;
    try {
      const checkInDate = checkInTime.toDate ? checkInTime.toDate() : new Date(checkInTime);
      const now = new Date();
      return Math.round((now - checkInDate) / (1000 * 60));
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 0;
    }
  };

  const handleSubmitVisit = async () => {
    if (isProcessing) return; // Prevent multiple submissions
    
    setIsProcessing(true);
    setIsSubmitting(true);

    if (!auth.currentUser?.uid) {
      Alert.alert('Error', 'User not authenticated');
      setIsProcessing(false);
      setIsSubmitting(false);
      return;
    }

    try {
      const currentTime = serverTimestamp();
      const duration = calculateDurationMinutes(visit?.checkInTime);
      let visitId = visit?.id;

      // 1. Update or create the visit record
      const visitData = {
        notes,
        checkoutTime: currentTime,
        status: 'completed',
        durationMinutes: duration
      };

      if (visit?.id && visit.id !== 'new-visit') {
        await updateDoc(doc(db, 'visits', visit.id), visitData);
      } else {
        if (!visit?.poiId) {
          throw new Error('Missing POI ID for new visit');
        }
        
        const docRef = await addDoc(collection(db, 'visits'), {
          ...visitData,
          userId: auth.currentUser.uid,
          poiId: visit.poiId,
          poiName: visit.poiName || 'Unknown POI',
          checkInLocation: visit.checkInLocation || null,
          timestamp: currentTime
        });
        visitId = docRef.id;
      }

      // 2. Update POI last visit information
      if (visit?.poiId) {
        await setDoc(
          doc(db, 'pois', visit.poiId),
          {
            lastVisit: currentTime,
            lastVisitBy: auth.currentUser.uid,
            lastVisitName: auth.currentUser.displayName || 'Rep',
            lastVisitDuration: duration
          },
          { merge: true }
        );
      }

      // 3. Update rep status
      await setDoc(
        doc(db, 'repLocations', auth.currentUser.uid),
        {
          currentStatus: ['available'],
          lastCheckOut: currentTime,
          lastUpdated: currentTime,
          lastPoiVisited: visit?.poiId || null,
          lastPoiName: visit?.poiName || null
        },
        { merge: true }
      );

      // 4. Create visit history log
      await addDoc(collection(db, 'visitHistory'), {
        visitId: visitId || 'unknown',
        poiId: visit?.poiId || null,
        poiName: visit?.poiName || 'Unknown POI',
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Rep',
        checkInTime: visit?.checkInTime || currentTime,
        checkOutTime: currentTime,
        durationMinutes: duration,
        status: 'completed',
        notes,
        timestamp: currentTime
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
        error.message || 'Could not complete visit. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
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
            <Text style={styles.infoValue}>{visit?.poiName || 'Unknown POI'}</Text>
          </View>
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
              {visit?.checkInTime?.toDate ? 
                visit.checkInTime.toDate().toLocaleString() : 
                'Not recorded'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="hourglass" size={18} color="#6B778C" />
            <Text style={styles.infoLabel}>Duration:</Text>
            <Text style={styles.infoValue}>
              {calculateDurationMinutes(visit?.checkInTime)} minutes
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
        <View style={[styles.card, { backgroundColor: '#FFF' }]}>
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
            (isSubmitting || isProcessing) && styles.disabledButton
          ]} 
          onPress={handleSubmitVisit}
          disabled={isSubmitting || isProcessing}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="checkmark-done" size={24} color="#fff" />
              <Text style={styles.checkoutButtonText}>Complete</Text>
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
