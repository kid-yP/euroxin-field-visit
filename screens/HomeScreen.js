import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ExpandableSection from '../components/ExpandableSection';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [todayVisits, setTodayVisits] = useState([
    { id: 1, name: 'John Pharmacy', status: 'Pending', time: '09:00 AM', bgColor: '#FFF5E6' },
    { id: 2, name: 'City Medical', status: 'Completed', time: '11:30 AM', bgColor: '#E6FFEE' }
  ]);
  
  const [weekVisits, setWeekVisits] = useState([
    { id: 3, name: 'Health Plus', status: 'Scheduled', date: 'Tomorrow', bgColor: '#E6F7FF' },
    { id: 4, name: 'MediCare', status: 'Scheduled', date: 'Friday', bgColor: '#F0E6FF' }
  ]);
  
  const [monthVisits, setMonthVisits] = useState([
    { id: 5, name: 'PharmaOne', status: 'Scheduled', date: 'May 25', bgColor: '#FFF0E6' }
  ]);

  const metrics = [
    { 
      title: "Today", 
      value: todayVisits.length, 
      progress: 0.5,
      icon: 'today-outline',
      color: '#FF6B00',
      bgColor: '#FFF5E6'
    },
    { 
      title: "Week", 
      value: weekVisits.length, 
      progress: 0.3,
      icon: 'calendar-outline',
      color: '#00C853',
      bgColor: '#E6F7FF'
    },
    { 
      title: "Month", 
      value: monthVisits.length, 
      progress: 0.1,
      icon: 'calendar-outline',
      color: '#2962FF',
      bgColor: '#F0E6FF'
    }
  ];

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setTodayVisits([...todayVisits].reverse());
      setWeekVisits([...weekVisits].reverse());
      setMonthVisits([...monthVisits].reverse());
      setRefreshing(false);
    }, 1500);
  }, [todayVisits, weekVisits, monthVisits]);

  const renderVisitItem = (visit) => (
    <TouchableOpacity 
      key={visit.id} 
      style={[styles.visitItem, { backgroundColor: visit.bgColor }]}
      onPress={() => navigation.navigate('VisitSummary', { visit })}
    >
      <View style={styles.visitInfo}>
        <Text style={styles.visitName}>{visit.name}</Text>
        <View style={styles.visitMeta}>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={14} color="#6B778C" style={styles.clockIcon} />
            <Text style={styles.visitTime}>{visit.time || visit.date}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { 
              backgroundColor: visit.status === 'Completed' ? '#E6FFEE' : 
                              visit.status === 'Pending' ? '#FFF5E6' : '#E6F7FF',
              borderColor: visit.status === 'Completed' ? '#00C853' : 
                          visit.status === 'Pending' ? '#FF6B00' : '#2962FF'
            }
          ]}>
            <Text style={[
              styles.visitStatus,
              { 
                color: visit.status === 'Completed' ? '#00C853' : 
                       visit.status === 'Pending' ? '#FF6B00' : '#2962FF'
              }
            ]}>
              {visit.status}
            </Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6B778C" />
    </TouchableOpacity>
  );

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
            <TouchableOpacity 
              style={styles.addButton}
              onPress={toggleMenu}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={28} color="white" style={styles.addIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Enhanced Dropdown Menu */}
      {showMenu && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              navigation.navigate('VisitDetails', { visit: {} });
              setShowMenu(false);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="document-text-outline" size={20} color="#007bff" />
            </View>
            <Text style={styles.menuItemText}>New Visit</Text>
            <Ionicons name="chevron-forward" size={18} color="#6B778C" />
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />
          
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
          title={`Today's Visits (${todayVisits.length})`}
          icon="today-outline"
          iconColor="#FF6B00"
          headerBgColor="#FFF5E6"
          initialExpanded={true}
          headerStyle={[styles.todayHeader, styles.sectionHeader]}
        >
          {todayVisits.map(renderVisitItem)}
        </ExpandableSection>

        <ExpandableSection 
          title={`This Week's Plan (${weekVisits.length})`}
          icon="calendar-outline"
          iconColor="#00C853"
          headerBgColor="#E6F7FF"
          headerStyle={[styles.weekHeader, styles.sectionHeader]}
        >
          {weekVisits.map(renderVisitItem)}
        </ExpandableSection>

        <ExpandableSection 
          title={`This Month's Plan (${monthVisits.length})`}
          icon="calendar-outline"
          iconColor="#2962FF"
          headerBgColor="#F0E6FF"
          headerStyle={[styles.monthHeader, styles.sectionHeader]}
        >
          {monthVisits.map(renderVisitItem)}
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
    minHeight: 60,
  },
  visitInfo: {
    flex: 1,
  },
  visitName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#172B4D',
    marginBottom: 2,
  },
  visitMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  visitStatus: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
});
