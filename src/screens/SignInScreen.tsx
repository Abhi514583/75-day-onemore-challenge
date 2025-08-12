import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { signInWithEmail, clearError } from "../store/slices/authSlice";
import useNetworkStatus from "../hooks/useNetworkStatus";

interface SignInScreenProps {
  onSignUp: () => void;
  onContinueAnonymous: () => void;
  onForgotPassword: () => void;
}

const SignInScreen: React.FC<SignInScreenProps> = ({
  onSignUp,
  onContinueAnonymous,
  onForgotPassword,
}) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const { isOnline } = useNetworkStatus();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter both email and password."
      );
      return;
    }

    if (!isOnline) {
      Alert.alert(
        "Offline Mode",
        "You need an internet connection to sign in. Would you like to continue without an account?",
        [
          { text: "Try Again", style: "cancel" },
          { text: "Continue Offline", onPress: onContinueAnonymous },
        ]
      );
      return;
    }

    try {
      await dispatch(
        signInWithEmail({ email: email.trim(), password })
      ).unwrap();
    } catch (error) {
      // Error is handled by Redux slice
    }
  };

  const handleGoogleSignIn = () => {
    Alert.alert(
      "Coming Soon",
      "Google Sign-In will be available in a future update.",
      [{ text: "OK" }]
    );
  };

  const handleAppleSignIn = () => {
    Alert.alert(
      "Coming Soon",
      "Apple Sign-In will be available in a future update.",
      [{ text: "OK" }]
    );
  };

  React.useEffect(() => {
    // Clear error when component mounts
    dispatch(clearError());
  }, [dispatch]);

  return (
    <LinearGradient
      colors={COLORS.BACKGROUND.PRIMARY}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to sync your progress across devices
              </Text>

              {!isOnline && (
                <View style={styles.offlineIndicator}>
                  <Text style={styles.offlineText}>📶 Offline Mode</Text>
                </View>
              )}
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.TEXT.TERTIARY}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={COLORS.TEXT.TERTIARY}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeText}>
                      {showPassword ? "🙈" : "👁️"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={onForgotPassword}
                disabled={isLoading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, isLoading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={isLoading || !isOnline}
            >
              <LinearGradient
                colors={[COLORS.ACCENT.PRIMARY, COLORS.ACCENT.SECONDARY]}
                style={styles.signInButtonGradient}
              >
                <Text style={styles.signInButtonText}>
                  {isLoading ? "Signing In..." : "Sign In"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Social Sign In */}
            {isOnline && (
              <View style={styles.socialContainer}>
                <Text style={styles.orText}>or continue with</Text>

                <View style={styles.socialButtons}>
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <Text style={styles.socialButtonText}>🔍 Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={handleAppleSignIn}
                    disabled={isLoading}
                  >
                    <Text style={styles.socialButtonText}>🍎 Apple</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.anonymousButton}
                onPress={onContinueAnonymous}
                disabled={isLoading}
              >
                <Text style={styles.anonymousButtonText}>
                  Continue Without Account
                </Text>
              </TouchableOpacity>

              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account? </Text>
                <TouchableOpacity onPress={onSignUp} disabled={isLoading}>
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  offlineIndicator: {
    backgroundColor: COLORS.ACCENT.WARNING,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 15,
  },
  offlineText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.UI.INPUT_BACKGROUND,
    borderColor: COLORS.UI.INPUT_BORDER,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.TEXT.PRIMARY,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: "absolute",
    right: 15,
    top: 16,
    padding: 5,
  },
  eyeText: {
    fontSize: 18,
  },
  errorContainer: {
    backgroundColor: "rgba(220, 53, 69, 0.1)",
    borderColor: COLORS.ACCENT.ERROR,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  errorText: {
    color: COLORS.ACCENT.ERROR,
    fontSize: 14,
    textAlign: "center",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 10,
  },
  forgotPasswordText: {
    color: COLORS.ACCENT.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  signInButton: {
    borderRadius: 25,
    overflow: "hidden",
    marginBottom: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  signInButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: "bold",
  },
  socialContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  orText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 14,
    marginBottom: 20,
  },
  socialButtons: {
    flexDirection: "row",
    gap: 15,
  },
  socialButton: {
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    borderColor: COLORS.UI.BUTTON_BORDER,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 120,
    alignItems: "center",
  },
  socialButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  bottomActions: {
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 20,
  },
  anonymousButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  anonymousButtonText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    textDecorationLine: "underline",
  },
  signUpContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  signUpText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
  },
  signUpLink: {
    color: COLORS.ACCENT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SignInScreen;
