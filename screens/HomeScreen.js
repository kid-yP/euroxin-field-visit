import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { auth, db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import ExpandableSection from '../components/ExpandableSection';

export default function HomeScreen({ navigation }) {
  const [todayVisits, setTodayVisits] = useState([]);
  const [weekVisits, setWeekVisits] = useState([]);
  const [monthVisits, setMonthVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVisits = async () => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const visitsRef = collection(db, 'visits');
      const snapshot = await getDocs(query(visitsRef, where('userId', '==', userId)));
      const allVisits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const filterByDate = (dateStr, start, end) => {
        const date = new Date(dateStr);
        return date >= start && date <= end;
      };

      setTodayVisits(allVisits.filter(v => v.date === todayStr));
      setWeekVisits(allVisits.filter(v => filterByDate(v.date, startOfWeek, endOfWeek)));
      setMonthVisits(allVisits.filter(v => filterByDate(v.date, startOfMonth, endOfMonth)));
    } catch (error) {
      console.error('Error fetching visits:', error.message);
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

  const renderVisitList = (visits) =>
    visits.map((v) => (
      <TouchableOpacity
        key={v.id}
        onPress={() => navigation.navigate('VisitSummary', { visitData: v })}
      >
        <Text style={styles.visitItem}>• {v.contactName} ({v.status})</Text>
      </TouchableOpacity>
    ));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Visits Overview</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading visits...</Text>
        </View>
      ) : (
        <>
          <ExpandableSection title={`Today’s Visits (${todayVisits.length})`}>
            {todayVisits.length ? renderVisitList(todayVisits) : <Text style={styles.emptyText}>No visits today.</Text>}
          </ExpandableSection>

          <ExpandableSection title={`This Week’s Plan (${weekVisits.length})`}>
            {weekVisits.length ? renderVisitList(weekVisits) : <Text style={styles.emptyText}>No visits this week.</Text>}
          </ExpandableSection>

          <ExpandableSection title={`This Month’s Plan (${monthVisits.length})`}>
            {monthVisits.length ? renderVisitList(monthVisits) : <Text style={styles.emptyText}>No visits this month.</Text>}
          </ExpandableSection>
        </>
      )}

      <View style={styles.quickActionsContainer}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.actionsColumn}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#28a745' }]}
            onPress={() => navigation.navigate('VisitDetails')}
          >
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionText}>New Visit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#007bff' }]}
            onPress={() => navigation.navigate('Map')}
          >
            <Text style={styles.actionIcon}>🖼️</Text>
            <Text style={styles.actionText}>POI Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ff6600' }]}
            onPress={() => navigation.navigate('RepTracking')}
          >
            <Text style={styles.actionIcon}>📍</Text>
            <Text style={styles.actionText}>Rep Locations</Text>
          </TouchableOpacity>
        </View>
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  center: {
    alignItems: 'center',
    marginTop: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  emptyText: {
    color: 'gray',
    fontSize: 15,
    marginVertical: 8,
  },
  visitItem: {
    paddingVertical: 6,
    color: '#007bff',
  },
  quickActionsContainer: {
    marginTop: 30,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionsColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 140,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 6,
    color: '#fff',
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});
