import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { NavigationContainer } from '@react-navigation/native';
import { auth } from './firebase/config';
import AppNavigator from './navigation/AppNavigator';
import LoginScreen from './screens/LoginScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) return null;

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <LoginScreen />}
    </NavigationContainer>
  );
}
