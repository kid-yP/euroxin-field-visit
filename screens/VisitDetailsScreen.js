import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { db, auth, storage } from '../firebase/config';
import { collection, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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
  const { visit = {}, poi = {} } = route.params || {};
  
  // Consolidated POI data with proper fallbacks
  const poiData = {
    name: poi?.name || visit?.poiName || 'Unnamed POI',
    address: poi?.address || visit?.poiAddress || null,
    contact: poi?.contact || visit?.poiContact || null,
    type: poi?.type || visit?.poiType || 'pharmacy'
  };

  const [contactName, setContactName] = useState(visit?.contactName || '');
  const [contactPhone, setContactPhone] = useState(visit?.contactPhone || '');
  const [isFamiliar, setIsFamiliar] = useState(visit?.isFamiliar ?? null);
  const [interested, setInterested] = useState(visit?.interested ?? null);
  const [selectedProducts, setSelectedProducts] = useState(visit?.products || []);
  const [notes, setNotes] = useState(visit?.notes || '');
  const [image, setImage] = useState(visit?.image || null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [indexError, setIndexError] = useState(false);
  const [visitDate, setVisitDate] = useState(visit?.date ? visit.date.toDate() : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getLocationIcon = (type) => {
    switch(type) {
      case 'hospital': return 'local-hospital';
      case 'clinic': return 'medical-services';
      default: return 'local-pharmacy';
    }
  };

  const getLocationColor = (type) => {
    switch(type) {
      case 'hospital': return '#FF3B30';
      case 'clinic': return '#34C759';
      default: return '#007AFF';
    }
  };

  const toggleProduct = (product) => {
    if (selectedProducts.includes(product)) {
      setSelectedProducts(selectedProducts.filter((p) => p !== product));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need gallery access to upload photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeImages,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri) => {
    if (!uri) return null;
    
    try {
      setUploading(true);
      
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const filename = uri.substring(uri.lastIndexOf('/') + 1);
      const storageRef = ref(storage, `visits/${userId}/${Date.now()}_${filename}`);

      const response = await fetch(uri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleCreateIndex = () => {
    const indexUrl = `https://console.firebase.google.com/v1/r/project/euroxin-field-visit/firestore/indexes?create_composite=ClJwcm9qZWN0cy9ldXJveGluLWZpZWxkLXZpc2l0L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy92aXNpdHMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaCAoEZGF0ZRABGgwKCF9fbmFtZV9fEAE`;
    Linking.openURL(indexUrl).catch(() => {
      Alert.alert("Error", "Could not open browser");
    });
  };

  const handleSaveAndCheckoutLater = async () => {
    if (!contactName || !contactPhone || isFamiliar === null || interested === null) {
      return Alert.alert('Missing Fields', 'Please complete all required fields.');
    }

    try {
      setSubmitting(true);
      setIndexError(false);

      let imageUrl = image;
      if (image && !image.startsWith('https://')) {
        imageUrl = await uploadImage(image);
      }

      const visitData = {
        contactName,
        contactPhone,
        isFamiliar,
        interested,
        products: selectedProducts,
        notes,
        image: imageUrl || null,
        status: 'pending',
        timestamp: Timestamp.now(),
        date: Timestamp.fromDate(visitDate),
        poiName: poiData.name,
        poiAddress: poiData.address,
        poiContact: poiData.contact,
        poiType: poiData.type
      };

      try {
        if (visit?.id) {
          await updateDoc(doc(db, 'visits', visit.id), visitData);
          Alert.alert('Success', 'Visit saved successfully!');
        } else {
          await addDoc(collection(db, 'visits'), {
            ...visitData,
            userId: auth.currentUser?.uid,
          });
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
            'The database needs to create an index for this query. This happens automatically and should be ready in 2-5 minutes.',
            [
              { 
                text: 'Create Index Now', 
                onPress: handleCreateIndex 
              },
              { 
                text: 'OK', 
                onPress: () => navigation.goBack() 
              }
            ]
          );
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to save visit. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleProceedToCheckout = async () => {
    if (!contactName || !contactPhone || isFamiliar === null || interested === null) {
      return Alert.alert('Missing Fields', 'Please complete all required fields.');
    }

    try {
      setSubmitting(true);
      setIndexError(false);

      let imageUrl = image;
      if (image && !image.startsWith('https://')) {
        imageUrl = await uploadImage(image);
      }

      const visitData = {
        contactName,
        contactPhone,
        isFamiliar,
        interested,
        products: selectedProducts,
        notes,
        image: imageUrl || null,
        status: 'checked-in',
        timestamp: Timestamp.now(),
        checkInTime: Timestamp.now(),
        date: Timestamp.fromDate(visitDate),
        poiName: poiData.name,
        poiAddress: poiData.address,
        poiContact: poiData.contact,
        poiType: poiData.type
      };

      try {
        let visitId;
        if (visit?.id) {
          await updateDoc(doc(db, 'visits', visit.id), visitData);
          visitId = visit.id;
        } else {
          const docRef = await addDoc(collection(db, 'visits'), {
            ...visitData,
            userId: auth.currentUser?.uid,
          });
          visitId = docRef.id;
        }

        navigation.navigate('Checkout', { 
          visit: {
            id: visitId,
            ...visitData
          } 
        });
      } catch (dbError) {
        if (dbError.code === 'failed-precondition') {
          setIndexError(true);
          Alert.alert(
            'Index Required',
            'The database needs to create an index for this query. This happens automatically and should be ready in 2-5 minutes.',
            [
              { 
                text: 'Create Index Now', 
                onPress: handleCreateIndex 
              },
              { 
                text: 'OK', 
                onPress: () => navigation.goBack() 
              }
            ]
          );
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to save visit. Please try again.'
      );
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

        {/* POI Information Card */}
        <View style={styles.poiCard}>
          <View style={styles.poiHeader}>
            <View style={[
              styles.poiIconContainer,
              { backgroundColor: getLocationColor(poiData.type) }
            ]}>
              <MaterialIcons 
                name={getLocationIcon(poiData.type)} 
                size={24} 
                color="white" 
              />
            </View>
            <Text style={styles.poiName}>{poiData.name}</Text>
          </View>
          
          {poiData.address && (
            <View style={styles.poiInfoRow}>
              <Ionicons name="location" size={18} color="#6B778C" />
              <Text style={styles.poiInfoText}>{poiData.address}</Text>
            </View>
          )}
          
          {poiData.contact && (
            <View style={styles.poiInfoRow}>
              <Ionicons name="call" size={18} color="#6B778C" />
              <Text style={styles.poiInfoText}>{poiData.contact}</Text>
            </View>
          )}
        </View>

        {/* Contact Information Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
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

        {/* Visit Details Card */}
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

        {/* Products Card */}
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

        {/* Notes Card */}
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

        {/* Attachments Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Attachments</Text>
          <TouchableOpacity 
            onPress={pickImage} 
            style={styles.photoButton} 
            disabled={uploading}
          >
            <Ionicons 
              name={image ? 'checkmark-circle' : 'camera'} 
              size={20} 
              color="white" 
            />
            <Text style={styles.photoButtonText}>
              {uploading ? 'Uploading...' : image ? 'Photo Added' : 'Add Photo'}
            </Text>
          </TouchableOpacity>
          
          {image && (
            <Image 
              source={{ uri: image }} 
              style={styles.imagePreview} 
              resizeMode="cover"
            />
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleSaveAndCheckoutLater}
          style={[styles.actionButton, styles.saveButton]}
          disabled={submitting || uploading}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.actionButtonText}>
              SAVE AND CHECK OUT LATER
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleProceedToCheckout}
          style={[styles.actionButton, styles.checkoutButton]}
          disabled={submitting || uploading}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.actionButtonText}>
              PROCEED TO CHECK OUT
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9FFFA',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  poiCard: {
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
  poiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  poiIconContainer: {
    borderRadius: 12,
    padding: 8,
    marginRight: 12,
  },
  poiName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#172B4D',
    flex: 1,
  },
  poiInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  poiInfoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
    marginLeft: 8,
    flex: 1,
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
  photoButton: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photoButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    marginLeft: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButton: {
    backgroundColor: '#6c757d',
    marginRight: 8,
  },
  checkoutButton: {
    backgroundColor: '#28a745',
    marginLeft: 8,
  },
  actionButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
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
