// firebase/config.js
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyA3sFWw7ECwoOOQ7e26qqoyLADF3EDcQpY',
  authDomain: 'euroxin-field-visit.firebaseapp.com',
  projectId: 'euroxin-field-visit',
  storageBucket: 'euroxin-field-visit.appspot.com',
  messagingSenderId: '566513123476',
  appId: '1:566513123476:web:f2a1224efa7af5286ab481'
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize services
export const db = getFirestore(app);
export { auth };

// Collections configuration
export const Collections = {
  KNOWLEDGE_CENTER: 'knowledgeResources ',
  POIS: 'pois',
  REP_LOCATIONS: 'repLocations',
  STOCKLIST: 'stocklist',
  SYSTEM_SETTINGS: 'systemSettings',
  TASKS: 'tasks',
  USERS: 'users',
  VISIT_HISTORY: 'visitHistory',
  VISITS: 'visits',
  LAST_VISIT: 'lastVisit'
};

export const UserRoles = {
  ADMIN: 'admin',
  FIELD_STAFF: 'field-staff',
  MANAGER: 'manager'
};
