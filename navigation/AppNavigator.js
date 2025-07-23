import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View, StyleSheet } from 'react-native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import StockScreen from '../screens/StockScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VisitDetailsScreen from '../screens/VisitDetailsScreen';
import VisitSummaryScreen from '../screens/VisitSummaryScreen';
import MapScreen from '../screens/MapScreen';
import POIDetailsScreen from '../screens/POIDetailsScreen';
import EditVisitScreen from '../screens/EditVisitScreen';
import TaskListScreen from '../screens/TaskListScreen';
import TaskDetailsScreen from '../screens/TaskDetailsScreen';
import KnowledgeCenterScreen from '../screens/KnowledgeCenterScreen';
import RepTrackingScreen from '../screens/RepTrackingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tab Bar Background with reduced transparency
const TabBarBackground = () => (
  <LinearGradient
    colors={['#38B6FF', '#80CC28']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.tabBarGradient}
  />
);

// Header Background with rounded bottom corners for specific screens
const RoundedHeaderBackground = () => (
  <LinearGradient
    colors={['#38B6FF', '#80CC28']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.roundedHeaderGradient}
  />
);

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          switch (route.name) {
            case 'Home': iconName = focused ? 'home' : 'home-outline'; break;
            case 'Tasks': iconName = focused ? 'checkbox' : 'checkbox-outline'; break;
            case 'Stock': iconName = focused ? 'cube' : 'cube-outline'; break;
            case 'Profile': iconName = focused ? 'person' : 'person-outline'; break;
            case 'Knowledge': iconName = focused ? 'book' : 'book-outline'; break;
            default: iconName = 'circle';
          }
          
          return (
            <Ionicons 
              name={iconName} 
              size={24} 
              color={focused ? '#fff' : 'rgba(255,255,255,0.7)'} 
            />
          );
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.7)',
        tabBarLabelStyle: { 
          fontSize: 12,
          fontFamily: 'Poppins-Medium',
          marginBottom: 4,
        },
        tabBarStyle: {
          height: 70,
          borderTopWidth: 0,
          backgroundColor: 'rgba(56, 182, 255, 0.9)', // Reduced transparency
          elevation: 0,
          position: 'absolute',
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarItemStyle: {
          borderRadius: 0,
          padding: 0,
          margin: 0,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TaskListScreen} />
      <Tab.Screen name="Stock" component={StockScreen} />
      <Tab.Screen name="Knowledge" component={KnowledgeCenterScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#38B6FF',
          elevation: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontFamily: 'Poppins-SemiBold',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
        headerBackTitleVisible: false,
        headerBackImage: ({ tintColor }) => (
          <Ionicons name="chevron-back" size={24} color={tintColor} style={{ marginLeft: 10 }} />
        ),
      }}
    >
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      
      <Stack.Screen 
        name="VisitSummary" 
        component={VisitSummaryScreen} 
        options={{ 
          title: 'Visit Summary',
          headerBackground: () => <RoundedHeaderBackground />,
          headerStyle: {
            height: 100,
          },
        }} 
      />
      
      <Stack.Screen 
        name="VisitDetails" 
        component={VisitDetailsScreen} 
        options={{ 
          title: 'New Visit',
          headerBackground: () => <RoundedHeaderBackground />,
          headerStyle: {
            height: 100,
          },
        }} 
      />
      
      {/* Other screens */}
      <Stack.Screen name="Map" component={MapScreen} options={{ title: 'POI Map' }} />
      <Stack.Screen name="POIDetails" component={POIDetailsScreen} options={{ title: 'POI Details' }} />
      <Stack.Screen name="EditVisit" component={EditVisitScreen} options={{ title: 'Review Visit' }} />
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} options={{ title: 'Task Details' }} />
      <Stack.Screen name="RepTracking" component={RepTrackingScreen} options={{ title: 'Rep Tracker' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarGradient: {
    height: '100%',
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    opacity: 0.9, // Reduced transparency
  },
  roundedHeaderGradient: {
    flex: 1,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  // VisitSummary bottom buttons
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftButton: {
    backgroundColor: '#38B6FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  rightButton: {
    backgroundColor: '#88d82cff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
});
