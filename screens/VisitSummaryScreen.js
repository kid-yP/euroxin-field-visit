import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function VisitSummaryScreen({ route, navigation }) {
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

  const handleEdit = () => {
    navigation.navigate('VisitDetails', { visit });
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
        <View style={styles.infoRow}>
          <Feather name="user" size={20} color="#007bff" />
          <Text style={styles.infoText}>{visitDetails.contactName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Feather name="phone" size={20} color="#007bff" />
          <Text style={styles.infoText}>{visitDetails.contactPhone}</Text>
        </View>

        {visitDetails.products.length > 0 && (
          <View style={styles.infoRow}>
            <Feather name="package" size={20} color="#007bff" />
            <Text style={styles.infoText}>
              {visitDetails.products.join(', ')}
            </Text>
          </View>
        )}

        {visitDetails.notes && (
          <View style={styles.infoRow}>
            <Feather name="edit" size={20} color="#007bff" />
            <Text style={styles.infoText}>{visitDetails.notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleEdit}>
          <Ionicons name="create-outline" size={20} color="white" />
          <Text style={styles.primaryButtonText}>Edit Visit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#007bff" />
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
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
                    <Ionicons name="checkmark" size={14} color="white" />
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
    marginBottom: 20
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
    padding: 20,
    marginBottom: 20,
    elevation: 2
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#6B778C',
    marginLeft: 12,
    flex: 1
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25
  },
  primaryButton: {
    flex: 2,
    backgroundColor: '#007bff',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 2
  },
  primaryButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 2
  },
  secondaryButtonText: {
    color: '#007bff',
    fontFamily: 'Poppins-Medium',
    fontSize: 16
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
    backgroundColor: '#eee',
    marginVertical: 12
  }
});
