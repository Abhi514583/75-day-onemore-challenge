import React, { useState, useEffect } from "react";
import { View, StyleSheet, AppState, AppStateStatus } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { SafeAreaProviderWrapper } from "./src/components/SafeAreaWrapper";

import { store, persistor } from "./src/store";
import { useAppSelector, useAppDispatch } from "./src/store/hooks";
import {
  startChallenge,
  syncCurrentDay,
  autoSyncCurrentDay,
  resetChallenge,
} from "./src/store/slices/challengeSlice";
import {
  completeOnboarding,
  resetUserData,
} from "./src/store/slices/userSlice";

import WelcomeScreen from "./src/screens/WelcomeScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import MainApp from "./src/screens/MainApp";
import ExerciseTrackingScreen from "./src/screens/ExerciseTrackingScreen";
import LoadingScreen from "./src/components/LoadingScreen";
import AppEntry from "./src/screens/AppEntry";

// Import debug utils in development
if (__DEV__) {
  require("./src/utils/debug");
}

interface ExerciseBaselines {
  pushups: number;
  squats: number;
  situps: number;
  planks: number;
}

function AppContent() {
  const dispatch = useAppDispatch();
  const { isOnboarded } = useAppSelector(
    (state) => state.user || { isOnboarded: false }
  );
  const { isActive, baselines, currentDay, dailyProgress } = useAppSelector(
    (state) =>
      state.challenge || {
        isActive: false,
        baselines: { pushups: 10, squats: 15, situps: 10, planks: 30 },
        currentDay: 1,
        dailyProgress: {},
      }
  );

  const [currentScreen, setCurrentScreen] = useState<
    "welcome" | "onboarding" | "main" | "exercise"
  >("welcome");
  const [currentExercise, setCurrentExercise] = useState<{
    type: "pushups" | "squats" | "situps" | "planks";
    target: number;
  } | null>(null);

  useEffect(() => {
    // Determine initial screen based on persisted state
    console.log("🔍 Determining initial screen...");
    console.log("User onboarded:", isOnboarded);
    console.log("Challenge active:", isActive);

    if (isOnboarded && isActive) {
      // User has completed onboarding and has an active challenge
      console.log("📱 Navigating to main app (returning user)");
      setCurrentScreen("main");
      dispatch(syncCurrentDay()); // Sync the current day in case time has passed
    } else if (isOnboarded) {
      // User has been onboarded but no active challenge
      console.log(
        "📱 Navigating to welcome (onboarded user, no active challenge)"
      );
      setCurrentScreen("welcome");
    } else {
      // First time user
      console.log("📱 Navigating to welcome (new user)");
      setCurrentScreen("welcome");
    }
  }, [dispatch, isOnboarded, isActive]);

  // Handle app state changes for timezone/DST sync
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`📱 App state changed to: ${nextAppState}`);

      if (nextAppState === "active") {
        // App became active - sync current day to handle timezone changes, DST, etc.
        console.log("🔄 App became active, auto-syncing current day...");
        dispatch(autoSyncCurrentDay());
      }
    };

    // Add app state change listener
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Initial sync when component mounts
    if (isActive) {
      dispatch(autoSyncCurrentDay());
    }

    // Cleanup
    return () => {
      subscription?.remove();
    };
  }, [dispatch, isActive]);

  const navigateToOnboarding = () => {
    if (isOnboarded) {
      // User has been onboarded before, go straight to main app
      setCurrentScreen("main");
    } else {
      // First time user, go to onboarding
      setCurrentScreen("onboarding");
    }
  };

  const navigateToMain = (newBaselines: ExerciseBaselines) => {
    // Complete onboarding and start challenge
    dispatch(completeOnboarding({ fitnessLevel: "beginner" }));
    dispatch(startChallenge(newBaselines));
    setCurrentScreen("main");
  };

  const navigateToExercise = (exerciseType: string) => {
    // Find the target for this exercise type
    const today = new Date().toISOString().split("T")[0];
    const todayProgress = dailyProgress[today];
    let target = 0;

    switch (exerciseType) {
      case "pushups":
        target = baselines.pushups + (currentDay - 1);
        break;
      case "squats":
        target = baselines.squats + (currentDay - 1);
        break;
      case "situps":
        target = baselines.situps + (currentDay - 1);
        break;
      case "planks":
        target = baselines.planks + (currentDay - 1) * 5;
        break;
    }

    setCurrentExercise({
      type: exerciseType as "pushups" | "squats" | "situps" | "planks",
      target,
    });
    setCurrentScreen("exercise");
  };

  const navigateToPersonalBestAttempt = (
    exerciseType: string,
    isPB: boolean
  ) => {
    // For PB attempts, we don't use daily targets
    setCurrentExercise({
      type: exerciseType as "pushups" | "squats" | "situps" | "planks",
      target: 0, // PB attempts are open-ended
    });
    setCurrentScreen("exercise");
  };

  const navigateBackToMain = () => {
    setCurrentScreen("main");
    setCurrentExercise(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {currentScreen === "welcome" && (
        <WelcomeScreen onStartChallenge={navigateToOnboarding} />
      )}
      {currentScreen === "onboarding" && (
        <OnboardingScreen onComplete={navigateToMain} />
      )}
      {currentScreen === "main" && (
        <MainApp
          onStartSession={navigateToExercise}
          onStartAttempt={navigateToPersonalBestAttempt}
        />
      )}
      {currentScreen === "exercise" && currentExercise && (
        <ExerciseTrackingScreen
          exerciseType={currentExercise.type}
          targetCount={currentExercise.target}
          onComplete={navigateBackToMain}
          onBack={navigateBackToMain}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProviderWrapper>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <AppEntry />
        </PersistGate>
      </Provider>
    </SafeAreaProviderWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
