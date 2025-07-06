import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import ExpandableSection from '../components/ExpandableSection';

export default function HomeScreen({ navigation }) {
  const [todayVisits, setTodayVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const userId = auth.currentUser?.uid;

        if (!userId) return;

        const visitsRef = collection(db, 'visits');
        const q = query(
          visitsRef,
          where('userId', '==', userId),
          where('date', '==', todayStr)
        );

        const snapshot = await getDocs(q);
        const visits = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTodayVisits(visits);
      } catch (error) {
        console.error('Error fetching visits:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVisits();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <Text style={styles.title}>Visits overview</Text>

      {loading ? (
        <Text>Loading visits...</Text>
      ) : (
        <ExpandableSection title="Today’s Visits">
          {todayVisits.length > 0 ? (
            todayVisits.map((v) => (
              <TouchableOpacity
                key={v.id}
                onPress={() =>
                  navigation.navigate('VisitDetails', { visitData: v })
                }
              >
                <Text style={styles.visitItem}>
                  • {v.contactName} ({v.status})
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text>No visits planned today.</Text>
          )}
        </ExpandableSection>
      )}

      <ExpandableSection title="This Week’s Plan">
        <Text>🔜 Coming soon</Text>
      </ExpandableSection>

      <ExpandableSection title="This Month’s Plan">
        <Text>🔜 Coming soon</Text>
      </ExpandableSection>

      {/* New Visit button added here */}
      <TouchableOpacity
        style={styles.newVisitButton}
        onPress={() => navigation.navigate('VisitDetails')}
      >
        <Text style={styles.newVisitButtonText}>➕ New Visit</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => navigation.navigate('Map')}
      >
        <Text style={styles.mapButtonText}>📍Show POI Map</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleLogout}
        style={styles.logoutButton}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'left',
  },
  mapButton: {
    marginTop: 10,
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  visitItem: {
    paddingVertical: 6,
    color: '#007bff',
  },
  newVisitButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  newVisitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#dc3545',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoutText: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
});
