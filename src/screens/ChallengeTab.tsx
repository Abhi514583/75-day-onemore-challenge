import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";
import { SafeAreaWrapper } from "../components/SafeAreaWrapper";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import {
  completeExercise,
  useFreezeToken,
} from "../store/slices/challengeSlice";

interface ExerciseProgress {
  type: "pushups" | "squats" | "situps" | "planks";
  name: string;
  emoji: string;
  target: number;
  bestSetToday: number;
  remaining: number;
  completed: boolean;
  unit: string;
}

interface ChallengeTabProps {
  onStartSession: (exerciseType: string) => void;
}

const ChallengeTab: React.FC<ChallengeTabProps> = ({ onStartSession }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dispatch = useAppDispatch();

  const {
    currentDay,
    currentStreak,
    baselines,
    dailyProgress,
    freezeTokensRemaining,
  } = useAppSelector((state) => state.challenge);

  const { xp, level } = useAppSelector((state) => state.user);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const todayProgress = dailyProgress[today];

  // Calculate exercise progress
  const exercises: ExerciseProgress[] = [
    {
      type: "pushups",
      name: "Push-ups",
      emoji: "💪",
      target: baselines.pushups + (currentDay - 1),
      bestSetToday: todayProgress?.exercises.pushups.actualReps || 0,
      remaining: Math.max(
        0,
        baselines.pushups +
          (currentDay - 1) -
          (todayProgress?.exercises.pushups.actualReps || 0)
      ),
      completed: todayProgress?.exercises.pushups.completed || false,
      unit: "reps",
    },
    {
      type: "squats",
      name: "Squats",
      emoji: "🦵",
      target: baselines.squats + (currentDay - 1),
      bestSetToday: todayProgress?.exercises.squats.actualReps || 0,
      remaining: Math.max(
        0,
        baselines.squats +
          (currentDay - 1) -
          (todayProgress?.exercises.squats.actualReps || 0)
      ),
      completed: todayProgress?.exercises.squats.completed || false,
      unit: "reps",
    },
    {
      type: "situps",
      name: "Sit-ups",
      emoji: "🔥",
      target: baselines.situps + (currentDay - 1),
      bestSetToday: todayProgress?.exercises.situps.actualReps || 0,
      remaining: Math.max(
        0,
        baselines.situps +
          (currentDay - 1) -
          (todayProgress?.exercises.situps.actualReps || 0)
      ),
      completed: todayProgress?.exercises.situps.completed || false,
      unit: "reps",
    },
    {
      type: "planks",
      name: "Plank",
      emoji: "⏱️",
      target: baselines.planks + (currentDay - 1) * 5,
      bestSetToday: todayProgress?.exercises.planks.actualSeconds || 0,
      remaining: Math.max(
        0,
        baselines.planks +
          (currentDay - 1) * 5 -
          (todayProgress?.exercises.planks.actualSeconds || 0)
      ),
      completed: todayProgress?.exercises.planks.completed || false,
      unit: "sec",
    },
  ];

  const allCompleted = exercises.every((ex) => ex.completed);
  const completedCount = exercises.filter((ex) => ex.completed).length;

  // Streak rungs (cosmetic badges)
  const streakRungs = [7, 14, 21, 30, 45, 60];
  const currentRung =
    streakRungs.filter((rung) => currentStreak >= rung).pop() || 0;
  const nextRung = streakRungs.find((rung) => rung > currentStreak);

  // XP and Level calculation
  const currentLevelXP = level * 1000; // 1000 XP per level
  const nextLevelXP = (level + 1) * 1000;
  const xpProgress = ((xp - currentLevelXP) / 1000) * 100;

  const handleCompleteToday = () => {
    if (allCompleted) {
      Alert.alert(
        "Already Complete!",
        "You have completed all exercises for today. Great job!"
      );
      return;
    }

    Alert.alert(
      "Complete Today",
      "This will start your exercise session. Are you ready?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Session",
          onPress: () => {
            // Find first incomplete exercise
            const nextExercise = exercises.find((ex) => !ex.completed);
            if (nextExercise) {
              onStartSession(nextExercise.type);
            }
          },
        },
      ]
    );
  };

  const handleUseFreeze = () => {
    if (freezeTokensRemaining <= 0) {
      Alert.alert(
        "No Freeze Tokens",
        "You have no freeze tokens remaining. You get 1 token per rolling 7 days."
      );
      return;
    }

    Alert.alert(
      "Use Freeze Token",
      "This will preserve your streak for today without completing exercises. You have " +
        freezeTokensRemaining +
        " tokens remaining.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use Token",
          onPress: () => {
            dispatch(useFreezeToken());
            Alert.alert(
              "Freeze Used!",
              "Your streak has been preserved for today."
            );
          },
        },
      ]
    );
  };

  const handleLightenExercise = (exercise: ExerciseProgress) => {
    const lightenedTarget = Math.floor(exercise.target * 0.9); // -10%
    Alert.alert(
      "Lighten Exercise",
      `Reduce ${exercise.name} target from ${exercise.target} to ${lightenedTarget} ${exercise.unit}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Lighten (Assisted)",
          onPress: () => {
            // This would update the target for today
            Alert.alert(
              "Target Reduced!",
              `${exercise.name} target reduced to ${lightenedTarget} ${exercise.unit} for today.`
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.dayTitle}>Day {currentDay}</Text>
            <Text style={styles.subtitle}>Daily Progression</Text>
          </View>

          {/* Today's Targets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Targets</Text>
            {exercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.type}
                style={[
                  styles.exerciseCard,
                  exercise.completed && styles.exerciseCardCompleted,
                ]}
                onPress={() => onStartSession(exercise.type)}
                activeOpacity={0.8}
              >
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseEmoji}>{exercise.emoji}</Text>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    {exercise.completed && (
                      <Text style={styles.completedBadge}>✅</Text>
                    )}
                    {!exercise.completed && (
                      <Text style={styles.startBadge}>▶️ Start</Text>
                    )}
                  </View>
                  {!exercise.completed &&
                    exercise.bestSetToday < exercise.target * 0.7 && (
                      <TouchableOpacity
                        style={styles.lightenButton}
                        onPress={(e) => {
                          e.stopPropagation(); // Prevent triggering the card press
                          handleLightenExercise(exercise);
                        }}
                      >
                        <Text style={styles.lightenButtonText}>
                          Lighten -10%
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>

                <View style={styles.exerciseStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Target</Text>
                    <Text style={styles.statValue}>
                      {exercise.target} {exercise.unit}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Best Set Today</Text>
                    <Text style={styles.statValue}>
                      {exercise.bestSetToday} {exercise.unit}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Remaining</Text>
                    <Text
                      style={[
                        styles.statValue,
                        exercise.remaining === 0 && styles.completedText,
                      ]}
                    >
                      {exercise.remaining} {exercise.unit}
                    </Text>
                  </View>
                </View>

                {/* Tap indicator */}
                <View style={styles.tapIndicator}>
                  <Text style={styles.tapIndicatorText}>
                    {exercise.completed ? "Completed" : "Tap to start"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Complete Today CTA */}
          <TouchableOpacity
            style={[
              styles.completeButton,
              allCompleted && styles.completedButton,
            ]}
            onPress={handleCompleteToday}
          >
            <LinearGradient
              colors={
                allCompleted
                  ? [COLORS.STATUS.COMPLETED, COLORS.STATUS.COMPLETED]
                  : [COLORS.UI.BUTTON_PRIMARY, COLORS.UI.BUTTON_SECONDARY]
              }
              style={styles.completeButtonGradient}
            >
              <Text style={styles.completeButtonText}>
                {allCompleted
                  ? `🎉 Day ${currentDay} Complete!`
                  : "Complete Today"}
              </Text>
              <Text style={styles.completeButtonSubtext}>
                {allCompleted
                  ? `${completedCount}/4 exercises done`
                  : `${completedCount}/4 exercises completed`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Freeze Tokens */}
          <View style={styles.section}>
            <View style={styles.freezeSection}>
              <View style={styles.freezeInfo}>
                <Text style={styles.freezeTitle}>❄️ Freeze Tokens</Text>
                <Text style={styles.freezeSubtitle}>
                  Preserve streak without exercising
                </Text>
                <Text style={styles.freezeCount}>
                  {freezeTokensRemaining} remaining
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.freezeButton,
                  freezeTokensRemaining === 0 && styles.disabledButton,
                ]}
                onPress={handleUseFreeze}
                disabled={freezeTokensRemaining === 0}
              >
                <Text
                  style={[
                    styles.freezeButtonText,
                    freezeTokensRemaining === 0 && styles.disabledText,
                  ]}
                >
                  Use Freeze
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.freezeNote}>
              You get 1 token per rolling 7 days
            </Text>
          </View>

          {/* XP & Level */}
          <View style={styles.section}>
            <View style={styles.xpCard}>
              <View style={styles.xpInfo}>
                <Text style={styles.xpTitle}>Level {level}</Text>
                <Text style={styles.xpText}>{xp} XP</Text>
              </View>
              <View style={styles.xpProgressContainer}>
                <View style={styles.xpProgressRing}>
                  <View
                    style={[styles.xpProgressFill, { width: `${xpProgress}%` }]}
                  />
                </View>
                <Text style={styles.xpProgressText}>
                  {Math.round(xpProgress)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Streak Rungs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Streak Rungs</Text>
            <View style={styles.rungsContainer}>
              {streakRungs.map((rung) => (
                <View
                  key={rung}
                  style={[
                    styles.rungBadge,
                    currentStreak >= rung && styles.unlockedRung,
                    currentRung === rung && styles.currentRung,
                  ]}
                >
                  <Text
                    style={[
                      styles.rungText,
                      currentStreak >= rung && styles.unlockedRungText,
                    ]}
                  >
                    {rung}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.rungProgress}>
              Current streak: {currentStreak} days
              {nextRung && ` • Next rung: ${nextRung} days`}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, // Space for bottom navigation
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  dayTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.TEXT.PRIMARY,
    textShadowColor: COLORS.EFFECTS.OVERLAY,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT.TERTIARY,
    marginTop: 4,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginRight: 8,
  },
  completedBadge: {
    fontSize: 16,
  },
  lightenButton: {
    backgroundColor: COLORS.ACCENT.WARNING,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  lightenButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 12,
    fontWeight: "600",
  },
  exerciseStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.TEXT.MUTED,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.SECONDARY,
  },
  completedText: {
    color: COLORS.STATUS.COMPLETED,
  },
  completeButton: {
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: COLORS.UI.SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  completedButton: {
    opacity: 0.8,
  },
  completeButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  completeButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  completeButtonSubtext: {
    color: COLORS.TEXT.TERTIARY,
    fontSize: 14,
  },
  freezeSection: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  freezeInfo: {
    flex: 1,
  },
  freezeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  freezeSubtitle: {
    fontSize: 12,
    color: COLORS.TEXT.TERTIARY,
    marginBottom: 4,
  },
  freezeCount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.ACCENT.PRIMARY,
  },
  freezeButton: {
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  disabledButton: {
    opacity: 0.5,
  },
  freezeButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  disabledText: {
    color: COLORS.TEXT.MUTED,
  },
  freezeNote: {
    fontSize: 12,
    color: COLORS.TEXT.MUTED,
    textAlign: "center",
    marginTop: 8,
  },
  xpCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  xpInfo: {
    flex: 1,
  },
  xpTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  xpText: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
  },
  xpProgressContainer: {
    alignItems: "center",
  },
  xpProgressRing: {
    width: 60,
    height: 8,
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    borderRadius: 4,
    marginBottom: 4,
  },
  xpProgressFill: {
    height: "100%",
    backgroundColor: COLORS.ACCENT.PRIMARY,
    borderRadius: 4,
  },
  xpProgressText: {
    fontSize: 12,
    color: COLORS.TEXT.TERTIARY,
  },
  rungsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  rungBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    borderWidth: 2,
    borderColor: COLORS.UI.BUTTON_BORDER,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  unlockedRung: {
    backgroundColor: COLORS.STATUS.COMPLETED,
    borderColor: COLORS.ACCENT.PRIMARY,
  },
  currentRung: {
    backgroundColor: COLORS.ACCENT.PRIMARY,
    borderColor: COLORS.ACCENT.SECONDARY,
  },
  rungText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.TEXT.MUTED,
  },
  unlockedRungText: {
    color: COLORS.TEXT.PRIMARY,
  },
  rungProgress: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "center",
  },
  exerciseCardCompleted: {
    opacity: 0.8,
    borderColor: COLORS.STATUS.COMPLETED,
  },
  startBadge: {
    fontSize: 14,
    color: COLORS.ACCENT.PRIMARY,
    fontWeight: "600",
  },
  tapIndicator: {
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.UI.DIVIDER,
  },
  tapIndicatorText: {
    fontSize: 12,
    color: COLORS.TEXT.TERTIARY,
    fontStyle: "italic",
  },
});

export default ChallengeTab;
