import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs, orderBy, limit, Timestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from '../firebase/useAuth';
import ExpandableSection from '../components/ExpandableSection';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user, loading: authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [todayVisits, setTodayVisits] = useState([]);
  const [weekVisits, setWeekVisits] = useState([]);
  const [monthVisits, setMonthVisits] = useState([]);
  
  const [metrics, setMetrics] = useState([
    { 
      title: "Today", 
      value: 0, 
      progress: 0,
      icon: 'today-outline',
      color: '#FF6B00',
      bgColor: '#FFF5E6'
    },
    { 
      title: "Week", 
      value: 0, 
      progress: 0,
      icon: 'calendar-outline',
      color: '#00C853',
      bgColor: '#E6F7FF'
    },
    { 
      title: "Month", 
      value: 0, 
      progress: 0,
      icon: 'calendar-outline',
      color: '#2962FF',
      bgColor: '#F0E6FF'
    }
  ]);

  // Safe document update function
  const updateAssignedVisitsCount = async (userId, count) => {
    try {
      const assignedVisitsRef = doc(db, 'assignedVisits', userId);
      await setDoc(assignedVisitsRef, {
        count: count,
        userId: userId,
        lastUpdated: new Date()
      }, { merge: true }); // Merge with existing document if it exists
    } catch (error) {
      console.error("Error updating assigned visits count:", error);
      Alert.alert("Error", "Could not update visit count");
    }
  };

  const fetchVisits = async () => {
    try {
      if (!user?.uid) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // For field workers, only fetch visits assigned to them
      const assignedWorkerFilter = user?.role === 'field-worker' 
        ? where('assignedWorkerId', '==', user.uid)
        : where('userId', '==', user.uid);

      // Today's visits query
      const todayQuery = query(
        collection(db, 'visits'),
        assignedWorkerFilter,
        where('date', '>=', Timestamp.fromDate(today)),
        where('date', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('date', 'asc')
      );
      
      const todaySnapshot = await getDocs(todayQuery);
      const todayData = todaySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        bgColor: '#FFF5E6'
      }));

      // Update assigned visits count for field workers
      if (user?.role === 'field-worker') {
        await updateAssignedVisitsCount(user.uid, todayData.length);
      }

      // This week's visits query
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      const weekQuery = query(
        collection(db, 'visits'),
        assignedWorkerFilter,
        where('date', '>=', Timestamp.fromDate(today)),
        where('date', '<=', Timestamp.fromDate(endOfWeek)),
        orderBy('date', 'asc')
      );
      
      const weekSnapshot = await getDocs(weekQuery);
      const weekData = weekSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        bgColor: '#E6F7FF'
      }));

      // This month's visits query
      const endOfMonth = new Date(today);
      endOfMonth.setMonth(today.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);
      
      const monthQuery = query(
        collection(db, 'visits'),
        assignedWorkerFilter,
        where('date', '>=', Timestamp.fromDate(today)),
        where('date', '<=', Timestamp.fromDate(endOfMonth)),
        orderBy('date', 'asc'),
        limit(10)
      );
      
      const monthSnapshot = await getDocs(monthQuery);
      const monthData = monthSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        bgColor: '#F0E6FF'
      }));

      // Update state with fetched data
      setTodayVisits(todayData);
      setWeekVisits(weekData);
      setMonthVisits(monthData);
      
      setMetrics([
        { 
          ...metrics[0], 
          value: todayData.length, 
          progress: Math.min(todayData.length / 5, 1) 
        },
        { 
          ...metrics[1], 
          value: weekData.length, 
          progress: Math.min(weekData.length / 10, 1) 
        },
        { 
          ...metrics[2], 
          value: monthData.length, 
          progress: Math.min(monthData.length / 20, 1) 
        }
      ]);

    } catch (error) {
      console.error("Error fetching visits:", error);
      if (error.code === 'failed-precondition') {
        Alert.alert(
          "Index Required",
          "Please create the Firestore index for visits collection. The index is being created automatically, please wait a few minutes and try again.",
          [
            {
              text: "OK",
              onPress: () => {}
            }
          ]
        );
      } else {
        Alert.alert("Error", "Could not load visits data");
      }
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchVisits();
    }
  }, [user, authLoading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVisits().then(() => setRefreshing(false));
  }, [user]);

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const renderVisitItem = (visit) => (
    <TouchableOpacity 
      key={visit.id} 
      style={[styles.visitItem, { backgroundColor: visit.bgColor }]}
      onPress={() => navigation.navigate('VisitSummary', { visitId: visit.id })}
    >
      <View style={styles.visitInfo}>
        <Text style={styles.visitName}>{visit.assignedWorker || 'Unassigned Visit'}</Text>
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={14} color="#6B778C" style={styles.clockIcon} />
          <Text style={styles.visitTime}>
            {visit.date?.toDate?.().toLocaleDateString()} • {visit.date?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'No time'}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { 
            backgroundColor: visit.status === 'completed' ? '#E6FFEE' : 
                            visit.status === 'pending' ? '#FFF5E6' : '#E6F7FF',
            borderColor: visit.status === 'completed' ? '#00C853' : 
                        visit.status === 'pending' ? '#FF6B00' : '#2962FF'
          }
        ]}>
          <Text style={[
            styles.visitStatus,
            { 
              color: visit.status === 'completed' ? '#00C853' : 
                     visit.status === 'pending' ? '#FF6B00' : '#2962FF'
            }
          ]}>
            {visit.status || 'scheduled'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6B778C" />
    </TouchableOpacity>
  );

  if (authLoading || dataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#38B6FF4D', '#80CC28']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Image 
            source={require('../assets/LOGO.png')}
            style={styles.logo}
          />
          <View style={styles.headerRight}>
            {user && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={toggleMenu}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={28} color="white" style={styles.addIcon} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {showMenu && user && (
        <View style={styles.dropdownMenu}>
          {user.role === 'team-leader' && (
            <>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  navigation.navigate('VisitDetails', { visit: {} });
                  setShowMenu(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons name="add-circle-outline" size={20} color="#007bff" />
                </View>
                <Text style={styles.menuItemText}>New Visit</Text>
                <Ionicons name="chevron-forward" size={18} color="#6B778C" />
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
            </>
          )}
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              navigation.navigate('POIDetails', { poi: {} });
              setShowMenu(false);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="location-outline" size={20} color="#007bff" />
            </View>
            <Text style={styles.menuItemText}>POI Screen</Text>
            <Ionicons name="chevron-forward" size={18} color="#6B778C" />
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              navigation.navigate('RepTracking');
              setShowMenu(false);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="people-outline" size={20} color="#007bff" />
            </View>
            <Text style={styles.menuItemText}>Rep Tracker</Text>
            <Ionicons name="chevron-forward" size={18} color="#6B778C" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.metricsRow}>
        {metrics.map((metric, index) => (
          <View key={index} style={[styles.metricCard, { backgroundColor: metric.bgColor }]}>
            <View style={styles.metricHeader}>
              <Ionicons name={metric.icon} size={20} color={metric.color} />
              <Text style={styles.metricTitle}>{metric.title}</Text>
            </View>
            
            <View style={styles.metricValueContainer}>
              <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
              <Text style={styles.visitsText}>visits</Text>
            </View>
            
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { 
                    width: `${metric.progress * 100}%`,
                    backgroundColor: metric.color
                  }
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      <ScrollView 
        style={styles.sectionsContainer}
        contentContainerStyle={styles.sectionsContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={40}
            colors={['#FF6B00', '#00C853', '#2962FF']}
            tintColor="#FF6B00"
          />
        }
      >
        <ExpandableSection 
          title="Today's Visits"
          icon="today-outline"
          iconColor="#FF6B00"
          headerBgColor="#FFF5E6"
          initialExpanded={true}
          headerStyle={[styles.todayHeader, styles.sectionHeader]}
        >
          {todayVisits.map(renderVisitItem)}
          {todayVisits.length === 0 && (
            <Text style={styles.emptyText}>No visits scheduled for today</Text>
          )}
        </ExpandableSection>

        <ExpandableSection 
          title="This Week's Plan"
          icon="calendar-outline"
          iconColor="#00C853"
          headerBgColor="#E6F7FF"
          headerStyle={[styles.weekHeader, styles.sectionHeader]}
        >
          {weekVisits.map(renderVisitItem)}
          {weekVisits.length === 0 && (
            <Text style={styles.emptyText}>No visits scheduled this week</Text>
          )}
        </ExpandableSection>

        <ExpandableSection 
          title="This Month's Plan"
          icon="calendar-outline"
          iconColor="#2962FF"
          headerBgColor="#F0E6FF"
          headerStyle={[styles.monthHeader, styles.sectionHeader]}
        >
          {monthVisits.map(renderVisitItem)}
          {monthVisits.length === 0 && (
            <Text style={styles.emptyText}>No visits scheduled this month</Text>
          )}
        </ExpandableSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9FFFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E9FFFA',
  },
  header: {
    width: '100%',
    height: 70,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 150,
    height: 250,
    resizeMode: 'contain',
    left: -11,
    top: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    top: 5,
  },
  addIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dropdownMenu: {
    position: 'absolute',
    right: 20,
    top: 70,
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 8,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  menuIconContainer: {
    width: 30,
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: '#172B4D',
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  metricCard: {
    width: '31%',
    borderRadius: 12,
    padding: 12,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: '#172B4D',
    left: -4,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  metricValue: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    marginRight: 4,
  },
  visitsText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#6B778C',
    marginBottom: 3,
  },
  progressContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  sectionsContainer: {
    flex: 1,
  },
  sectionsContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  sectionHeader: {
    paddingVertical: 14,
    minHeight: 50,
  },
  todayHeader: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
  },
  weekHeader: {
    borderLeftWidth: 4,
    borderLeftColor: '#00C853',
  },
  monthHeader: {
    borderLeftWidth: 4,
    borderLeftColor: '#2962FF',
  },
  visitItem: {
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    minHeight: 80,
  },
  visitInfo: {
    flex: 1,
  },
  visitName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#172B4D',
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  clockIcon: {
    marginRight: 4,
  },
  visitTime: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#6B778C',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  visitStatus: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B778C',
    paddingVertical: 16,
    fontFamily: 'Poppins-Regular',
  },
});

