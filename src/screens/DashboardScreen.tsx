import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { completeExercise } from "../store/slices/challengeSlice";

const { width, height } = Dimensions.get("window");

interface ExerciseTarget {
  type: "pushups" | "squats" | "situps" | "planks";
  name: string;
  emoji: string;
  target: number;
  unit: string;
  completed: boolean;
}

interface DashboardProps {
  baselines?: {
    pushups: number;
    squats: number;
    situps: number;
    planks: number;
  };
  onStartExercise?: (
    exerciseType: "pushups" | "squats" | "situps" | "planks",
    target: number
  ) => void;
  onViewProgress?: () => void;
}

const DashboardScreen: React.FC<DashboardProps> = ({
  onStartExercise,
  onViewProgress,
}) => {
  const dispatch = useAppDispatch();
  const { currentDay, currentStreak, baselines, dailyProgress, isActive } =
    useAppSelector(
      (state) =>
        state.challenge || {
          currentDay: 1,
          currentStreak: 0,
          baselines: { pushups: 10, squats: 15, situps: 10, planks: 30 },
          dailyProgress: {},
          isActive: false,
        }
    );

  const [exercises, setExercises] = useState<ExerciseTarget[]>([]);
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isActive) return;

    // Get today's progress from Redux state
    const today = new Date().toISOString().split("T")[0];
    const todayProgress = dailyProgress[today];

    if (todayProgress) {
      const todaysExercises: ExerciseTarget[] = [
        {
          type: "pushups",
          name: "Push-ups",
          emoji: "💪",
          target: todayProgress.exercises.pushups.target,
          unit: "reps",
          completed: todayProgress.exercises.pushups.completed,
        },
        {
          type: "squats",
          name: "Squats",
          emoji: "🦵",
          target: todayProgress.exercises.squats.target,
          unit: "reps",
          completed: todayProgress.exercises.squats.completed,
        },
        {
          type: "situps",
          name: "Sit-ups",
          emoji: "🏋️",
          target: todayProgress.exercises.situps.target,
          unit: "reps",
          completed: todayProgress.exercises.situps.completed,
        },
        {
          type: "planks",
          name: "Planks",
          emoji: "⏱️",
          target: todayProgress.exercises.planks.target,
          unit: "seconds",
          completed: todayProgress.exercises.planks.completed,
        },
      ];
      setExercises(todaysExercises);
    }

    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for timer
    Animated.loop(
      Animated.sequence([
        Animated.timing(timerPulse, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(timerPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [currentDay, baselines, dailyProgress, isActive]);

  // 24-hour countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleStartExercise = (exerciseType: string) => {
    console.log(`Starting ${exerciseType} exercise`);
    console.log("onStartExercise prop:", onStartExercise);

    const exercise = exercises.find((ex) => ex.type === exerciseType);
    console.log("Found exercise:", exercise);

    if (exercise && !exercise.completed && onStartExercise) {
      console.log("Navigating to exercise screen...");
      // Navigate to exercise tracking screen
      onStartExercise(
        exerciseType as "pushups" | "squats" | "situps" | "planks",
        exercise.target
      );
    } else {
      console.log("Cannot start exercise:", {
        hasExercise: !!exercise,
        isCompleted: exercise?.completed,
        hasCallback: !!onStartExercise,
      });
    }
  };

  const dayProgressPercentage = (currentDay / 75) * 100;

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#f093fb"]}
      locations={[0, 0.6, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.dayContainer}>
              <Text style={styles.dayText}>Day {currentDay}</Text>
              <Text style={styles.daySubtext}>of 75</Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { width: `${dayProgressPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(dayProgressPercentage)}% Complete
              </Text>
            </View>

            <View style={styles.streakContainer}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>{currentStreak} day streak</Text>
            </View>
          </Animated.View>

          {/* 24-Hour Timer */}
          <Animated.View
            style={[
              styles.timerContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: timerPulse }],
              },
            ]}
          >
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 0.1)"]}
              style={styles.timerCard}
            >
              <Text style={styles.timerTitle}>⏰ Time Remaining Today</Text>
              <View style={styles.timerDisplay}>
                <View style={styles.timeUnit}>
                  <Text style={styles.timeNumber}>
                    {timeRemaining.hours.toString().padStart(2, "0")}
                  </Text>
                  <Text style={styles.timeLabel}>Hours</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeUnit}>
                  <Text style={styles.timeNumber}>
                    {timeRemaining.minutes.toString().padStart(2, "0")}
                  </Text>
                  <Text style={styles.timeLabel}>Minutes</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeUnit}>
                  <Text style={styles.timeNumber}>
                    {timeRemaining.seconds.toString().padStart(2, "0")}
                  </Text>
                  <Text style={styles.timeLabel}>Seconds</Text>
                </View>
              </View>
              <Text style={styles.timerSubtext}>
                Complete your exercises anytime today!
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Today's Challenge */}
          <Animated.View
            style={[
              styles.challengeContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.challengeTitle}>💪 Today's Challenge</Text>

            {exercises.map((exercise, index) => (
              <Animated.View
                key={exercise.type}
                style={[
                  styles.exerciseCard,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    "rgba(255, 255, 255, 0.2)",
                    "rgba(255, 255, 255, 0.1)",
                  ]}
                  style={styles.exerciseCardGradient}
                >
                  <View style={styles.exerciseInfo}>
                    <View style={styles.exerciseEmojiContainer}>
                      <Text style={styles.exerciseEmoji}>{exercise.emoji}</Text>
                    </View>
                    <View style={styles.exerciseDetails}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseTarget}>
                        {exercise.target} {exercise.unit}
                      </Text>
                      <View style={styles.progressIndicator}>
                        <View
                          style={[
                            styles.progressDot,
                            exercise.completed && styles.progressDotCompleted,
                          ]}
                        />
                        <Text style={styles.progressTextSmall}>
                          {exercise.completed ? "Completed ✅" : "Pending"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.startButton,
                      exercise.completed && styles.completedButton,
                    ]}
                    onPress={() => handleStartExercise(exercise.type)}
                  >
                    <LinearGradient
                      colors={
                        exercise.completed
                          ? ["#4CAF50", "#45a049"]
                          : [
                              "rgba(255, 255, 255, 0.3)",
                              "rgba(255, 255, 255, 0.1)",
                            ]
                      }
                      style={styles.startButtonGradient}
                    >
                      <Text style={styles.startButtonText}>
                        {exercise.completed ? "✓" : "Start"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View
            style={[
              styles.actionButtonsContainer,
              { opacity: fadeAnim, transform: [{ scale: pulseAnim }] },
            ]}
          >
            <TouchableOpacity
              style={styles.progressButton}
              onPress={onViewProgress}
            >
              <LinearGradient
                colors={["rgba(255, 215, 0, 0.3)", "rgba(255, 215, 0, 0.1)"]}
                style={styles.progressButtonGradient}
              >
                <Text style={styles.progressButtonText}>📊 View Progress</Text>
                <Text style={styles.progressButtonSubtext}>
                  Charts & Analytics
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton}>
              <LinearGradient
                colors={[
                  "rgba(255, 255, 255, 0.3)",
                  "rgba(255, 255, 255, 0.1)",
                ]}
                style={styles.shareButtonGradient}
              >
                <Text style={styles.shareButtonText}>🚀 Share Progress</Text>
                <Text style={styles.shareButtonSubtext}>
                  Day {currentDay} / 75
                </Text>
              </LinearGradient>
            </TouchableOpacity>
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  dayContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  dayText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 2,
  },
  daySubtext: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    marginTop: -5,
  },
  progressContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  progressBar: {
    width: "100%",
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 6,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  streakEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  streakText: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "700",
  },
  timerContainer: {
    marginBottom: 30,
  },
  timerCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  timerTitle: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  timerDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  timeUnit: {
    alignItems: "center",
    minWidth: 60,
  },
  timeNumber: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFD700",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  timeLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    marginTop: 4,
  },
  timeSeparator: {
    fontSize: 28,
    color: "#ffffff",
    fontWeight: "900",
    marginHorizontal: 8,
  },
  timerSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    fontStyle: "italic",
  },
  challengeContainer: {
    marginBottom: 30,
  },
  challengeTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 20,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  exerciseCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  exerciseCardGradient: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  exerciseInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  exerciseEmojiContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  exerciseEmoji: {
    fontSize: 28,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  exerciseTarget: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    marginBottom: 8,
  },
  progressIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    marginRight: 8,
  },
  progressDotCompleted: {
    backgroundColor: "#4CAF50",
  },
  progressTextSmall: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },
  startButton: {
    borderRadius: 15,
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  completedButton: {
    shadowColor: "#4CAF50",
  },
  startButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    minWidth: 70,
    alignItems: "center",
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  actionButtonsContainer: {
    gap: 15,
  },
  progressButton: {
    borderRadius: 25,
    shadowColor: "rgba(255, 215, 0, 0.4)",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    marginBottom: 10,
  },
  progressButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  progressButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  progressButtonSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  shareButton: {
    borderRadius: 25,
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  shareButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  shareButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  shareButtonSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default DashboardScreen;
