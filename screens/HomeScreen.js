import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
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
        const todayStr = today.toISOString().slice(0, 10); // "YYYY-MM-DD"
        const userId = auth.currentUser?.uid;

        console.log('📅 Today String:', todayStr);
        console.log('👤 Auth UID:', userId);

        if (!userId) {
          console.warn("No logged-in user.");
          return;
        }

        // Query for today's visits for the current user
        const visitsRef = collection(db, 'visits');
        const q = query(
          visitsRef,
          where('userId', '==', userId),
          where('date', '==', todayStr)
        );

        const snapshot = await getDocs(q);
        const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("✅ Visits Retrieved:", visits);

        setTodayVisits(visits);
      } catch (error) {
        console.error("Error fetching visits:", error.message);
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
      <Text style={styles.title}>Dashboard</Text>

      {loading ? (
        <Text>Loading visits...</Text>
      ) : (
        <ExpandableSection title="Today’s Visits">
          {todayVisits.length > 0 ? (
            todayVisits.map((v) => (
              <Text key={v.id}>• {v.contactName} ({v.status})</Text>
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

      <Button title="Visit Details" onPress={() => navigation.navigate('VisitDetails')} />

      <View style={{ marginTop: 30 }}>
        <Button title="Logout" onPress={handleLogout} />
      </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
});
