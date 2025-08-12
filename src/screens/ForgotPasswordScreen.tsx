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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { sendPasswordReset, clearError } from "../store/slices/authSlice";
import useNetworkStatus from "../hooks/useNetworkStatus";

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onBack,
}) => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const { isOnline } = useNetworkStatus();

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSendReset = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!isOnline) {
      Alert.alert(
        "Offline Mode",
        "You need an internet connection to reset your password. Please try again when you're online."
      );
      return;
    }

    try {
      await dispatch(sendPasswordReset(email.trim())).unwrap();
      setEmailSent(true);
    } catch (error) {
      // Error is handled by Redux slice
    }
  };

  React.useEffect(() => {
    // Clear error when component mounts
    dispatch(clearError());
  }, [dispatch]);

  if (emailSent) {
    return (
      <LinearGradient
        colors={COLORS.BACKGROUND.PRIMARY}
        locations={[0, 0.5, 1]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>📧</Text>
              <Text style={styles.successTitle}>Email Sent!</Text>
              <Text style={styles.successMessage}>
                We've sent a password reset link to:
              </Text>
              <Text style={styles.emailText}>{email}</Text>
              <Text style={styles.instructionText}>
                Check your email and follow the instructions to reset your
                password. Don't forget to check your spam folder!
              </Text>
            </View>

            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <LinearGradient
                colors={[COLORS.ACCENT.PRIMARY, COLORS.ACCENT.SECONDARY]}
                style={styles.backButtonGradient}
              >
                <Text style={styles.backButtonText}>Back to Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

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
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButtonSmall} onPress={onBack}>
                <Text style={styles.backButtonSmallText}>← Back</Text>
              </TouchableOpacity>

              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your
                password.
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
                <Text style={styles.inputLabel}>Email Address</Text>
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
                  autoFocus={true}
                />
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              )}
            </View>

            {/* Send Reset Button */}
            <TouchableOpacity
              style={[styles.sendButton, isLoading && styles.buttonDisabled]}
              onPress={handleSendReset}
              disabled={isLoading || !isOnline}
            >
              <LinearGradient
                colors={[COLORS.ACCENT.PRIMARY, COLORS.ACCENT.SECONDARY]}
                style={styles.sendButtonGradient}
              >
                <Text style={styles.sendButtonText}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Help Text */}
            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>
                Remember your password?{" "}
                <Text style={styles.helpLink} onPress={onBack}>
                  Back to Sign In
                </Text>
              </Text>
            </View>
          </View>
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    marginBottom: 40,
  },
  backButtonSmall: {
    alignSelf: "flex-start",
    padding: 10,
    marginBottom: 20,
  },
  backButtonSmallText: {
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
  sendButton: {
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
  sendButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  sendButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: "bold",
  },
  helpContainer: {
    alignItems: "center",
  },
  helpText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    textAlign: "center",
  },
  helpLink: {
    color: COLORS.ACCENT.PRIMARY,
    fontWeight: "600",
  },
  // Success state styles
  successContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  successTitle: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 15,
  },
  successMessage: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
  emailText: {
    color: COLORS.ACCENT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
  },
  instructionText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  backButton: {
    borderRadius: 25,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  backButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default ForgotPasswordScreen;
