import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const dotAnimation = new Animated.Value(0);

  // Animation for loading dots
  useEffect(() => {
    if (currentScreen === 0) {
      const animateDots = () => {
        Animated.sequence([
          Animated.timing(dotAnimation, {
            toValue: 1,
            duration: 500,
            easing: Easing.linear,
            useNativeDriver: true
          }),
          Animated.timing(dotAnimation, {
            toValue: 0,
            duration: 500,
            easing: Easing.linear,
            useNativeDriver: true
          })
        ]).start(animateDots);
      };
      animateDots();

      const timer = setTimeout(() => setCurrentScreen(1), 2000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const createUserDocument = async (user) => {
    try {
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.email.split('@')[0],
        role: 'field-staff',
        createdAt: new Date(),
        lastLogin: new Date(),
        status: 'active'
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('User document created successfully');
    } catch (error) {
      console.error('Error creating user document:', error);
      throw error;
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both email and password');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return;
    }

    if (isSignUp && password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserDocument(userCredential.user);
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => setIsSignUp(false) }
        ]);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          lastLogin: new Date()
        }, { merge: true });
      }
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (error) => {
    let errorMessage = 'Authentication failed. Please try again.';
    let suggestSignUp = false;
    
    switch(error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'This email is already registered. Please log in.';
        suggestSignUp = true;
        break;
      case 'auth/invalid-email':
        errorMessage = 'Please enter a valid email address';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password should be at least 6 characters';
        break;
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        errorMessage = 'Invalid email or password';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many attempts. Please try again later.';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email. Would you like to sign up instead?';
        suggestSignUp = true;
        break;
      default:
        errorMessage = error.message;
    }
    
    const buttons = [{ text: 'OK' }];
    if (suggestSignUp && !isSignUp) {
      buttons.push({
        text: 'Sign Up',
        onPress: () => setIsSignUp(true)
      });
    }
    
    Alert.alert(isSignUp ? 'Sign Up Error' : 'Login Error', errorMessage, buttons);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email to proceed');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Reset Email Sent', 
        `Password reset link sent to ${email}. Please check your inbox.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setEmail('');
              setPassword('');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setResetLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setPassword('');
    setConfirmPassword('');
  };

  const renderLoadingScreen = () => (
    <View style={[styles.container, styles.loadingContainer]}>
      <Image 
        source={require('../assets/LOGO.png')}
        style={styles.loadingLogo}
      />
      <View style={styles.dotsContainer}>
        <Animated.View style={[
          styles.dot,
          { opacity: dotAnimation.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.3, 1, 0.3]
            }) 
          }
        ]} />
        <Animated.View style={[
          styles.dot,
          { opacity: dotAnimation.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 0.3, 0.3]
            }) 
          }
        ]} />
        <Animated.View style={[
          styles.dot,
          { opacity: dotAnimation.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.3, 0.3, 1]
            }) 
          }
        ]} />
      </View>
      <Text style={styles.poweredBy}>Powered by Euroxin</Text>
    </View>
  );

  const renderWelcomeScreen = () => (
    <View style={[styles.container, styles.welcomeContainer]}>
      <Image 
        source={require('../assets/LOGO.png')}
        style={styles.welcomeLogo}
      />
      
      <View style={styles.centralElement}>
        <Text style={styles.centralText}>Welcome to EUROXIN</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.welcomeContinueButton}
        onPress={() => setCurrentScreen(2)}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
      
      <View style={styles.simpleLanguageSelector}>
        <Ionicons name="language-outline" size={20} color="#007bff" />
        <Text style={styles.languageText}>Language: English</Text>
      </View>
    </View>
  );

  const renderAuthScreen = () => (
    <View style={[styles.container, styles.loginContainer]}>
      <Image 
        source={require('../assets/LOGO.png')}
        style={styles.loginScreenLogo}
      />
      
      <View style={styles.loginTitleContainer}>
        <Text style={styles.loginTitle}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
      </View>
      
      <View style={styles.welcomeBackContainer}>
        <Text style={styles.welcomeBackText}>
          {isSignUp ? 'Create a new account to get started' : 'Welcome back! Let\'s reconnect.'}
        </Text>
      </View>
      
      <View style={[styles.inputContainer, { top: 230 }]}>
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
      </View>

      <View style={[styles.inputContainer, { top: 290 }]}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <Ionicons 
          name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
          size={20} 
          color="#999"
          style={styles.inputIcon}
          onPress={() => setShowPassword(!showPassword)}
        />
      </View>

      {isSignUp && (
        <View style={[styles.inputContainer, { top: 350 }]}>
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <Ionicons 
            name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
            size={20} 
            color="#999"
            style={styles.inputIcon}
            onPress={() => setShowPassword(!showPassword)}
          />
        </View>
      )}

      {!isSignUp && (
        <View style={styles.forgotPasswordContainer}>
          <TouchableOpacity
            onPress={handleForgotPassword}
            disabled={resetLoading || loading}
          >
            {resetLoading ? (
              <ActivityIndicator size="small" color="#FF0000" />
            ) : (
              <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity 
        style={styles.loginScreenButton}
        onPress={handleAuth}
        disabled={loading || resetLoading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.buttonContent}>
            <Ionicons 
              name={isSignUp ? 'person-add' : 'log-in'} 
              size={22} 
              color="#fff" 
              style={styles.buttonIcon} 
            />
            <Text style={styles.loginButtonText}>
              {isSignUp ? 'Sign Up' : 'Log In'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.toggleAuthButton}
        onPress={toggleAuthMode}
        disabled={loading}
      >
        <Text style={styles.toggleAuthText}>
          {isSignUp ? 'Already have an account? Log In' : 'Don\'t have an account? Sign Up'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      {currentScreen === 0 && renderLoadingScreen()}
      {currentScreen === 1 && renderWelcomeScreen()}
      {currentScreen === 2 && renderAuthScreen()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9FFFA',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 329 * 2,
    height: 128 * 2.5,
    resizeMode: 'contain',
    position: 'absolute',
    top: height * 0.15,
    alignSelf: 'center',
    left: (width - 329 * 2) / 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    position: 'absolute',
    top: height * 0.6,
    alignSelf: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007bff',
    marginHorizontal: 5,
  },
  poweredBy: {
    color: '#666',
    fontSize: 14,
    position: 'absolute',
    bottom: 30,
  },
  welcomeContainer: {
    position: 'relative',
  },
  welcomeLogo: {
    width: 329 * 2,
    height: 128 * 2.5,
    resizeMode: 'contain',
    position: 'absolute',
    marginTop: -90,
    left: (Dimensions.get('window').width - 329 * 2) / 2,
  },
  centralElement: {
    minWidth: width * 0.6,
    maxWidth: width * 0.9,
    height: 'auto',
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  centralText: {
    fontFamily: 'Poppins-Regular',
    fontWeight: '400',
    fontSize: 21,
    lineHeight: 30,
    letterSpacing: 0,
    color: 'rgba(65, 65, 65, 1)',
    textAlign: 'center',
    paddingHorizontal: 15,
  },
  welcomeContinueButton: {
    backgroundColor: '#007bff',
    width: width * 0.8,
    height: 60,
    position: 'absolute',
    top: height * 0.75,
    alignSelf: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  simpleLanguageSelector: {
    width: width * 0.45,
    height: 30,
    position: 'absolute',
    top: height * 0.90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageText: {
    color: '#007bff',
    fontSize: 12,
    marginLeft: 8,
  },
  loginContainer: {
    position: 'relative',
  },
  loginScreenLogo: {
    width: 329 * 2,
    height: 128 * 2.5,
    resizeMode: 'contain',
    position: 'absolute',
    marginTop: -90,
    left: (Dimensions.get('window').width - 329 * 2) / 2,
  },
  loginTitleContainer: {
    width: width * 0.4,
    height: 50,
    position: 'absolute',
    top: 130,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginTitle: {
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    fontSize: 23,
    lineHeight: 30,
    letterSpacing: 0,
    color: '#333',
    textAlign: 'center',
    includeFontPadding: true,
    textAlignVertical: 'center',
  },
  welcomeBackContainer: {
    width: '80%',
    height: 40,
    position: 'absolute',
    top: 175,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  welcomeBackText: {
    fontFamily: 'Poppins-Regular',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 24,
    color: '#666',
    textAlign: 'center',
    includeFontPadding: true,
  },
  inputContainer: {
    width: '90%',
    height: 50,
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#333',
  },
  inputIcon: {
    marginLeft: 10,
  },
  forgotPasswordContainer: {
    width: width * 0.8,
    height: 50,
    position: 'absolute',
    top: 350,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 30,
    color: '#FF0000',
    textAlign: 'center',
  },
  loginScreenButton: {
    backgroundColor: '#007bff',
    width: width * 0.9,
    height: 60,
    position: 'absolute',
    top: height * 0.77,
    alignSelf: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleAuthButton: {
    position: 'absolute',
    top: height * 0.9,
    alignSelf: 'center',
  },
  toggleAuthText: {
    color: '#007bff',
    fontWeight: '500',
    fontSize: 14,
  },
});
