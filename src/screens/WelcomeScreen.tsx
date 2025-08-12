import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";

const { width } = Dimensions.get("window");

interface WelcomeScreenProps {
  onStartChallenge?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartChallenge }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleStartChallenge = () => {
    console.log("Starting OneMore Challenge!");
    if (onStartChallenge) {
      onStartChallenge();
    }
  };

  return (
    <LinearGradient
      colors={COLORS.BACKGROUND.PRIMARY}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header Section */}
            <View style={styles.header}>
              <Text style={styles.titleAccent}>OneMore</Text>
              <Text style={styles.title}>Challenge</Text>
              <Text style={styles.subtitle}>
                Transform your fitness with progressive daily challenges
              </Text>
            </View>

            {/* Key Features */}
            <View style={styles.featuresSection}>
              <View style={styles.featureItem}>
                <Text style={styles.emoji}>🏋️</Text>
                <Text style={styles.featureText}>4 Core Exercises Daily</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.emoji}>📈</Text>
                <Text style={styles.featureText}>
                  Progressive +1 Rep System
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.emoji}>🏆</Text>
                <Text style={styles.featureText}>Achievement Tracking</Text>
              </View>
            </View>

            {/* Progress Example */}
            <View style={styles.progressExample}>
              <Text style={styles.exampleTitle}>The "One More" Concept</Text>
              <Text style={styles.exampleText}>
                Start with your baseline. Add just ONE MORE rep each day.
              </Text>
              <View style={styles.progressDemo}>
                <Text style={styles.demoText}>Day 1: 10 push-ups</Text>
                <Text style={styles.demoText}>Day 2: 11 push-ups</Text>
                <Text style={styles.demoText}>Day 100: 109 push-ups! 🎉</Text>
              </View>
            </View>

            {/* Start Button */}
            <Animated.View
              style={[
                styles.buttonContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartChallenge}
              >
                <LinearGradient
                  colors={[
                    COLORS.UI.BUTTON_PRIMARY,
                    COLORS.UI.BUTTON_SECONDARY,
                  ]}
                  style={styles.startButtonGradient}
                >
                  <Text style={styles.startButtonText}>🚀 Start Challenge</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <Text style={styles.footerText}>
              Join thousands on their transformation journey
            </Text>
          </Animated.View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.TEXT.PRIMARY,
    textAlign: "center",
    textShadowColor: COLORS.EFFECTS.OVERLAY,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  titleAccent: {
    fontSize: 38,
    fontWeight: "900",
    color: COLORS.ACCENT.PRIMARY,
    textAlign: "center",
    textShadowColor: COLORS.EFFECTS.OVERLAY,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 2,
    marginVertical: -5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  featuresSection: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: COLORS.BACKGROUND.CARD,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  emoji: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
    fontWeight: "500",
    flex: 1,
  },
  progressExample: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    padding: 24,
    borderRadius: 16,
    marginBottom: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  exampleTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    textAlign: "center",
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  progressDemo: {
    alignItems: "center",
  },
  demoText: {
    fontSize: 14,
    color: COLORS.TEXT.ACCENT,
    marginBottom: 6,
    fontWeight: "500",
  },
  buttonContainer: {
    marginBottom: 30,
  },
  startButton: {
    borderRadius: 25,
    shadowColor: COLORS.UI.SHADOW,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  startButtonGradient: {
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  startButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: "700",
  },
  footerText: {
    fontSize: 14,
    color: COLORS.TEXT.MUTED,
    textAlign: "center",
    marginBottom: 20,
  },
});

export default WelcomeScreen;
