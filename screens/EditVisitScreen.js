// screens/EditVisitScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function EditVisitScreen({ route, navigation }) {
  const { visit } = route.params;

  // Assume visit has: checkInLocation (lat,lng), timestamp (check-in), checkoutTime (Date or timestamp), notes
  const [notes, setNotes] = useState(visit.notes || '');

  // Format check-in time nicely
  const checkInTime = visit.timestamp?.toDate ? visit.timestamp.toDate() : new Date();
  const checkOutTime = visit.checkoutTime?.toDate ? visit.checkoutTime.toDate() : new Date();

  // Calculate duration in minutes
  const durationMinutes = Math.floor((checkOutTime - checkInTime) / 60000);

  // Location display - if you have a name, show that; else lat/lng
  const locationText =
    visit.poiName ||
    (visit.checkInLocation
      ? `Lat: ${visit.checkInLocation.latitude.toFixed(5)}, Lng: ${visit.checkInLocation.longitude.toFixed(5)}`
      : 'Unknown Location');

  const handleSubmit = async () => {
    try {
      const visitRef = doc(db, 'visits', visit.id);
      await updateDoc(visitRef, { notes });

      Alert.alert('Success', 'Visit updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', `Failed to update visit: ${error.message}`);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Visit Summary</Text>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{locationText}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.label}>Check-in Time:</Text>
            <Text style={styles.value}>{checkInTime.toLocaleString()}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.label}>Total Duration:</Text>
            <Text style={styles.value}>{durationMinutes} minutes</Text>
          </View>
        </View>

        <Text style={styles.notesLabel}>Notes (optional):</Text>
        <TextInput
          style={styles.textInput}
          multiline
          placeholder="Add any notes here..."
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Confirm & Submit Visit</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#007bff',
  },
  summaryBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  label: {
    fontWeight: 'bold',
    width: 120,
    color: '#333',
  },
  value: {
    flex: 1,
    color: '#555',
  },
  notesLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
    color: '#007bff',
  },
  textInput: {
    height: 120,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 30,
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
