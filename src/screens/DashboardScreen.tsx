import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { CHALLENGE_CONFIG, getChallengeProgress } from "../config/challenge";
import { COLORS } from "../config/colors";
import { SafeAreaWrapper } from "../components/SafeAreaWrapper";

const { width, height } = Dimensions.get("window");

interface DashboardProps {
  baselines?: {
    pushups: number;
    squats: number;
    situps: number;
    planks: number;
  };
  onStartExercise?: () => void;
  onViewProgress?: () => void;
  onShare?: () => void;
  onNotifications?: () => void;
  onAchievements?: () => void;
  onBack?: () => void;
}

const DashboardScreen: React.FC<DashboardProps> = ({
  onStartExercise,
  onViewProgress,
  onShare,
  onNotifications,
  onAchievements,
  onBack,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { currentDay, currentStreak, totalDaysCompleted, dailyProgress } =
    useAppSelector(
      (state) =>
        state.challenge || {
          currentDay: 1,
          currentStreak: 0,
          totalDaysCompleted: 0,
          dailyProgress: {},
        }
    );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const todayProgress = dailyProgress[today];
  const completedExercises = todayProgress
    ? Object.values(todayProgress.exercises).filter((ex) => ex.completed).length
    : 0;
  const totalExercises = 4;

  const dailyProgressPercentage = (completedExercises / totalExercises) * 100;

  return (
    <SafeAreaWrapper>
      <LinearGradient
        colors={COLORS.BACKGROUND.PRIMARY}
        locations={[0, 0.5, 1]}
        style={styles.container}
      >
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
            {/* Header with Back Button */}
            <View style={styles.header}>
              {onBack && (
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.title}>Day {currentDay}</Text>
              <Text style={styles.subtitle}>{CHALLENGE_CONFIG.NAME}</Text>
            </View>

            {/* Progress Overview */}
            <View style={styles.progressSection}>
              <View style={styles.progressCard}>
                <Text style={styles.progressTitle}>Challenge Progress</Text>
                <Text style={styles.progressText}>
                  {currentDay} days completed
                </Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{currentStreak}</Text>
                  <Text style={styles.statLabel}>Current Streak</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{totalDaysCompleted}</Text>
                  <Text style={styles.statLabel}>Days Completed</Text>
                </View>
              </View>
            </View>

            {/* Today's Progress */}
            <View style={styles.todaySection}>
              <Text style={styles.sectionTitle}>Today's Progress</Text>
              <View style={styles.todayCard}>
                <View style={styles.todayProgress}>
                  <Text style={styles.todayProgressText}>
                    {completedExercises} of {totalExercises} exercises completed
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${dailyProgressPercentage}%` },
                      ]}
                    />
                  </View>
                </View>
                {dailyProgressPercentage === 100 ? (
                  <Text style={styles.completedText}>
                    🎉 All exercises completed!
                  </Text>
                ) : (
                  <Text style={styles.pendingText}>
                    Keep going! You've got this!
                  </Text>
                )}
              </View>
            </View>

            {/* Main Action Button */}
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={styles.chooseExerciseButton}
                onPress={onStartExercise}
              >
                <LinearGradient
                  colors={[
                    COLORS.UI.BUTTON_PRIMARY,
                    COLORS.UI.BUTTON_SECONDARY,
                  ]}
                  style={styles.chooseExerciseGradient}
                >
                  <Text style={styles.chooseExerciseEmoji}>🏋️</Text>
                  <Text style={styles.chooseExerciseText}>Choose Exercise</Text>
                  <Text style={styles.chooseExerciseSubtext}>
                    Select your next workout
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={onViewProgress}
              >
                <Text style={styles.quickActionEmoji}>📊</Text>
                <Text style={styles.quickActionText}>Progress</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={onAchievements}
              >
                <Text style={styles.quickActionEmoji}>🏆</Text>
                <Text style={styles.quickActionText}>Achievements</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={onShare}
              >
                <Text style={styles.quickActionEmoji}>📱</Text>
                <Text style={styles.quickActionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaWrapper>
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  backButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.TEXT.PRIMARY,
    textAlign: "center",
    textShadowColor: COLORS.EFFECTS.OVERLAY,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "center",
    marginTop: 4,
  },
  progressSection: {
    marginBottom: 30,
  },
  progressCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    textAlign: "center",
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.ACCENT.PRIMARY,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flex: 0.48,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.ACCENT.PRIMARY,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "center",
  },
  todaySection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 12,
  },
  todayCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  todayProgress: {
    marginBottom: 12,
  },
  todayProgressText: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 8,
  },
  completedText: {
    fontSize: 16,
    color: COLORS.STATUS.COMPLETED,
    fontWeight: "600",
    textAlign: "center",
  },
  pendingText: {
    fontSize: 16,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "center",
  },
  actionSection: {
    marginBottom: 30,
  },
  chooseExerciseButton: {
    borderRadius: 20,
    shadowColor: COLORS.UI.SHADOW,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  chooseExerciseGradient: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  chooseExerciseEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  chooseExerciseText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  chooseExerciseSubtext: {
    color: COLORS.TEXT.TERTIARY,
    fontSize: 14,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionButton: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flex: 0.3,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 12,
    fontWeight: "500",
  },
});

export default DashboardScreen;
