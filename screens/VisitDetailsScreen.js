// screens/VisitDetailsScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import { db, auth } from '../firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export default function VisitDetailsScreen({ navigation }) {
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isFamiliar, setIsFamiliar] = useState('');
  const [interested, setInterested] = useState('');
  const [products, setProducts] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!contactName || !contactPhone) {
      return Alert.alert('Missing Fields', 'Contact name and phone are required.');
    }

    try {
      await addDoc(collection(db, 'visits'), {
        userId: auth.currentUser.uid,
        date: new Date().toISOString().slice(0, 10),
        timestamp: Timestamp.now(),
        contactName,
        contactPhone,
        isFamiliar,
        interested,
        products,
        notes,
        status: 'completed',
      });

      Alert.alert('Success', 'Visit saved!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving visit:', error);
      Alert.alert('Error', 'Could not save visit.');
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
      <TextInput
        placeholder="Familiar with Euroxin?"
        value={isFamiliar}
        onChangeText={setIsFamiliar}
        style={styles.input}
      />
      <TextInput
        placeholder="Interested to order?"
        value={interested}
        onChangeText={setInterested}
        style={styles.input}
      />
      <TextInput
        placeholder="Products of interest"
        value={products}
        onChangeText={setProducts}
        style={styles.input}
      />
      <TextInput
        placeholder="Notes / Comments"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={[styles.input, { height: 100 }]}
      />

      <Button title="Submit Visit" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
});
