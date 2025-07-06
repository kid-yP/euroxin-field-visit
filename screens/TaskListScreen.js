// screens/TaskListScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Feather } from '@expo/vector-icons';

export default function TaskListScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');

  const fetchTasks = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Fetch all tasks (modify query if you want to filter by user or status)
      const q = query(collection(db, 'tasks'));
      const snapshot = await getDocs(q);
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sort: pending tasks first, then completed
      const sortedTasks = taskList.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (b.status === 'completed' && a.status !== 'completed') return -1;
        return 0;
      });

      setTasks(sortedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, []);

  const toggleStatus = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await updateDoc(doc(db, 'tasks', task.id), { status: newStatus });
      fetchTasks();
    } catch (err) {
      Alert.alert('Error', 'Failed to update task status.');
      console.error('Status toggle error:', err);
    }
  };

  const formatDueDate = (dueDate) => {
    if (!dueDate) return 'No date';
    try {
      if (dueDate.toDate) {
        return dueDate.toDate().toLocaleDateString();
      }
      return new Date(dueDate).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const isSameWeek = (date) => {
    const now = new Date();
    const target = new Date(date);
    const startOfWeek = new Date(now);
    const endOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return target >= startOfWeek && target <= endOfWeek;
  };

  const isSameMonth = (date) => {
    const now = new Date();
    const target = new Date(date);
    return now.getFullYear() === target.getFullYear() &&
           now.getMonth() === target.getMonth();
  };

  const getFilteredTasks = () => {
    if (selectedTab === 'week') {
      return tasks.filter(task => {
        const d = task.dueDate?.toDate?.() || new Date(task.dueDate);
        return d && isSameWeek(d);
      });
    }
    if (selectedTab === 'month') {
      return tasks.filter(task => {
        const d = task.dueDate?.toDate?.() || new Date(task.dueDate);
        return d && isSameMonth(d);
      });
    }
    return tasks;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => navigation.navigate('TaskDetails', { task: item })}
      onLongPress={() =>
        Alert.alert(
          'Update Status',
          `Mark task as ${item.status === 'completed' ? 'pending' : 'completed'}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Yes', onPress: () => toggleStatus(item) },
          ]
        )
      }
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <View
          style={[
            styles.status,
            item.status === 'completed' ? styles.completed : styles.pending,
          ]}
        >
          <Text style={styles.statusText}>
            {item.status === 'completed' ? '✅' : '⏳'}
          </Text>
        </View>
      </View>

      <Text style={styles.taskDue}>
        Due: {formatDueDate(item.dueDate)}
      </Text>

      {item.description ? (
        <Text style={styles.taskDesc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  const tabs = [
    { label: 'All', value: 'all' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Tasks</Text>

      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.value}
            style={[
              styles.tabButton,
              selectedTab === tab.value && styles.activeTab,
            ]}
            onPress={() => setSelectedTab(tab.value)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.value && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : getFilteredTasks().length === 0 ? (
        <Text style={styles.emptyText}>No tasks assigned.</Text>
      ) : (
        <FlatList
          data={getFilteredTasks()}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Add New Task Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('TaskDetails', { mode: 'create' })}
      >
        <Feather name="plus-circle" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add New Task</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 26,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    color: '#333',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  taskCard: {
    backgroundColor: '#f1f1f1',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  status: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  pending: {
    backgroundColor: '#ffc107',
  },
  completed: {
    backgroundColor: '#28a745',
  },
  taskDue: {
    marginTop: 6,
    fontSize: 14,
    color: '#666',
  },
  taskDesc: {
    marginTop: 6,
    fontSize: 14,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: 'gray',
  },
  addButton: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
