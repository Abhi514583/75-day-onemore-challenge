import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { store, persistor } from './src/store';
import { useAppSelector, useAppDispatch } from './src/store/hooks';
import { startChallenge, syncCurrentDay } from './src/store/slices/challengeSlice';
import { completeOnboarding } from './src/store/slices/userSlice';

import WelcomeScreen from './src/screens/WelcomeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';

interface ExerciseBaselines {
  pushups: number;
  squats: number;
  situps: number;
  planks: number;
}

function AppContent() {
  const dispatch = useAppDispatch();
  const { isOnboarded } = useAppSelector((state) => state.user);
  const { isActive, baselines } = useAppSelector((state) => state.challenge);
  
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'onboarding' | 'dashboard'>('welcome');

  useEffect(() => {
    // Determine initial screen based on app state
    if (isOnboarded && isActive) {
      setCurrentScreen('dashboard');
      // Sync current day in case app was closed for multiple days
      dispatch(syncCurrentDay());
    } else if (isOnboarded) {
      setCurrentScreen('welcome');
    } else {
      setCurrentScreen('welcome');
    }
  }, [isOnboarded, isActive, dispatch]);

  const navigateToOnboarding = () => {
    if (isOnboarded) {
      // User has been onboarded before, go straight to dashboard
      setCurrentScreen('dashboard');
    } else {
      // First time user, go to onboarding
      setCurrentScreen('onboarding');
    }
  };

  const navigateToDashboard = (newBaselines: ExerciseBaselines) => {
    // Complete onboarding and start challenge
    dispatch(completeOnboarding({ fitnessLevel: 'beginner' }));
    dispatch(startChallenge(newBaselines));
    setCurrentScreen('dashboard');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {currentScreen === 'welcome' && (
        <WelcomeScreen onStartChallenge={navigateToOnboarding} />
      )}
      {currentScreen === 'onboarding' && (
        <OnboardingScreen onComplete={navigateToDashboard} />
      )}
      {currentScreen === 'dashboard' && (
        <DashboardScreen baselines={baselines} />
      )}
    </View>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
