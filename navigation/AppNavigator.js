// navigation/AppNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

// Screens import
import HomeScreen from '../screens/HomeScreen';
import StockScreen from '../screens/StockScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VisitDetailsScreen from '../screens/VisitDetailsScreen';
import VisitSummaryScreen from '../screens/VisitSummaryScreen';  // <-- import here
import MapScreen from '../screens/MapScreen';
import POIDetailsScreen from '../screens/POIDetailsScreen';
import EditVisitScreen from '../screens/EditVisitScreen';
import TaskListScreen from '../screens/TaskListScreen';
import TaskDetailsScreen from '../screens/TaskDetailsScreen';
import KnowledgeCenterScreen from '../screens/KnowledgeCenterScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = 'home';
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
          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: { fontSize: 12 },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TaskListScreen} />
      <Tab.Screen name="Stock" component={StockScreen} />
      <Tab.Screen name="KnowledgeCenter" component={KnowledgeCenterScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="VisitDetails" component={VisitDetailsScreen} options={{ title: 'Visit' }} />
      <Stack.Screen
        name="VisitSummary"
        component={VisitSummaryScreen}
        options={{ title: 'Visit Summary' }}
      />
      <Stack.Screen name="Map" component={MapScreen} options={{ title: 'POI Map' }} />
      <Stack.Screen name="POIDetails" component={POIDetailsScreen} options={{ title: 'POI Details' }} />
      <Stack.Screen name="EditVisit" component={EditVisitScreen} options={{ title: 'Review Visit' }} />
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} options={{ title: 'Task' }} />
    </Stack.Navigator>
  );
}
