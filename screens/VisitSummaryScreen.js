import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function VisitSummaryScreen({ route }) {
  const visit = route.params?.visit || {};

  const visitDetails = {
    contactName: visit.contactName || 'No Name',
    address: visit.address || '123 Medical Plaza, Suite 456\nNew York, NY 10001',
    contactPhone: visit.contactPhone || '(212) 555-7890',
    email: visit.email || `contact@${(visit.contactName || 'client').toLowerCase().replace(/\s+/g, '')}.com`,
    status: visit.status || 'Pending',
    products: visit.products || [],
    notes: visit.notes || '',
    image: visit.image || null,
    previousNotes: Array.isArray(visit.previousNotes) ? 
      visit.previousNotes.map(note => typeof note === 'string' ? 
        { note, date: new Date().toISOString(), visited: true } : note) : 
      [
        {
          date: '2023-05-15',
          note: 'Discussed new product line. Showed samples. Positive feedback.',
          visited: true
        },
        {
          date: '2023-04-28',
          note: 'Regular follow-up. Inventory check. Reordered items.',
          visited: true
        }
      ]
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.visitorName}>{visitDetails.contactName}</Text>
        <View style={[
          styles.statusBadge,
          visitDetails.status === 'Completed' ? styles.completedBadge : styles.pendingBadge
        ]}>
          <Text style={styles.statusText}>{visitDetails.status}</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Feather name="user" size={20} color="#007bff" />
            <Text style={styles.infoText}>{visitDetails.contactName}</Text>
          </View>
          <View style={styles.divider} />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Feather name="phone" size={20} color="#007bff" />
            <Text style={styles.infoText}>{visitDetails.contactPhone}</Text>
          </View>
          <View style={styles.divider} />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={20} color="#007bff" />
            <Text style={styles.infoText}>{visitDetails.address}</Text>
          </View>
          <View style={styles.divider} />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Feather name="mail" size={20} color="#007bff" />
            <Text style={styles.infoText}>{visitDetails.email}</Text>
          </View>
          {visitDetails.products.length > 0 && <View style={styles.divider} />}
        </View>

        {visitDetails.products.length > 0 && (
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Feather name="package" size={20} color="#007bff" />
              <Text style={styles.infoText}>
                {visitDetails.products.join(', ')}
              </Text>
            </View>
            {visitDetails.notes && <View style={styles.divider} />}
          </View>
        )}

        {visitDetails.notes && (
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Feather name="edit" size={20} color="#007bff" />
              <Text style={styles.infoText}>{visitDetails.notes}</Text>
            </View>
          </View>
        )}
      </View>

      {visitDetails.image && (
        <>
          <Text style={styles.sectionTitle}>Visit Photo</Text>
          <Image 
            source={{ uri: visitDetails.image }} 
            style={styles.imagePreview} 
          />
        </>
      )}

      <Text style={styles.sectionTitle}>Previous Visit Notes</Text>
      <View style={styles.notesBox}>
        {visitDetails.previousNotes.length === 0 ? (
          <Text style={styles.noNotesText}>No previous notes available.</Text>
        ) : (
          visitDetails.previousNotes.map((note, index) => (
            <View key={index} style={styles.noteContainer}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteDate}>
                  {new Date(note.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
                {note.visited && (
                  <View style={styles.visitedBadge}>
                    <Feather name="check" size={14} color="white" />
                    <Text style={styles.visitedBadgeText}>Visited</Text>
                  </View>
                )}
              </View>
              <Text style={styles.noteText}>{note.note}</Text>
              {index < visitDetails.previousNotes.length - 1 && <View style={styles.divider} />}
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
    backgroundColor: '#E9FFFA',
    paddingBottom: 40
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  visitorName: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#172B4D',
    flexShrink: 1
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10
  },
  pendingBadge: {
    backgroundColor: '#FFF5F0'
  },
  completedBadge: {
    backgroundColor: '#F0FFF4'
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14
  },
  infoBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    elevation: 2
  },
  infoSection: {
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#6B778C',
    marginLeft: 12,
    flex: 1
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#172B4D',
    marginBottom: 15
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#f5f5f5'
  },
  notesBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 1
  },
  noteContainer: {
    marginBottom: 12
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  noteDate: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: '#172B4D'
  },
  visitedBadge: {
    backgroundColor: '#00C853',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  visitedBadgeText: {
    color: 'white',
    fontFamily: 'Poppins-Medium',
    fontSize: 12
  },
  noteText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#6B778C',
    lineHeight: 22
  },
  noNotesText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    paddingVertical: 10
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 4,
  }
});
