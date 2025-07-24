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
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function TaskListScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('week');
  const [showDoneButton, setShowDoneButton] = useState(null);

  // Sample tasks for this week
  const sampleTasks = [
    {
      id: 'sample1',
      title: 'Team Meeting',
      description: 'Weekly team sync at conference room',
      dueDate: new Date(Date.now() + 86400000 * 2),
      status: 'pending',
      priority: 'urgent'
    },
    {
      id: 'sample2',
      title: 'Project Deadline',
      description: 'Submit final project deliverables',
      dueDate: new Date(Date.now() + 86400000 * 5),
      status: 'pending',
      priority: 'scheduled'
    },
    {
      id: 'sample3',
      title: 'Client Call',
      description: 'Discuss new requirements with ABC Corp',
      dueDate: new Date(Date.now() + 86400000 * 1),
      status: 'pending',
      priority: 'urgent'
    }
  ];

  const fetchTasks = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(collection(db, 'tasks'));
      const snapshot = await getDocs(q);
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Merge with sample tasks
      const allTasks = [...taskList, ...sampleTasks];
      
      const sortedTasks = allTasks.sort((a, b) => {
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
      if (task.id.startsWith('sample')) {
        setTasks(prev => prev.map(t => 
          t.id === task.id ? {...t, status: newStatus} : t
        ));
      } else {
        await updateDoc(doc(db, 'tasks', task.id), { status: newStatus });
        fetchTasks();
      }
      setShowDoneButton(null); // Hide the button after marking as done
    } catch (err) {
      Alert.alert('Error', 'Failed to update task status.');
      console.error('Status toggle error:', err);
    }
  };

  const handleDoneButtonPress = (taskId) => {
    setShowDoneButton(taskId);
    setTimeout(() => {
      setShowDoneButton(null);
    }, 2000);
  };

  const formatDueDate = (dueDate) => {
    if (!dueDate) return 'No date';
    try {
      if (dueDate.toDate) {
        return dueDate.toDate().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });
      }
      return new Date(dueDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
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

  const getBadgeStyle = (task) => {
    if (task.status === 'completed') {
      return { backgroundColor: '#E6FFEE', borderColor: '#00C853' };
    }
    if (task.priority === 'urgent') {
      return { backgroundColor: '#FFEBEE', borderColor: '#FF5252' };
    }
    if (task.priority === 'scheduled') {
      return { backgroundColor: '#E3F2FD', borderColor: '#2196F3' };
    }
    return { backgroundColor: '#FFF5E6', borderColor: '#FF6B00' };
  };

  const getBadgeText = (task) => {
    if (task.status === 'completed') return 'Completed';
    if (task.priority === 'urgent') return 'Urgent';
    if (task.priority === 'scheduled') return 'Scheduled';
    return 'Pending';
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.taskCard,
        item.status === 'completed' && styles.completedTask
      ]}
      onPress={() => navigation.navigate('TaskDetails', { task: item })}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <Text style={styles.taskDue}>
            <Feather name="calendar" size={14} color="#6B778C" /> {formatDueDate(item.dueDate)}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          getBadgeStyle(item)
        ]}>
          <Text style={styles.statusText}>
            {getBadgeText(item)}
          </Text>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.taskDesc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      {showDoneButton === item.id && item.status !== 'completed' ? (
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => toggleStatus(item)}
        >
          <Text style={styles.doneButtonText}>Mark as Done</Text>
        </TouchableOpacity>
      ) : (
        !showDoneButton && item.status !== 'completed' && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => handleDoneButtonPress(item.id)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#6B778C" />
          </TouchableOpacity>
        )
      )}
    </TouchableOpacity>
  );

  const tabs = [
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#38B6FF4D', '#80CC28']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <TouchableOpacity
            style={styles.addButtonHeader}
            onPress={() => navigation.navigate('TaskDetails', { mode: 'create' })}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

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
            <Text style={[
              styles.tabText,
              selectedTab === tab.value && styles.activeTabText,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : getFilteredTasks().length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={48} color="#6B778C" />
            <Text style={styles.emptyText}>No tasks found</Text>
            <Text style={styles.emptySubtext}>Create a new task to get started</Text>
          </View>
        ) : (
          <FlatList
            data={getFilteredTasks()}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#007bff']}
                tintColor="#007bff"
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9FFFA',
  },
  header: {
    height: 70,
    justifyContent: 'center',
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: 'white',
    left: 6,
  },
  addButtonHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 42,
    height: 43,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    top: 0.3,
    right: 5,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#6B778C',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  completedTask: {
    opacity: 0.7,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#172B4D',
    marginBottom: 4,
  },
  taskDue: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  taskDesc: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
    marginTop: 8,
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  doneButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  moreButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#172B4D',
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
    marginTop: 4,
  },
});
