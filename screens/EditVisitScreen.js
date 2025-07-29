// screens/EditVisitScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EditVisitScreen({ route, navigation }) {
  const { visit } = route.params;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format check-in time nicely
  const checkInTime = visit.timestamp?.toDate ? visit.timestamp.toDate() : new Date(visit.timestamp || Date.now());
  const durationMinutes = Math.floor((new Date() - checkInTime) / 60000);

  const handleCheckout = () => {
    navigation.navigate('Checkout', { 
      visit: {
        ...visit,
        checkInTime,
        durationMinutes
      }
    });
  };

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
              <Text style={styles.infoValue}>{checkInTime.toLocaleString()}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="hourglass" size={18} color="#6B778C" />
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>{durationMinutes} minutes</Text>
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
