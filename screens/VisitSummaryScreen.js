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
  RefreshControl
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { format } from 'date-fns';

export default function VisitSummaryScreen({ route, navigation }) {
  const { visitId } = route.params;
  const [visit, setVisit] = useState(null);
  const [previousVisits, setPreviousVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [indexError, setIndexError] = useState(false);

  const fetchData = async (isRefreshing = false) => {
    try {
      isRefreshing ? setRefreshing(true) : setLoading(true);
      setError(null);
      setIndexError(false);

      // 1. Fetch current visit
      const visitDoc = await getDoc(doc(db, 'visits', visitId));
      if (!visitDoc.exists()) throw new Error('Visit not found');
      
      const visitData = visitDoc.data();
      // Safely handle date/timestamp
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

      // 2. Fetch previous visits (with index fallback)
      const userId = auth.currentUser?.uid;
      const poiName = visitData.poiName;

      if (userId && poiName) {
        try {
          // Try the optimal query first
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
            console.log('Using fallback query');
            
            // Fallback to simpler query
            const fallbackQuery = query(
              collection(db, 'visits'),
              where('userId', '==', userId),
              where('poiName', '==', poiName),
              orderBy('timestamp', 'desc'),
              limit(10) // Get more since we'll filter client-side
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
        // Safely handle date/timestamp for previous visits
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
      .slice(0, 5); // Ensure we only show 5 even in fallback

    setPreviousVisits(visits);
  };

  const handleCreateIndex = () => {
    const projectId = 'euroxin-field-visit'; // Replace with your actual project ID
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
    
    // Prepare visit data for navigation
    const visitForEdit = {
      ...visit,
      // Convert Date object to timestamp if needed by the edit screen
      date: visit.date instanceof Date ? Timestamp.fromDate(visit.date) : visit.date,
      timestamp: visit.timestamp instanceof Date ? Timestamp.fromDate(visit.timestamp) : visit.timestamp
    };
    
    navigation.navigate('VisitDetails', { visit: visitForEdit });
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

  return (
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

      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.visitorName}>{visit.contactName || 'No contact name'}</Text>
        </View>
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

      {/* Visit Details Card */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Feather name="calendar" size={20} color="#007bff" />
          <Text style={styles.infoText}>
            {format(visit.date, 'MMM d, yyyy - h:mm a')}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Feather name="phone" size={20} color="#007bff" />
          <Text style={styles.infoText}>
            {visit.contactPhone || 'Not provided'}
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
      </View>

      {/* Visit Photo */}
      {visit.image && (
        <View style={styles.photoContainer}>
          <Text style={styles.sectionTitle}>Visit Photo</Text>
          <Image 
            source={{ uri: visit.image }} 
            style={styles.imagePreview} 
          />
        </View>
      )}

      {/* Previous Visits */}
      <Text style={styles.sectionTitle}>Previous Visits</Text>
      <View style={styles.visitsContainer}>
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

      {/* Edit Button */}
      <TouchableOpacity 
        style={styles.editButton}
        onPress={handleEditVisit}
      >
        <Feather name="edit-2" size={20} color="white" />
        <Text style={styles.editButtonText}>Edit Visit</Text>
      </TouchableOpacity>
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  visitorName: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#172B4D'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1
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
  editButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20
  },
  editButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginLeft: 8
  }
});
