import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

// Custom Tab Bar Background
const TabBarBackground = () => (
  <LinearGradient
    colors={['#38B6FF4D', '#80CC28']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '100%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    }}
  />
);

// Bottom Tab Navigator with gradient styling
function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          let iconComponent = Feather;
          
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              iconComponent = Ionicons;
              break;
            case 'Tasks':
              iconName = 'check-square';
              break;
            case 'Stock':
              iconName = 'package';
              break;
            case 'Profile':
              iconName = 'user';
              break;
            case 'KnowledgeCenter':
              iconName = 'book';
              break;
            default:
              iconName = 'circle';
          }
          
          const Icon = iconComponent;
          return (
            <Icon 
              name={iconName} 
              size={size} 
              color={focused ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} 
            />
          );
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.7)',
        tabBarLabelStyle: { 
          fontSize: 12,
          fontFamily: 'Poppins-Medium',
          marginBottom: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          height: 70,
        },
        tabBarBackground: () => <TabBarBackground />,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={size} 
              color={color} 
            />
          )
        }}
      />
      <Tab.Screen 
        name="Tasks" 
        component={TaskListScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'checkbox' : 'checkbox-outline'} 
              size={size} 
              color={color} 
            />
          )
        }}
      />
      <Tab.Screen 
        name="Stock" 
        component={StockScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'cube' : 'cube-outline'} 
              size={size} 
              color={color} 
            />
          )
        }}
      />
      <Tab.Screen 
        name="KnowledgeCenter" 
        component={KnowledgeCenterScreen} 
        options={{
          tabBarLabel: 'Knowledge',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'book' : 'book-outline'} 
              size={size} 
              color={color} 
            />
          )
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={size} 
              color={color} 
            />
          )
        }}
      />
    </Tab.Navigator>
  );
}

// Main Stack Navigator
export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontFamily: 'Poppins-SemiBold',
          fontSize: 20,
        },
        headerBackground: () => (
          <LinearGradient
            colors={['#38B6FF4D', '#80CC28']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        ),
      }}
    >
      <Stack.Screen 
        name="Tabs" 
        component={Tabs} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="VisitDetails" 
        component={VisitDetailsScreen} 
        options={{ title: 'Visit Details' }} 
      />
      <Stack.Screen 
        name="VisitSummary" 
        component={VisitSummaryScreen} 
        options={{ title: 'Visit Summary' }} 
      />
      <Stack.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ title: 'POI Map' }} 
      />
      <Stack.Screen 
        name="POIDetails" 
        component={POIDetailsScreen} 
        options={{ title: 'POI Details' }} 
      />
      <Stack.Screen 
        name="EditVisit" 
        component={EditVisitScreen} 
        options={{ title: 'Review Visit' }} 
      />
      <Stack.Screen 
        name="TaskDetails" 
        component={TaskDetailsScreen} 
        options={{ title: 'Task Details' }} 
      />
      <Stack.Screen 
        name="RepTracking" 
        component={RepTrackingScreen} 
        options={{ title: 'Field Reps Live Map' }} 
      />
    </Stack.Navigator>
  );
}
