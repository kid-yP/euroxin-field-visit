import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';

// Screen Imports
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

// Custom Header Component
const CustomHeader = ({ navigation, route, options }) => {
  const title = options.title || route.name;
  
  return (
    <LinearGradient
      colors={['#38B6FF4D', '#80CC28']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.headerGradient}
    >
      <View style={styles.headerContent}>
        {navigation.canGoBack() ? (
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
    </LinearGradient>
  );
};

// Custom Tab Bar with Updated Labels
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const getTabLabel = (routeName) => {
    const labels = {
      'Knowledge': 'Resources',
      'Stock': 'Stocks'
    };
    return labels[routeName] || routeName;
  };

  return (
    <LinearGradient
      colors={['#38B6FF4D', '#80CC28']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.tabBarGradient}
    >
      <View style={styles.tabBarContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = {
            'Home': isFocused ? 'home' : 'home-outline',
            'Tasks': isFocused ? 'checkbox' : 'checkbox-outline',
            'Stocks': isFocused ? 'cube' : 'cube-outline',
            'Hub': isFocused ? 'book' : 'book-outline',
            'Profile': isFocused ? 'person' : 'person-outline',
          }[route.name];

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabButton}
            >
              <Ionicons 
                name={iconName} 
                size={24} 
                color={isFocused ? '#fff' : 'rgba(255,255,255,0.7)'} 
              />
              <Text style={[
                styles.tabLabel,
                { color: isFocused ? '#fff' : 'rgba(255,255,255,0.7)' }
              ]}>
                {getTabLabel(route.name)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </LinearGradient>
  );
};

function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TaskListScreen} />
      <Tab.Screen name="Stocks" component={StockScreen} />
      <Tab.Screen name="Hub" component={KnowledgeCenterScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        header: ({ navigation, route, options }) => (
          <CustomHeader 
            navigation={navigation}
            route={route}
            options={options}
          />
        ),
        headerStyle: {
          height: 70,
          elevation: 0,
        },
      }}
    >
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      
      <Stack.Screen 
        name="VisitSummary" 
        component={VisitSummaryScreen} 
        options={{ title: 'Visit Summary' }} 
      />
      
      <Stack.Screen 
        name="VisitDetails" 
        component={VisitDetailsScreen} 
        options={{ title: 'New Visit' }} 
      />
      
      <Stack.Screen 
        name="TaskDetails" 
        component={TaskDetailsScreen} 
        options={({ route }) => ({ 
          title: route.params?.mode === 'create' ? 'Create Task' : 'Edit Task',
        })} 
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
        name="RepTracking" 
        component={RepTrackingScreen} 
        options={{ title: 'Rep Tracker' }} 
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  // Header Styles
  headerGradient: {
    width: '100%',
    height: 70,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: 'white',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  headerSpacer: {
    width: 40,
  },

  // Tab Bar Styles
  tabBarGradient: {
    height: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 0,
  },
  tabBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    marginTop: 4,
  },
});
