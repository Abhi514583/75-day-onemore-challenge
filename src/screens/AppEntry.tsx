import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import LoadingScreen from "../components/LoadingScreen";
import AuthFlowScreen from "./AuthFlowScreen";
import MainApp from "./MainApp";
import useAuth from "../hooks/useAuth";
import { useAppSelector } from "../store/hooks";

type AppState = "loading" | "auth" | "main";

const AppEntry: React.FC = () => {
  const [appState, setAppState] = useState<AppState>("loading");
  const [initTimeout, setInitTimeout] = useState(false);
  const { isAuthenticated, isInitialized } = useAuth();
  const { hasCompletedOnboarding } = useAppSelector((state) => state.user);

  // Add timeout for initialization to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log(
        "⏰ Auth initialization timeout - proceeding with offline mode"
      );
      setInitTimeout(true);
    }, 3000); // 3 second timeout

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    // Wait for auth to initialize OR timeout
    if (!isInitialized && !initTimeout) {
      return;
    }

    console.log("🔍 Determining app state:", {
      isAuthenticated,
      hasCompletedOnboarding,
      isInitialized,
      initTimeout,
    });

    // Determine app state based on auth and onboarding status
    if (isAuthenticated || hasCompletedOnboarding) {
      console.log("📱 Navigating to main app");
      setAppState("main");
    } else {
      console.log("📱 Navigating to auth flow");
      setAppState("auth");
    }
  }, [isAuthenticated, isInitialized, hasCompletedOnboarding, initTimeout]);

  const handleAuthSuccess = () => {
    setAppState("main");
  };

  const handleContinueAnonymous = () => {
    setAppState("main");
  };

  const handleStartSession = (exerciseType: string) => {
    console.log(`🏋️ Starting exercise session: ${exerciseType}`);
    // TODO: Navigate to exercise tracking screen
    // For now, just log the action
  };

  const handleStartAttempt = (exerciseType: string, isPB: boolean) => {
    console.log(`🎯 Starting attempt: ${exerciseType}, isPB: ${isPB}`);
    // TODO: Navigate to exercise tracking screen for PB attempt
    // For now, just log the action
  };

  const renderCurrentState = () => {
    switch (appState) {
      case "loading":
        return <LoadingScreen />;

      case "auth":
        return (
          <AuthFlowScreen
            onAuthSuccess={handleAuthSuccess}
            onContinueAnonymous={handleContinueAnonymous}
          />
        );

      case "main":
        return (
          <MainApp
            onStartSession={handleStartSession}
            onStartAttempt={handleStartAttempt}
          />
        );

      default:
        return <LoadingScreen />;
    }
  };

  return <View style={styles.container}>{renderCurrentState()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AppEntry;
