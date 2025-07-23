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
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
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
      } else {
        await addDoc(collection(db, 'visits'), {
          ...visitData,
          userId: auth.currentUser?.uid,
        });
      }

      navigation.navigate('VisitSummary', { visit: { ...visit, ...visitData } });
    } catch (error) {
      console.error('Error submitting visit:', error);
      Alert.alert('Error', 'Could not save visit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>
        {visit.id ? 'Edit Visit' : 'New Visit'}
      </Text>

      <TextInput
        placeholder="Contact Name *"
        value={contactName}
        onChangeText={setContactName}
        style={styles.input}
      />
      <TextInput
        placeholder="Contact Phone *"
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
        style={styles.input}
      />

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

      <Text style={styles.label}>Products of Interest</Text>
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

      <TextInput
        placeholder="Notes / Comments"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={[styles.input, { height: 100 }]}
      />

      <TouchableOpacity onPress={pickImage} style={styles.photoButton} disabled={uploading}>
        <Ionicons name={image ? 'checkmark-circle' : 'camera'} size={20} color="white" />
        <Text style={styles.photoButtonText}>
          {uploading ? 'Uploading...' : image ? 'Photo Added' : 'Attach Photo'}
        </Text>
      </TouchableOpacity>

      {image && <Image source={{ uri: image }} style={styles.imagePreview} />}

      <TouchableOpacity
        onPress={handleSubmit}
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            {visit.id ? 'Update Visit' : 'Submit Visit'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20,
    paddingBottom: 40 
  },
  heading: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#172B4D',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
  label: { 
    fontFamily: 'Poppins-SemiBold', 
    marginBottom: 8,
    color: '#172B4D',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007bff',
    backgroundColor: '#fff',
  },
  toggleSelected: {
    backgroundColor: '#007bff',
  },
  toggleText: {
    color: '#007bff',
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
  },
  toggleTextSelected: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#eee',
    margin: 4,
  },
  chipSelected: {
    backgroundColor: '#007bff',
  },
  chipText: {
    color: '#000',
    fontFamily: 'Poppins-Regular',
  },
  chipTextSelected: {
    color: '#fff',
    fontFamily: 'Poppins-Regular',
  },
  photoButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  photoButtonText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    marginBottom: 16,
    borderRadius: 10,
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
});
