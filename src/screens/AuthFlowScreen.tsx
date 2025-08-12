import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import SignInScreen from "./SignInScreen";
import SignUpScreen from "./SignUpScreen";
import ForgotPasswordScreen from "./ForgotPasswordScreen";
import { useAppSelector } from "../store/hooks";
import useAuth from "../hooks/useAuth";

type AuthFlowState = "signin" | "signup" | "forgot-password";

interface AuthFlowScreenProps {
  onAuthSuccess: () => void;
  onContinueAnonymous: () => void;
}

const AuthFlowScreen: React.FC<AuthFlowScreenProps> = ({
  onAuthSuccess,
  onContinueAnonymous,
}) => {
  const [currentFlow, setCurrentFlow] = useState<AuthFlowState>("signin");
  const { isAuthenticated } = useAuth();

  // Navigate to main app when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      onAuthSuccess();
    }
  }, [isAuthenticated, onAuthSuccess]);

  const renderCurrentFlow = () => {
    switch (currentFlow) {
      case "signin":
        return (
          <SignInScreen
            onSignUp={() => setCurrentFlow("signup")}
            onContinueAnonymous={onContinueAnonymous}
            onForgotPassword={() => setCurrentFlow("forgot-password")}
          />
        );

      case "signup":
        return (
          <SignUpScreen
            onSignIn={() => setCurrentFlow("signin")}
            onContinueAnonymous={onContinueAnonymous}
            onBack={() => setCurrentFlow("signin")}
          />
        );

      case "forgot-password":
        return <ForgotPasswordScreen onBack={() => setCurrentFlow("signin")} />;

      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderCurrentFlow()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AuthFlowScreen;
