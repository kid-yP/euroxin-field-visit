import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Feather } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const user = auth.currentUser;
  const [userData, setUserData] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setNotificationsEnabled(data.notificationsEnabled || false);
        setLanguage(data.language || 'en');
      } else {
        setUserData({
          name: 'No name set',
          role: 'No role set',
          phone: 'Not set',
          photoURL: null,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, []);

  useEffect(() => {
    const saveLanguage = async () => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        await updateDoc(docRef, { language });
      }
    };
    saveLanguage();
  }, [language]);

  const toggleNotifications = async () => {
    try {
      const newValue = !notificationsEnabled;
      setNotificationsEnabled(newValue);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        await updateDoc(docRef, { notificationsEnabled: newValue });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification settings.');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error', 'Failed to log out.');
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Permission to access media library is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!pickerResult.canceled) {
      uploadImage(pickerResult.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    try {
      setLoading(true);
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `profile_pictures/${user.uid}.jpg`);
      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);
      setUserData((prev) => ({ ...prev, photoURL: downloadURL }));

      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { photoURL: downloadURL });
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>No user is currently logged in.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.header}>Account</Text>

      <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.7}>
        <View style={styles.avatarWrapper}>
          <Image
            source={{
              uri: userData?.photoURL || 'https://placehold.co/100x100?text=Avatar',
            }}
            style={styles.avatar}
          />
          <View style={styles.editIconWrapper}>
            <Feather name="edit-2" size={22} color="#007bff" />
          </View>
        </View>
      </TouchableOpacity>

      <Text style={styles.name}>{userData?.name || 'Name not set'}</Text>
      <Text style={styles.role}>{userData?.role || 'Role not set'}</Text>
      <Text style={styles.id}>ID: {user.uid}</Text>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.info}>{user.email}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.info}>{userData?.phone || 'Not set'}</Text>
      </View>

      <View style={styles.settingsRow}>
        <Text style={styles.label}>Notifications</Text>
        <Switch value={notificationsEnabled} onValueChange={toggleNotifications} />
      </View>

      {/* Language Picker */}
      <View style={{ marginTop: 16 }}>
        <Text style={styles.label}>Language</Text>
        <View style={styles.languagePickerWrapper}>
          <Picker
            selectedValue={language}
            onValueChange={(itemValue) => setLanguage(itemValue)}
            style={styles.languagePicker}
            dropdownIconColor="#000"
          >
            <Picker.Item label="English" value="en" />
            <Picker.Item label="Amharic" value="am" />
            <Picker.Item label="French" value="fr" />
            <Picker.Item label="Arabic" value="ar" />
            <Picker.Item label="Deutsch" value="de" />
          </Picker>
        </View>
      </View>

      <Text style={styles.version}>Version 1.0.0</Text>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#ccc',
  },
  editIconWrapper: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  role: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
    marginBottom: 4,
  },
  id: {
    fontSize: 14,
    color: 'gray',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#f0f0f0',
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
  },
  info: {
    fontSize: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  languagePickerWrapper: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  languagePicker: {
    height: 44,
    flex: 1,
  },
  version: {
    textAlign: 'center',
    color: 'gray',
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
