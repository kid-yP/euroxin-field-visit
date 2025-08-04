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
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../firebase/config';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const user = auth.currentUser;
  const [userData, setUserData] = useState({
    name: '',
    role: '',
    avatarUrl: '',
    email: '',
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        
        // Extract data with multiple fallback options
        const userData = {
          name: data.name || user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
          role: data.role || 'Member',
          avatarUrl: data.avatarUrl || user.photoURL || 'https://placehold.co/100x100?text=Avatar',
          email: data.email || user.email || '',
        };
        
        setUserData(userData);
        setNotificationsEnabled(data.notificationsEnabled || false);
        setLanguage(data.language || 'en');
        
      } else {
        // Create new document with comprehensive defaults
        const initialUserData = {
          name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
          email: user.email || '',
          role: 'Member',
          avatarUrl: user.photoURL || 'https://placehold.co/100x100?text=Avatar',
          notificationsEnabled: false,
          language: 'en',
          createdAt: new Date(),
        };
        
        await setDoc(userRef, initialUserData);
        setUserData(initialUserData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    const saveLanguage = async () => {
      if (user && language) {
        try {
          const docRef = doc(db, 'users', user.uid);
          await updateDoc(docRef, { language });
        } catch (error) {
          console.error('Error saving language:', error);
        }
      }
    };
    saveLanguage();
  }, [language, user]);

  const toggleNotifications = async () => {
    try {
      const newValue = !notificationsEnabled;
      setNotificationsEnabled(newValue);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        await updateDoc(docRef, { notificationsEnabled: newValue });
      }
    } catch (error) {
      console.error('Error updating notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings.');
      setNotificationsEnabled(!notificationsEnabled);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.replace('LoginScreen');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out.');
    }
  };

  const pickImage = async () => {
    try {
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

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        await uploadImage(pickerResult.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image.');
    }
  };

  const uploadImage = async (uri) => {
    if (!user || !user.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `profile_pictures/${user.uid}`);
      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);
      
      setUserData(prev => ({ 
        ...prev, 
        avatarUrl: downloadURL 
      }));

      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { 
        avatarUrl: downloadURL,
        updatedAt: new Date() 
      });

      await auth.currentUser.updateProfile({
        photoURL: downloadURL
      });
      
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
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
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={() => navigation.replace('LoginScreen')}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={['#38B6FF4D', '#80CC28']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
              <View style={styles.avatarWrapper}>
                <Image
                  source={{
                    uri: userData.avatarUrl,
                  }}
                  style={styles.avatar}
                />
                <View style={styles.editIconWrapper}>
                  <Feather name="edit-2" size={16} color="white" />
                </View>
              </View>
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{userData.name}</Text>
              <Text style={styles.role}>{userData.role}</Text>
              <Text style={styles.email}>{userData.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Feather name="bell" size={20} color="#6B778C" />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch 
              value={notificationsEnabled} 
              onValueChange={toggleNotifications}
              trackColor={{ false: "#E0E0E0", true: "#007bff" }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Feather name="globe" size={20} color="#6B778C" />
              <Text style={styles.settingLabel}>Language</Text>
            </View>
            <View style={styles.languagePickerWrapper}>
              <Text style={styles.currentLanguage}>
                {language === 'en' ? 'English' : 
                 language === 'am' ? 'Amharic' : 
                 language === 'fr' ? 'French' : 
                 language === 'ar' ? 'Arabic' : 'Deutsch'}
              </Text>
              <Picker
                selectedValue={language}
                onValueChange={(itemValue) => setLanguage(itemValue)}
                style={styles.languagePicker}
                dropdownIconColor="#007bff"
              >
                <Picker.Item label="English" value="en" />
                <Picker.Item label="Amharic" value="am" />
                <Picker.Item label="French" value="fr" />
                <Picker.Item label="Arabic" value="ar" />
                <Picker.Item label="Deutsch" value="de" />
              </Picker>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Feather name="info" size={20} color="#6B778C" />
              <Text style={styles.settingLabel}>App Version</Text>
            </View>
            <Text style={styles.versionText}>1.0.0</Text>
          </View>
        </View>

        <View style={styles.logoutButtonContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="white" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#E9FFFA',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F9FF',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noUserContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F9FF',
  },
  noUserText: {
    fontSize: 18,
    color: '#6B778C',
    fontFamily: 'Poppins-Regular',
    marginBottom: 20,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#38B6FF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
  },
  loginButtonText: {
    color: 'white',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  header: {
    height: 70,
    justifyContent: 'center',
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: 'white',
    left: 6,
    letterSpacing: 0.6,
  },
  scrollContainer: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 120,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  editIconWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007bff',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#172B4D',
    marginBottom: 4,
  },
  role: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#007bff',
    marginBottom: 4,
  },
  email: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
    marginBottom: 4,
  },
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#172B4D',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#172B4D',
    marginLeft: 12,
  },
  languagePickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLanguage: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#007bff',
    marginRight: 8,
  },
  languagePicker: {
    width: 0,
    height: 0,
    opacity: 0,
  },
  versionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
  },
  logoutButtonContainer: {
    width: width - 32,
    marginHorizontal: 13,
    position: 'absolute',
    bottom: 70,
  },
  logoutButton: {
    width: 290,
    height: 45,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    left: 3,
    top: -6,
  },
  logoutText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
  },
});
