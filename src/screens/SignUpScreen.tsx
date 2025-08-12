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
import { createAccount, clearError } from "../store/slices/authSlice";
import useNetworkStatus from "../hooks/useNetworkStatus";

interface SignUpScreenProps {
  onSignIn: () => void;
  onContinueAnonymous: () => void;
  onBack: () => void;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onSignIn,
  onContinueAnonymous,
  onBack,
}) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const { isOnline } = useNetworkStatus();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.username.trim()) {
      return "Please enter a username";
    }
    if (formData.username.trim().length < 3) {
      return "Username must be at least 3 characters";
    }
    if (!formData.email.trim()) {
      return "Please enter an email address";
    }
    if (!formData.email.includes("@")) {
      return "Please enter a valid email address";
    }
    if (!formData.password) {
      return "Please enter a password";
    }
    if (formData.password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const handleSignUp = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert("Invalid Input", validationError);
      return;
    }

    if (!isOnline) {
      Alert.alert(
        "Offline Mode",
        "You need an internet connection to create an account. Would you like to continue without an account?",
        [
          { text: "Try Again", style: "cancel" },
          { text: "Continue Offline", onPress: onContinueAnonymous },
        ]
      );
      return;
    }

    try {
      await dispatch(
        createAccount({
          email: formData.email.trim(),
          password: formData.password,
          username: formData.username.trim(),
        })
      ).unwrap();
    } catch (error) {
      // Error is handled by Redux slice
    }
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
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>

              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join the OneMore community and track your fitness journey
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
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={formData.username}
                  onChangeText={(value) => updateFormData("username", value)}
                  placeholder="Choose a username"
                  placeholderTextColor={COLORS.TEXT.TERTIARY}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  maxLength={20}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(value) => updateFormData("email", value)}
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
                    value={formData.password}
                    onChangeText={(value) => updateFormData("password", value)}
                    placeholder="Create a password"
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

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={formData.confirmPassword}
                    onChangeText={(value) =>
                      updateFormData("confirmPassword", value)
                    }
                    placeholder="Confirm your password"
                    placeholderTextColor={COLORS.TEXT.TERTIARY}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Text style={styles.eyeText}>
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>
                  Password Requirements:
                </Text>
                <Text
                  style={[
                    styles.requirement,
                    formData.password.length >= 6 && styles.requirementMet,
                  ]}
                >
                  • At least 6 characters
                </Text>
                <Text
                  style={[
                    styles.requirement,
                    formData.password === formData.confirmPassword &&
                      formData.password.length > 0 &&
                      styles.requirementMet,
                  ]}
                >
                  • Passwords match
                </Text>
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[styles.signUpButton, isLoading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={isLoading || !isOnline}
            >
              <LinearGradient
                colors={[COLORS.ACCENT.PRIMARY, COLORS.ACCENT.SECONDARY]}
                style={styles.signUpButtonGradient}
              >
                <Text style={styles.signUpButtonText}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

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

              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <TouchableOpacity onPress={onSignIn} disabled={isLoading}>
                  <Text style={styles.signInLink}>Sign In</Text>
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
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    alignSelf: "flex-start",
    padding: 10,
    marginBottom: 20,
  },
  backButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
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
    alignSelf: "center",
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
  requirementsContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: COLORS.UI.CARD_BACKGROUND,
    borderRadius: 8,
  },
  requirementsTitle: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  requirement: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 13,
    marginBottom: 4,
  },
  requirementMet: {
    color: COLORS.STATUS.COMPLETED,
  },
  signUpButton: {
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
  signUpButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  signUpButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: "bold",
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
  signInContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  signInText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
  },
  signInLink: {
    color: COLORS.ACCENT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SignUpScreen;
