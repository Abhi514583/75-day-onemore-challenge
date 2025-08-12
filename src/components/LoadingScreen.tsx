import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";

const LoadingScreen: React.FC = () => {
  return (
    <LinearGradient
      colors={COLORS.BACKGROUND.PRIMARY}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.title}>OneMore</Text>
          <Text style={styles.subtitle}>Loading your progress...</Text>
          <ActivityIndicator
            size="large"
            color={COLORS.ACCENT.PRIMARY}
            style={styles.spinner}
          />
        </View>
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
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: COLORS.ACCENT.PRIMARY,
    textAlign: "center",
    textShadowColor: COLORS.EFFECTS.OVERLAY,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 2,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
    marginBottom: 32,
  },
  spinner: {
    marginTop: 20,
  },
});

export default LoadingScreen;
