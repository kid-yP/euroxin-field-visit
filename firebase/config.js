import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA3sFWw7ECwoOOQ7e26qqoyLADF3EDcQpY',
  authDomain: 'euroxin-field-visit.firebaseapp.com',
  projectId: 'euroxin-field-visit',
  storageBucket: 'euroxin-field-visit.firebasestorage.app',
  messagingSenderId: '566513123476',
  appId: '1:566513123476:web:f2a1224efa7af5286ab481'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);