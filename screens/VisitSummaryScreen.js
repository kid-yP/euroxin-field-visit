import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit, Timestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { format } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../firebase/useAuth';

export default function VisitSummaryScreen({ route, navigation }) {
  const { visitId } = route.params;
  const { user } = useAuth();
  const [visit, setVisit] = useState(null);
  const [previousVisits, setPreviousVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [indexError, setIndexError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  const fetchData = async (isRefreshing = false) => {
    try {
      isRefreshing ? setRefreshing(true) : setLoading(true);
      setError(null);
      setIndexError(false);

      const visitDoc = await getDoc(doc(db, 'visits', visitId));
      if (!visitDoc.exists()) throw new Error('Visit not found');
      
      const visitData = visitDoc.data();
      const visitDate = visitData.timestamp?.toDate 
        ? visitData.timestamp.toDate() 
        : visitData.date?.toDate 
          ? visitData.date.toDate() 
          : new Date();

      setVisit({ 
        id: visitDoc.id, 
        ...visitData,
        date: visitDate
      });

      const userId = auth.currentUser?.uid;
      const poiName = visitData.poiName;

      if (userId && poiName) {
        try {
          const optimalQuery = query(
            collection(db, 'visits'),
            where('userId', '==', userId),
            where('poiName', '==', poiName),
            where('status', '==', 'completed'),
            orderBy('timestamp', 'desc'),
            limit(5)
          );

          const optimalSnapshot = await getDocs(optimalQuery);
          processVisits(optimalSnapshot);
        } catch (optimalError) {
          if (optimalError.code === 'failed-precondition') {
            setIndexError(true);
            const fallbackQuery = query(
              collection(db, 'visits'),
              where('userId', '==', userId),
              where('poiName', '==', poiName),
              orderBy('timestamp', 'desc'),
              limit(10)
            );

            const fallbackSnapshot = await getDocs(fallbackQuery);
            processVisits(fallbackSnapshot, true);
          } else {
            throw optimalError;
          }
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      isRefreshing ? setRefreshing(false) : setLoading(false);
    }
  };

  const processVisits = (snapshot, isFallback = false) => {
    const visits = snapshot.docs
      .filter(doc => doc.id !== visitId && (isFallback ? doc.data().status === 'completed' : true))
      .map(doc => {
        const data = doc.data();
        const visitDate = data.timestamp?.toDate 
          ? data.timestamp.toDate() 
          : data.date?.toDate 
            ? data.date.toDate() 
            : new Date();

        return {
          id: doc.id,
          ...data,
          date: visitDate
        };
      })
      .slice(0, 5);

    setPreviousVisits(visits);
  };

  const handleCreateIndex = () => {
    const projectId = 'euroxin-field-visit';
    const indexUrl = `https://console.firebase.google.com/project/${projectId}/firestore/indexes`;
    Linking.openURL(indexUrl).catch(() => {
      Alert.alert("Error", "Could not open browser");
    });
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleEditVisit = () => {
    if (!visit) return;
    
    const visitForEdit = {
      ...visit,
      date: visit.date instanceof Date ? Timestamp.fromDate(visit.date) : visit.date,
      timestamp: visit.timestamp instanceof Date ? Timestamp.fromDate(visit.timestamp) : visit.timestamp
    };
    
    navigation.navigate('VisitDetails', { visit: visitForEdit });
  };

  const handleDeleteVisit = async () => {
    if (!visit) return;

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this visit? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteDoc(doc(db, 'visits', visit.id));
              navigation.reset({
                index: 0,
                routes: [{ name: 'Tabs' }]
              });
              Alert.alert('Success', 'Visit deleted successfully');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete visit. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleCompleteVisit = () => {
    setShowNotesModal(true);
  };

  const submitCompletion = async () => {
    if (!completionNotes.trim()) {
      Alert.alert('Error', 'Please enter completion notes');
      return;
    }

    try {
      setCompleting(true);
      await updateDoc(doc(db, 'visits', visit.id), {
        status: 'completed',
        completionNotes: completionNotes,
        completedAt: Timestamp.now()
      });
      
      setShowNotesModal(false);
      setCompletionNotes('');
      
      await fetchData();
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs' }]
      });
      
      Alert.alert('Success', 'Visit marked as completed');
    } catch (error) {
      console.error('Completion error:', error);
      Alert.alert('Error', 'Failed to complete visit. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const copyPhoneNumber = async () => {
    if (!visit?.contactPhone) return;
    
    try {
      await Clipboard.setStringAsync(visit.contactPhone);
      Alert.alert('Copied!', 'Phone number copied to clipboard');
    } catch (error) {
      console.error('Failed to copy phone number:', error);
      Alert.alert('Error', 'Failed to copy phone number');
    }
  };

  useEffect(() => {
    fetchData();
  }, [visitId]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (error || !visit) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={50} color="#FF6B6B" />
        <Text style={styles.errorText}>{error || 'Visit data not available'}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => fetchData()}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isTeamLeader = user?.role === 'team-leader';
  const isFieldWorker = user?.role === 'field-worker';
  const isAssignedFieldWorker = isFieldWorker && visit.assignedWorkerId === user.uid;
  const canEditDelete = isTeamLeader;
  const canComplete = isFieldWorker && isAssignedFieldWorker && visit.status !== 'completed';

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007bff']}
            tintColor="#007bff"
          />
        }
      >
        {indexError && (
          <View style={styles.indexWarning}>
            <Ionicons name="warning" size={20} color="#FFA000" />
            <Text style={styles.indexWarningText}>
              Showing limited data. The index is still building (2-5 min).
            </Text>
            <TouchableOpacity onPress={handleCreateIndex}>
              <Text style={styles.indexLink}>View Index Status</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>POI Details</Text>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={20} color="#007bff" />
            <View>
              <Text style={styles.poiName}>{visit.poiLocation || 'No location name'}</Text>
              {visit.poiAddress && (
                <Text style={styles.poiAddress}>{visit.poiAddress}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactHeader}>
            <Text style={styles.visitorName}>{visit.contactName || 'No contact name'}</Text>
            <View style={[
              styles.statusBadge,
              visit.status === 'completed' ? styles.completedBadge : 
              visit.status === 'pending' ? styles.pendingBadge : styles.scheduledBadge
            ]}>
              <Text style={styles.statusText}>
                {visit.status?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
          </View>
          {visit.contactPhone && (
            <TouchableOpacity 
              style={styles.infoRow}
              onPress={copyPhoneNumber}
              activeOpacity={0.7}
            >
              <Feather name="phone" size={20} color="#007bff" />
              <Text style={styles.infoText}>
                {visit.contactPhone}
              </Text>
              <Feather name="copy" size={16} color="#6B778C" style={styles.copyIcon} />
            </TouchableOpacity>
          )}
        </View>

        {visit.assignedWorker && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Assigned Field Worker</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color="#007bff" />
              <View>
                <Text style={styles.fieldWorkerName}>{visit.assignedWorker}</Text>
                {visit.assignedWorkerId && (
                  <Text style={styles.fieldWorkerId}>ID: {visit.assignedWorkerId}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Visit Details</Text>
          
          <View style={styles.infoRow}>
            <Feather name="calendar" size={20} color="#007bff" />
            <Text style={styles.infoText}>
              {format(visit.date, 'MMM d, yyyy - h:mm a')}
            </Text>
          </View>

          {visit.products?.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Feather name="package" size={20} color="#007bff" />
                <Text style={styles.infoText}>
                  {visit.products.join(', ')}
                </Text>
              </View>
            </>
          )}

          {visit.notes && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Feather name="edit" size={20} color="#007bff" />
                <Text style={styles.infoText}>{visit.notes}</Text>
              </View>
            </>
          )}

          {visit.status === 'completed' && visit.completionNotes && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Feather name="check-circle" size={20} color="#00C853" />
                <Text style={styles.infoText}>{visit.completionNotes}</Text>
              </View>
            </>
          )}
        </View>

        {visit.image && (
          <View style={styles.photoContainer}>
            <Text style={styles.sectionTitle}>Visit Photo</Text>
            <Image 
              source={{ uri: visit.image }} 
              style={styles.imagePreview} 
            />
          </View>
        )}

        <View style={styles.visitsContainer}>
          <Text style={styles.sectionTitle}>Previous Visits</Text>
          {previousVisits.length === 0 ? (
            <Text style={styles.noVisitsText}>No previous visits found</Text>
          ) : (
            previousVisits.map((prevVisit, index) => (
              <View key={prevVisit.id} style={[
                styles.visitItem,
                index === 0 && styles.firstVisitItem
              ]}>
                <View style={styles.visitHeader}>
                  <Text style={styles.visitDate}>
                    {format(prevVisit.date, 'MMM d, yyyy')}
                  </Text>
                  <View style={styles.visitStatus}>
                    <Feather name="check-circle" size={16} color="#00C853" />
                    <Text style={styles.visitStatusText}>Completed</Text>
                  </View>
                </View>
                
                {prevVisit.notes && (
                  <Text style={styles.visitNotes}>{prevVisit.notes}</Text>
                )}

                {prevVisit.products?.length > 0 && (
                  <View style={styles.visitProducts}>
                    <Feather name="package" size={14} color="#6B778C" />
                    <Text style={styles.visitProductsText}>
                      {prevVisit.products.join(', ')}
                    </Text>
                  </View>
                )}

                {index < previousVisits.length - 1 && <View style={styles.visitDivider} />}
              </View>
            ))
          )}
        </View>

        {canEditDelete && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEditVisit}
            >
              <Feather name="edit-2" size={20} color="white" />
              <Text style={styles.actionButtonText}>Edit Visit</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {canEditDelete && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteVisit}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Feather name="trash-2" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Delete Visit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {canComplete && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleCompleteVisit}
              disabled={completing}
            >
              {completing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Feather name="check-circle" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Mark as Complete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showNotesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotesModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Visit</Text>
            <Text style={styles.modalSubtitle}>Please add completion notes:</Text>
            
            <TextInput
              style={styles.notesInput}
              placeholder="Enter your notes here..."
              multiline={true}
              numberOfLines={4}
              value={completionNotes}
              onChangeText={setCompletionNotes}
              autoFocus={true}
            />
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowNotesModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#172B4D' }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitCompletion}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.modalButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#E9FFFA',
    paddingBottom: 100
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E9FFFA'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E9FFFA',
    padding: 20
  },
  errorText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#FF6B6B',
    marginVertical: 20,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16
  },
  indexWarning: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    padding: 12,
    marginBottom: 16,
    borderRadius: 4
  },
  indexWarningText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
    marginVertical: 4
  },
  indexLink: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#007bff',
    textDecorationLine: 'underline'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  visitorName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#172B4D',
    flex: 1
  },
  poiName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#172B4D',
    marginLeft: 12
  },
  poiAddress: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6B778C',
    marginLeft: 12,
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 10
  },
  completedBadge: {
    backgroundColor: '#E6FFEE',
    borderColor: '#00C853'
  },
  pendingBadge: {
    backgroundColor: '#FFF5E6',
    borderColor: '#FF6B00'
  },
  scheduledBadge: {
    backgroundColor: '#E6F7FF',
    borderColor: '#2962FF'
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#172B4D'
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#6B778C',
    marginLeft: 12,
    flex: 1
  },
  copyIcon: {
    marginLeft: 8
  },
  fieldWorkerName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#172B4D',
    marginLeft: 12
  },
  fieldWorkerId: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
    marginLeft: 12
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 8
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#172B4D',
    marginBottom: 12
  },
  photoContainer: {
    marginBottom: 20
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#f5f5f5'
  },
  visitsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1
  },
  visitItem: {
    paddingVertical: 12
  },
  firstVisitItem: {
    paddingTop: 0
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  visitDate: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: '#172B4D'
  },
  visitStatus: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  visitStatusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#00C853',
    marginLeft: 4
  },
  visitNotes: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
    lineHeight: 20,
    marginBottom: 8
  },
  visitProducts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  visitProductsText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#6B778C',
    marginLeft: 6
  },
  visitDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 8
  },
  noVisitsText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#6B778C',
    textAlign: 'center',
    paddingVertical: 12
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    width: '100%'
  },
  editButton: {
    backgroundColor: '#007bff',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  completeButton: {
    backgroundColor: '#00C853',
  },
  actionButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginLeft: 8
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#172B4D',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#6B778C',
    marginBottom: 16,
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    marginBottom: 20,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  submitButton: {
    backgroundColor: '#00C853',
  },
  modalButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
  }
});
