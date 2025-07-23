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
} from 'react-native';
import { db, auth, storage } from '../firebase/config';
import { collection, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Ionicons } from '@expo/vector-icons';

const productOptions = [
  'Euroxin-69',
  'Euroxin-X',
  'Euroxin-Forte',
  'Euroxin-Combo',
  'Other',
];

export default function VisitDetailsScreen({ route, navigation }) {
  const visit = route.params?.visit || {};
  
  const [contactName, setContactName] = useState(visit.contactName || '');
  const [contactPhone, setContactPhone] = useState(visit.contactPhone || '');
  const [isFamiliar, setIsFamiliar] = useState(visit.isFamiliar ?? null);
  const [interested, setInterested] = useState(visit.interested ?? null);
  const [selectedProducts, setSelectedProducts] = useState(visit.products || []);
  const [notes, setNotes] = useState(visit.notes || '');
  const [image, setImage] = useState(visit.image || null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleProduct = (product) => {
    if (selectedProducts.includes(product)) {
      setSelectedProducts(selectedProducts.filter((p) => p !== product));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Permission to access gallery is required!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImageAsync = async (uri) => {
    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(
        storage,
        `visits/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`
      );

      const uploadTask = uploadBytesResumable(storageRef, blob);

      const downloadURL = await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          () => {},
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      setUploading(false);
      return downloadURL;
    } catch (e) {
      setUploading(false);
      console.error('Upload failed:', e);
      throw e;
    }
  };

  const handleSubmit = async () => {
    if (!contactName || !contactPhone || isFamiliar === null || interested === null) {
      return Alert.alert('Missing Fields', 'Please complete all required fields.');
    }

    try {
      setSubmitting(true);

      let uploadedImageUrl = image;

      if (image && !image.startsWith('https://')) {
        uploadedImageUrl = await uploadImageAsync(image);
      }

      const visitData = {
        contactName,
        contactPhone,
        isFamiliar,
        interested,
        products: selectedProducts,
        notes,
        image: uploadedImageUrl || null,
        status: 'completed',
        timestamp: Timestamp.now(),
      };

      if (visit.id) {
        const docRef = doc(db, 'visits', visit.id);
        await updateDoc(docRef, visitData);
        Alert.alert('Success', 'Visit updated successfully!');
      } else {
        await addDoc(collection(db, 'visits'), {
          ...visitData,
          userId: auth.currentUser?.uid,
        });
        Alert.alert('Success', 'New visit created successfully!');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error submitting visit:', error);
      Alert.alert('Error', 'Could not save visit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Visit Details</Text>
          
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

      <TouchableOpacity
        onPress={handleSubmit}
        style={styles.submitButton}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitButtonText}>
            {visit.id ? 'UPDATE VISIT' : 'SAVE VISIT'}
          </Text>
        )}
      </TouchableOpacity>
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
    paddingBottom: 100,
    paddingTop: 20, // Added some top padding to compensate for removed header
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
  submitButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
});
