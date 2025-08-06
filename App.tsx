import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { store, persistor } from './src/store';
import { useAppSelector, useAppDispatch } from './src/store/hooks';
import { startChallenge, syncCurrentDay, resetChallenge } from './src/store/slices/challengeSlice';
import { completeOnboarding, resetUserData } from './src/store/slices/userSlice';

import WelcomeScreen from './src/screens/WelcomeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ExerciseTrackingScreen from './src/screens/ExerciseTrackingScreen';

interface ExerciseBaselines {
  pushups: number;
  squats: number;
  situps: number;
  planks: number;
}

function AppContent() {
  const dispatch = useAppDispatch();
  const { isOnboarded } = useAppSelector((state) => state.user || { isOnboarded: false });
  const { isActive, baselines } = useAppSelector((state) => state.challenge || { isActive: false, baselines: { pushups: 10, squats: 15, situps: 10, planks: 30 } });
  
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'onboarding' | 'dashboard' | 'exercise'>('welcome');
  const [currentExercise, setCurrentExercise] = useState<{
    type: 'pushups' | 'squats' | 'situps' | 'planks';
    target: number;
  } | null>(null);

  useEffect(() => {
    // RESET FOR TESTING - Remove this in production
    dispatch(resetUserData());
    dispatch(resetChallenge());
    
    // For testing - always start from welcome screen
    setCurrentScreen('welcome');
    
    // Production logic (commented out for testing):
    // if (isOnboarded && isActive) {
    //   setCurrentScreen('dashboard');
    //   dispatch(syncCurrentDay());
    // } else if (isOnboarded) {
    //   setCurrentScreen('welcome');
    // } else {
    //   setCurrentScreen('welcome');
    // }
  }, [dispatch]);

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

  const navigateToExercise = (exerciseType: 'pushups' | 'squats' | 'situps' | 'planks', target: number) => {
    setCurrentExercise({ type: exerciseType, target });
    setCurrentScreen('exercise');
  };

  const navigateBackToDashboard = () => {
    setCurrentScreen('dashboard');
    setCurrentExercise(null);
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
        <DashboardScreen baselines={baselines} onStartExercise={navigateToExercise} />
      )}
      {currentScreen === 'exercise' && currentExercise && (
        <ExerciseTrackingScreen
          exerciseType={currentExercise.type}
          targetCount={currentExercise.target}
          onComplete={navigateBackToDashboard}
          onBack={navigateBackToDashboard}
        />
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
