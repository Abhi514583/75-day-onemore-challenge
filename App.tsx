import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import WelcomeScreen from './src/screens/WelcomeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';

interface ExerciseBaselines {
  pushups: number;
  squats: number;
  situps: number;
  planks: number;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'onboarding' | 'dashboard'>('welcome');
  const [baselines, setBaselines] = useState<ExerciseBaselines>({
    pushups: 10,
    squats: 15,
    situps: 10,
    planks: 30,
  });

  const navigateToOnboarding = () => {
    setCurrentScreen('onboarding');
  };

  const navigateToDashboard = (newBaselines: ExerciseBaselines) => {
    setBaselines(newBaselines);
    setCurrentScreen('dashboard');
  };

  return (
    <>
      {currentScreen === 'welcome' && (
        <WelcomeScreen onStartChallenge={navigateToOnboarding} />
      )}
      {currentScreen === 'onboarding' && (
        <OnboardingScreen onComplete={navigateToDashboard} />
      )}
      {currentScreen === 'dashboard' && (
        <DashboardScreen baselines={baselines} />
      )}
      <StatusBar style="auto" />
    </>
  );
}
