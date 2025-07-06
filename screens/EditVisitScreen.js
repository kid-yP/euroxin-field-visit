// screens/VisitListScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export default function VisitListScreen({ navigation }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVisits = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Example: Fetch visits for today (assuming you store a 'date' field as Firestore Timestamp)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const visitsQuery = query(
        collection(db, 'visits'),
        where('userId', '==', userId),
        where('date', '>=', today),
        where('date', '<', tomorrow)
      );

      const snapshot = await getDocs(visitsQuery);
      const visitList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVisits(visitList);
    } catch (err) {
      console.error('Error fetching visits:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVisits();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.visitCard}
      onPress={() => navigation.navigate('EditVisit', { visit: item })}
    >
      <Text style={styles.visitTitle}>{item.contactName || 'No Contact Name'}</Text>
      <Text style={styles.visitNotes} numberOfLines={2}>
        {item.notes || 'No notes available'}
      </Text>
      <Text style={styles.visitDate}>
        {item.date?.toDate ? item.date.toDate().toLocaleString() : 'No date'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Today's Visits</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : visits.length === 0 ? (
        <Text style={styles.emptyText}>No visits for today.</Text>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, marginTop: 26 },
  visitCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  visitTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  visitNotes: { fontSize: 14, color: '#555' },
  visitDate: { fontSize: 12, color: '#999', marginTop: 6 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16, color: 'gray' },
});
