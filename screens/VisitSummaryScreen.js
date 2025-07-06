import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function VisitSummaryScreen({ route }) {
  const visitData = route.params?.visitData || {};

  // Use empty array fallback if previousNotes missing or not an array
  const previousNotes = Array.isArray(visitData.previousNotes) ? visitData.previousNotes : [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Visitor Name at top */}
      <Text style={styles.visitorName}>{visitData.contactName || 'No Name'}</Text>

      {/* Info Box with Name, Address, Phone, Email */}
      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Feather name="user" size={20} color="#007bff" />
          <Text style={styles.infoText}>{visitData.contactName || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Feather name="map-pin" size={20} color="#007bff" />
          <Text style={styles.infoText}>{visitData.address || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Feather name="phone" size={20} color="#007bff" />
          <Text style={styles.infoText}>{visitData.contactPhone || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Feather name="mail" size={20} color="#007bff" />
          <Text style={styles.infoText}>{visitData.email || 'N/A'}</Text>
        </View>
      </View>

      {/* Previous Notes Section */}
      <Text style={styles.previousNotesTitle}>Previous Visit Notes</Text>

      <View style={styles.notesBox}>
        {previousNotes.length === 0 ? (
          <Text style={styles.noNotesText}>No previous notes available.</Text>
        ) : (
          previousNotes.map((note, index) => (
            <View key={index}>
              <Text style={styles.noteText}>• {note}</Text>
              {/* Render a line separator except after the last note */}
              {index < previousNotes.length - 1 && <View style={styles.divider} />}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  visitorName: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#007bff',
  },
  infoBox: {
    backgroundColor: '#e6f0ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  previousNotesTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 10,
  },
  notesBox: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
  },
  noteText: {
    fontSize: 15,
    color: '#555',
  },
  noNotesText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 10,
  },
});
