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
import { db, auth, storage } from '../firebase/config'; // Make sure storage is exported here
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const productOptions = [
  'Euroxin-69',
  'Euroxin-X',
  'Euroxin-Forte',
  'Euroxin-Combo',
  'Other',
];

export default function VisitDetailsScreen({ route, navigation }) {
  const editData = route?.params?.visitData;

  const [contactName, setContactName] = useState(editData?.contactName || '');
  const [contactPhone, setContactPhone] = useState(editData?.contactPhone || '');
  const [isFamiliar, setIsFamiliar] = useState(editData?.isFamiliar ?? null);
  const [interested, setInterested] = useState(editData?.interested ?? null);
  const [selectedProducts, setSelectedProducts] = useState(editData?.products || []);
  const [notes, setNotes] = useState(editData?.notes || '');
  const [image, setImage] = useState(editData?.image || null);
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

      if (editData?.id) {
        const docRef = doc(db, 'visits', editData.id);
        await updateDoc(docRef, {
          contactName,
          contactPhone,
          isFamiliar,
          interested,
          products: selectedProducts,
          notes,
          image: uploadedImageUrl || null,
          status: 'completed',
        });
        Alert.alert('Updated', 'Visit updated!');
      } else {
        await addDoc(collection(db, 'visits'), {
          userId: auth.currentUser?.uid,
          date: new Date().toISOString().slice(0, 10),
          timestamp: Timestamp.now(),
          contactName,
          contactPhone,
          isFamiliar,
          interested,
          products: selectedProducts,
          notes,
          image: uploadedImageUrl || null,
          status: 'completed',
        });
        Alert.alert('Success', 'Visit saved!');
      }

      navigation.goBack();
    } catch (error) {
      console.error('🔥 Error submitting visit:', error);
      Alert.alert('Error', 'Could not save visit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Visit Details</Text>

      <TextInput
        placeholder="Contact Name"
        value={contactName}
        onChangeText={setContactName}
        style={styles.input}
      />
      <TextInput
        placeholder="Contact Phone"
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Familiar with Euroxin?</Text>
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

      <Text style={styles.label}>Interested to order?</Text>
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
        <Text style={styles.photoButtonText}>{uploading ? 'Uploading...' : 'Attach Photo'}</Text>
      </TouchableOpacity>

      {image ? <Image source={{ uri: image }} style={styles.imagePreview} /> : null}

      <TouchableOpacity
        onPress={handleSubmit}
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Visit</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  label: { fontWeight: 'bold', marginBottom: 6 },
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
    fontWeight: 'bold',
    textAlign: 'center',
  },
  toggleTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#eee',
    margin: 5,
  },
  chipSelected: {
    backgroundColor: '#007bff',
  },
  chipText: {
    color: '#000',
  },
  chipTextSelected: {
    color: '#fff',
  },
  photoButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  photoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
    fontWeight: 'bold',
  },
});
