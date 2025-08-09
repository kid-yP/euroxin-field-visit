import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { db, auth } from '../firebase/config';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, increment } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

const productOptions = [
  'Euroxin-69',
  'Euroxin-X',
  'Euroxin-Forte',
  'Euroxin-Combo',
  'Other',
];

export default function VisitDetailsScreen({ route, navigation }) {
  const { visit = {} } = route.params || {};
  
  const [contactName, setContactName] = useState(visit?.contactName || '');
  const [contactPhone, setContactPhone] = useState(visit?.contactPhone || '');
  const [isFamiliar, setIsFamiliar] = useState(visit?.isFamiliar ?? null);
  const [interested, setInterested] = useState(visit?.interested ?? null);
  const [selectedProducts, setSelectedProducts] = useState(visit?.products || []);
  const [notes, setNotes] = useState(visit?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [indexError, setIndexError] = useState(false);
  const [visitDate, setVisitDate] = useState(visit?.date ? visit.date.toDate() : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fieldWorkers, setFieldWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(visit?.assignedWorker || '');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [poiLocation, setPoiLocation] = useState(visit?.poiLocation || '');
  const [poiAddress, setPoiAddress] = useState(visit?.poiAddress || '');

  useEffect(() => {
    const fetchFieldWorkers = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'field-worker'));
        const querySnapshot = await getDocs(q);
        const workers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFieldWorkers(workers);
      } catch (error) {
        console.error('Error fetching field workers:', error);
      }
    };

    fetchFieldWorkers();
  }, []);

  const toggleProduct = (product) => {
    if (selectedProducts.includes(product)) {
      setSelectedProducts(selectedProducts.filter((p) => p !== product));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const handleCreateIndex = () => {
    const indexUrl = `https://console.firebase.google.com/v1/r/project/euroxin-field-visit/firestore/indexes?create_composite=ClJwcm9qZWN0cy9ldXJveGluLWZpZWxkLXZpc2l0L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy92aXNpdHMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaCAoEZGF0ZRABGgwKCF9fbmFtZV9fEAE`;
    Linking.openURL(indexUrl).catch(() => {
      Alert.alert("Error", "Could not open browser");
    });
  };

  const updateAssignedVisitsCount = async (workerId) => {
    try {
      const assignedVisitsRef = doc(db, 'assignedVisits', workerId);
      await updateDoc(assignedVisitsRef, {
        count: increment(1),
        lastAssigned: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating assigned visits count:', error);
      // This error won't block the visit assignment, just log it
    }
  };

  const handleAssignVisit = async () => {
    if (!poiLocation || !selectedWorker || isFamiliar === null || interested === null || !contactName || !contactPhone) {
      return Alert.alert('Missing Fields', 'Please complete all required fields.');
    }

    try {
      setSubmitting(true);
      setIndexError(false);

      const selectedWorkerData = fieldWorkers.find(w => w.displayName === selectedWorker);
      if (!selectedWorkerData) {
        throw new Error('Selected worker data not found');
      }

      const visitData = {
        poiLocation,
        poiAddress,
        contactName,
        contactPhone,
        isFamiliar,
        interested,
        products: selectedProducts,
        notes,
        status: 'assigned',
        timestamp: Timestamp.now(),
        date: Timestamp.fromDate(visitDate),
        assignedWorker: selectedWorker,
        assignedWorkerId: selectedWorkerData.id,
        userId: auth.currentUser?.uid
      };

      try {
        if (visit?.id) {
          await updateDoc(doc(db, 'visits', visit.id), visitData);
          Alert.alert('Success', 'Visit updated successfully!');
        } else {
          await addDoc(collection(db, 'visits'), {
            ...visitData,
            userId: auth.currentUser?.uid,
          });
          // Update assigned visits count for the worker
          await updateAssignedVisitsCount(selectedWorkerData.id);
          Alert.alert('Success', 'New visit saved successfully!');
        }
        
        navigation.reset({
          index: 0,
          routes: [{ name: 'Tabs' }]
        });
      } catch (dbError) {
        if (dbError.code === 'failed-precondition') {
          setIndexError(true);
          Alert.alert(
            'Index Required',
            'The database needs to create an index for this query.',
            [
              { text: 'Create Index Now', onPress: handleCreateIndex },
              { text: 'OK', onPress: () => navigation.goBack() }
            ]
          );
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', error.message || 'Failed to assign visit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {indexError && (
          <View style={styles.indexWarning}>
            <Ionicons name="warning" size={20} color="#FFA000" />
            <Text style={styles.indexWarningText}>
              Database is optimizing performance. Full functionality will be available shortly.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assign Field Worker *</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={styles.dropdownHeader}
              onPress={() => setShowWorkerDropdown(!showWorkerDropdown)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownHeaderContent}>
                <Ionicons name="person-outline" size={20} color="#6B778C" style={styles.dropdownIcon} />
                <Text style={[styles.dropdownText, !selectedWorker && styles.placeholderText]}>
                  {selectedWorker || 'Select a field worker'}
                </Text>
              </View>
              <Ionicons 
                name={showWorkerDropdown ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#6B778C" 
              />
            </TouchableOpacity>

            {showWorkerDropdown && fieldWorkers.length > 0 && (
              <View style={styles.dropdownOptions}>
                <ScrollView 
                  style={styles.dropdownScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {fieldWorkers.map(worker => (
                    <TouchableOpacity
                      key={worker.id}
                      style={[
                        styles.dropdownOption,
                        selectedWorker === worker.displayName && styles.dropdownOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedWorker(worker.displayName);
                        setShowWorkerDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{worker.displayName}</Text>
                      {selectedWorker === worker.displayName && (
                        <Ionicons name="checkmark" size={18} color="#007bff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Location Details *</Text>
          
          <TextInput
            placeholder="POI Location Name *"
            placeholderTextColor="#6B778C"
            value={poiLocation}
            onChangeText={setPoiLocation}
            style={styles.input}
          />
          
          <TextInput
            placeholder="POI Address"
            placeholderTextColor="#6B778C"
            value={poiAddress}
            onChangeText={setPoiAddress}
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>POI Contact Information *</Text>
          
          <TextInput
            placeholder="Contact Name *"
            placeholderTextColor="#6B778C"
            value={contactName}
            onChangeText={setContactName}
            style={styles.input}
          />
          
          <TextInput
            placeholder="Contact Phone *"
            placeholderTextColor="#6B778C"
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Visit Details</Text>
          
          <Text style={styles.label}>Visit Date *</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#6B778C" />
            <Text style={styles.dateText}>
              {format(visitDate, 'PPP')}
            </Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={visitDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setVisitDate(selectedDate);
                }
              }}
            />
          )}

          <Text style={styles.label}>Familiar with Euroxin? *</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, isFamiliar === true && styles.toggleSelected]}
              onPress={() => setIsFamiliar(true)}
            >
              <Text style={isFamiliar === true ? styles.toggleTextSelected : styles.toggleText}>Yes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleButton, isFamiliar === false && styles.toggleSelected]}
              onPress={() => setIsFamiliar(false)}
            >
              <Text style={isFamiliar === false ? styles.toggleTextSelected : styles.toggleText}>No</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Interested to order? *</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, interested === true && styles.toggleSelected]}
              onPress={() => setInterested(true)}
            >
              <Text style={[styles.toggleText, interested === true && styles.toggleTextSelected]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, interested === false && styles.toggleSelected]}
              onPress={() => setInterested(false)}
            >
              <Text style={[styles.toggleText, interested === false && styles.toggleTextSelected]}>No</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Products of Interest</Text>
          <View style={styles.chipContainer}>
            {productOptions.map((product) => (
              <TouchableOpacity
                key={product}
                style={[styles.chip, selectedProducts.includes(product) && styles.chipSelected]}
                onPress={() => toggleProduct(product)}
              >
                <Text style={selectedProducts.includes(product) ? styles.chipTextSelected : styles.chipText}>
                  {product}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            placeholder="Enter your notes here..."
            placeholderTextColor="#6B778C"
            value={notes}
            onChangeText={setNotes}
            multiline
            style={[styles.input, styles.notesInput]}
          />
        </View>
      </ScrollView>

      <View style={styles.singleButtonContainer}>
        <TouchableOpacity
          onPress={handleAssignVisit}
          style={styles.assignButton}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.assignButtonText}>
              ASSIGN VISIT
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ... (keep all your existing styles exactly the same)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9FFFA',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#172B4D',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#172B4D',
    backgroundColor: '#FAFAFA',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingVertical: 16,
  },
  dropdownHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#172B4D',
    flex: 1,
  },
  placeholderText: {
    color: '#6B778C',
  },
  dropdownOptions: {
    maxHeight: 200,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownOptionSelected: {
    backgroundColor: '#F5F9FF',
  },
  dropdownOptionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#172B4D',
    flex: 1,
  },
  noWorkersText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#6B778C',
    textAlign: 'center',
    padding: 16,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  dateText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: '#172B4D',
    marginLeft: 10,
  },
  notesInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#6B778C',
    marginBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  toggleButton: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007bff',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleSelected: {
    backgroundColor: '#007bff',
  },
  toggleText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#007bff',
  },
  toggleTextSelected: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: 'white',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#007bff',
  },
  chipText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#6B778C',
  },
  chipTextSelected: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: 'white',
  },
  singleButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  assignButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  assignButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    textAlign: 'center',
  },
  indexWarning: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center'
  },
  indexWarningText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
    marginLeft: 8,
    flex: 1
  }
});
