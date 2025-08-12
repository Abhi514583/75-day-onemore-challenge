import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Vibration,
  Modal,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAppDispatch } from "../store/hooks";
import { completeExercise } from "../store/slices/challengeSlice";
import AchievementService from "../services/AchievementService";
import NotificationService from "../services/NotificationService";

Dimensions.get("window");

interface ExerciseTrackingProps {
  exerciseType: "pushups" | "squats" | "situps" | "planks";
  targetCount: number;
  onComplete: (score: number, duration: number) => void;
  onBack: () => void;
  mode?: "challenge" | "duel" | "pb";
  duelId?: string;
  opponentName?: string;
}

const ExerciseTrackingScreen: React.FC<ExerciseTrackingProps> = ({
  exerciseType,
  targetCount,
  onComplete,
  onBack,
  mode = "challenge",
  duelId,
  opponentName,
}) => {
  const dispatch = useAppDispatch();
  const [permission, requestPermission] = useCameraPermissions();

  const [currentCount, setCurrentCount] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [formFeedback, setFormFeedback] = useState<
    "good" | "warning" | "error" | null
  >(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCount, setManualCount] = useState("");
  const [celebrationPhase, setCelebrationPhase] = useState<
    "none" | "milestone" | "completion"
  >("none");

  // Animations
  const countAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const repIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastRepTimeRef = useRef<number>(0);

  // Progress animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentCount / targetCount,
      duration: 500,
      useNativeDriver: false,
    }).start();

    if (currentCount >= targetCount && !isCompleted) {
      handleExerciseComplete();
    }
  }, [currentCount, targetCount]);

  const handleExerciseComplete = async () => {
    setIsCompleted(true);
    setIsTracking(false);
    setCelebrationPhase("completion");

    if (timerRef.current) clearInterval(timerRef.current);
    if (repIntervalRef.current) clearInterval(repIntervalRef.current);

    // Vibration feedback
    Vibration.vibrate([0, 100, 50, 100]);

    // Dispatch completion to Redux
    dispatch(completeExercise({ exerciseType, actualCount: currentCount }));

    // Check for achievements
    await AchievementService.checkAchievements({
      currentDay: 1, // This would come from Redux state
      currentStreak: 1, // This would come from Redux state
      bestStreak: 1, // This would come from Redux state
      totalDaysCompleted: 1, // This would come from Redux state
      todayExercises: {
        [exerciseType]: exerciseType === "planks" ? currentCount : currentCount,
      },
    });

    // Celebration animation
    Animated.sequence([
      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(countAnim, {
        toValue: 1.5,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(countAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Show completion celebration
    setTimeout(() => {
      showCompletionCelebration();
    }, 800);
  };

  const showCompletionCelebration = () => {
    const exerciseInfo = getExerciseInfo();
    const isPersonalBest = currentCount > targetCount;

    Alert.alert(
      `🎉 ${exerciseInfo.name} Complete!`,
      `Amazing work! You completed ${currentCount} ${getExerciseUnit()}!\n\n${
        isPersonalBest
          ? "🔥 That's above your target! You're crushing it!"
          : "💪 Great job staying consistent!"
      }\n\nTime: ${formatTime(timeElapsed)}`,
      [
        {
          text: "🚀 Continue",
          onPress: () => {
            setCelebrationPhase("none");
            onComplete();
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startTracking = () => {
    setIsTracking(true);
    setIsPaused(false);
    setCurrentCount(0);
    setTimeElapsed(0);
    startTimeRef.current = Date.now();
    lastRepTimeRef.current = Date.now();

    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    if (exerciseType === "planks") {
      // For planks, track time automatically
      timerRef.current = setInterval(() => {
        if (!isPaused) {
          const elapsed = Math.floor(
            (Date.now() - (startTimeRef.current || 0)) / 1000
          );
          setTimeElapsed(elapsed);
          setCurrentCount(elapsed);

          // Milestone feedback for planks
          if (elapsed > 0 && elapsed % 30 === 0) {
            triggerMilestoneFeedback();
          }
        }
      }, 1000);
    } else {
      // For other exercises, manual counting with enhanced feedback
      console.log(`📱 Manual counting mode for ${exerciseType}`);

      // Start timer for elapsed time
      timerRef.current = setInterval(() => {
        if (!isPaused) {
          const elapsed = Math.floor(
            (Date.now() - (startTimeRef.current || 0)) / 1000
          );
          setTimeElapsed(elapsed);
        }
      }, 1000);
    }
  };

  const pauseTracking = () => {
    setIsPaused(true);
    pulseAnim.stopAnimation();
  };

  const resumeTracking = () => {
    setIsPaused(false);
    // Restart pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopTracking = () => {
    setIsTracking(false);
    setIsPaused(false);
    pulseAnim.stopAnimation();
    if (timerRef.current) clearInterval(timerRef.current);
    if (repIntervalRef.current) clearInterval(repIntervalRef.current);
  };

  const addRep = () => {
    if (!isTracking || isPaused || isCompleted) return;

    const newCount = currentCount + 1;
    setCurrentCount(newCount);
    lastRepTimeRef.current = Date.now();

    // Rep animation
    Animated.sequence([
      Animated.timing(countAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(countAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Vibration feedback
    Vibration.vibrate(50);

    // Check for milestones
    if (newCount % 10 === 0 && newCount < targetCount) {
      triggerMilestoneFeedback();
    }

    // Form feedback simulation (in real app, this would come from pose detection)
    const randomFeedback = Math.random();
    if (randomFeedback > 0.8) {
      setFormFeedback("good");
      triggerFormFeedback("good");
    } else if (randomFeedback < 0.2) {
      setFormFeedback("warning");
      triggerFormFeedback("warning");
    }
  };

  const subtractRep = () => {
    if (!isTracking || isPaused || isCompleted || currentCount <= 0) return;

    setCurrentCount(currentCount - 1);

    // Shake animation for subtract
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerMilestoneFeedback = () => {
    setCelebrationPhase("milestone");
    Vibration.vibrate([0, 100, 100, 100]);

    setTimeout(() => {
      setCelebrationPhase("none");
    }, 2000);
  };

  const triggerFormFeedback = (type: "good" | "warning" | "error") => {
    Animated.sequence([
      Animated.timing(feedbackAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      setFormFeedback(null);
    }, 1200);
  };

  const handleManualInput = () => {
    setShowManualInput(true);
  };

  const submitManualCount = () => {
    const count = parseInt(manualCount);
    if (count > 0 && count <= 999) {
      setCurrentCount(count);
      setShowManualInput(false);
      setManualCount("");

      if (count >= targetCount) {
        handleExerciseComplete();
      }
    } else {
      Alert.alert("Invalid Input", "Please enter a number between 1 and 999");
    }
  };

  const getExerciseInfo = () => {
    const exercises = {
      pushups: { name: "Push-ups", emoji: "💪", color: "#FF6B6B" },
      squats: { name: "Squats", emoji: "🦵", color: "#4ECDC4" },
      situps: { name: "Sit-ups", emoji: "🏋️", color: "#45B7D1" },
      planks: { name: "Plank", emoji: "⏱️", color: "#96CEB4" },
    };
    return exercises[exerciseType];
  };

  const getExerciseUnit = () =>
    exerciseType === "planks" ? "seconds" : "reps";

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <LinearGradient
        colors={["#667eea", "#764ba2", "#f093fb"]}
        style={styles.container}
      >
        <SafeAreaView style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>📸 Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            Grant camera access to track your workout.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Allow</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const info = getExerciseInfo();

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="front">
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "transparent", "rgba(0,0,0,0.7)"]}
          style={styles.overlay}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButtonSmall} onPress={onBack}>
                <Text style={styles.backButtonSmallText}>←</Text>
              </TouchableOpacity>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseEmoji}>{info.emoji}</Text>
                <Text style={styles.exerciseName}>{info.name}</Text>
              </View>
              <View style={styles.placeholder} />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                      backgroundColor: info.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {currentCount} / {targetCount} {getExerciseUnit()}
              </Text>
            </View>

            {/* Main Counter with Enhanced Features */}
            <View style={styles.counterContainer}>
              <Animated.View
                style={[
                  styles.counterCircle,
                  {
                    transform: [
                      { scale: countAnim },
                      { translateX: shakeAnim },
                    ],
                    borderColor: info.color,
                    shadowColor:
                      celebrationPhase === "milestone" ? "#FFD700" : info.color,
                    shadowOpacity: celebrationPhase === "milestone" ? 0.8 : 0.3,
                  },
                ]}
              >
                <Animated.Text
                  style={[
                    styles.counterText,
                    {
                      transform: [{ scale: pulseAnim }],
                      color:
                        celebrationPhase === "milestone"
                          ? "#FFD700"
                          : "#ffffff",
                    },
                  ]}
                >
                  {currentCount}
                </Animated.Text>
                <Text style={styles.counterUnit}>{getExerciseUnit()}</Text>

                {/* Progress Ring */}
                <View style={styles.progressRing}>
                  <Animated.View
                    style={[
                      styles.progressRingFill,
                      {
                        transform: [
                          {
                            rotate: progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0deg", "360deg"],
                            }),
                          },
                        ],
                        borderColor: info.color,
                      },
                    ]}
                  />
                </View>
              </Animated.View>

              {/* Time Display */}
              <View style={styles.timeContainer}>
                <Text style={styles.timeLabel}>Time</Text>
                <Text style={styles.timeText}>{formatTime(timeElapsed)}</Text>
              </View>

              {/* Form Feedback */}
              {formFeedback && (
                <Animated.View
                  style={[
                    styles.formFeedback,
                    {
                      opacity: feedbackAnim,
                      backgroundColor:
                        formFeedback === "good"
                          ? "#4CAF50"
                          : formFeedback === "warning"
                          ? "#FF9800"
                          : "#F44336",
                    },
                  ]}
                >
                  <Text style={styles.formFeedbackText}>
                    {formFeedback === "good"
                      ? "✅ Great form!"
                      : formFeedback === "warning"
                      ? "⚠️ Watch your form"
                      : "❌ Poor form"}
                  </Text>
                </Animated.View>
              )}

              {/* Milestone Celebration */}
              {celebrationPhase === "milestone" && (
                <Animated.View
                  style={[
                    styles.milestoneOverlay,
                    { opacity: celebrationAnim },
                  ]}
                >
                  <Text style={styles.milestoneText}>
                    🎉 {currentCount} {getExerciseUnit()}! 🎉
                  </Text>
                  <Text style={styles.milestoneSubtext}>
                    Keep going strong!
                  </Text>
                </Animated.View>
              )}
            </View>

            {/* Enhanced Controls */}
            <View style={styles.controls}>
              {!isTracking && !isCompleted ? (
                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: info.color }]}
                  onPress={startTracking}
                >
                  <LinearGradient
                    colors={[info.color, `${info.color}CC`]}
                    style={styles.startButtonGradient}
                  >
                    <Text style={styles.startButtonText}>
                      🚀 Start Exercise
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : isTracking && !isPaused ? (
                <View style={styles.trackingControls}>
                  <TouchableOpacity
                    style={styles.pauseButton}
                    onPress={pauseTracking}
                  >
                    <Text style={styles.pauseButtonText}>⏸️ Pause</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stopButton}
                    onPress={stopTracking}
                  >
                    <Text style={styles.stopButtonText}>⏹️ Stop</Text>
                  </TouchableOpacity>
                </View>
              ) : isTracking && isPaused ? (
                <View style={styles.trackingControls}>
                  <TouchableOpacity
                    style={[
                      styles.resumeButton,
                      { backgroundColor: info.color },
                    ]}
                    onPress={resumeTracking}
                  >
                    <Text style={styles.resumeButtonText}>▶️ Resume</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stopButton}
                    onPress={stopTracking}
                  >
                    <Text style={styles.stopButtonText}>⏹️ Stop</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.completeButton,
                    { backgroundColor: "#4CAF50" },
                  ]}
                  onPress={onComplete}
                >
                  <Text style={styles.completeButtonText}>✅ Complete!</Text>
                </TouchableOpacity>
              )}

              {/* Enhanced Manual Count Buttons */}
              {isTracking && !isPaused && exerciseType !== "planks" && (
                <View style={styles.manualControls}>
                  <TouchableOpacity
                    style={[styles.manualButton, styles.subtractButton]}
                    onPress={subtractRep}
                    disabled={currentCount <= 0}
                  >
                    <Text style={styles.manualButtonText}>-1</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.manualButton,
                      styles.addButton,
                      { backgroundColor: info.color },
                    ]}
                    onPress={addRep}
                  >
                    <Text style={styles.manualButtonText}>+1</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Manual Input Option */}
              {!isTracking && !isCompleted && (
                <TouchableOpacity
                  style={styles.manualInputButton}
                  onPress={handleManualInput}
                >
                  <Text style={styles.manualInputButtonText}>
                    📝 Enter Count Manually
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Enhanced Instructions */}
            <View style={styles.instructions}>
              <Text style={styles.instructionText}>
                {isCompleted
                  ? `🎉 Amazing work! You completed ${currentCount} ${getExerciseUnit()}!`
                  : isPaused
                  ? `⏸️ Workout paused • Tap resume when ready`
                  : isTracking
                  ? exerciseType === "planks"
                    ? `⏱️ Hold your plank position! ${Math.max(
                        0,
                        targetCount - currentCount
                      )} seconds to go!`
                    : `💪 Tap +1 after each rep • ${Math.max(
                        0,
                        targetCount - currentCount
                      )} more to go!`
                  : `Position yourself in the camera and tap start when ready`}
              </Text>

              {/* Progress Encouragement */}
              {isTracking && !isPaused && !isCompleted && (
                <Text style={styles.encouragementText}>
                  {currentCount === 0
                    ? "You've got this! 💪"
                    : currentCount < targetCount * 0.25
                    ? "Great start! Keep it up! 🔥"
                    : currentCount < targetCount * 0.5
                    ? "You're doing amazing! 🚀"
                    : currentCount < targetCount * 0.75
                    ? "More than halfway there! 💯"
                    : currentCount < targetCount
                    ? "Almost there! Push through! ⚡"
                    : "You exceeded your target! Incredible! 🏆"}
                </Text>
              )}

              {!isTracking && !isCompleted && (
                <Text style={styles.aiText}>
                  ✨ AI pose detection coming in v2.0!
                </Text>
              )}

              {/* Stats */}
              {isTracking && (
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Target</Text>
                    <Text style={styles.statValue}>{targetCount}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Remaining</Text>
                    <Text style={styles.statValue}>
                      {Math.max(0, targetCount - currentCount)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Progress</Text>
                    <Text style={styles.statValue}>
                      {Math.round((currentCount / targetCount) * 100)}%
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </SafeAreaView>
        </LinearGradient>
      </CameraView>

      {/* Manual Input Modal */}
      <Modal
        visible={showManualInput}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowManualInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Enter Count Manually</Text>
            <Text style={styles.modalSubtitle}>
              How many {getExerciseUnit()} did you complete?
            </Text>

            <TextInput
              style={styles.modalInput}
              value={manualCount}
              onChangeText={setManualCount}
              placeholder="Enter number..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              keyboardType="numeric"
              autoFocus={true}
              maxLength={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowManualInput(false);
                  setManualCount("");
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  { backgroundColor: info.color },
                ]}
                onPress={submitManualCount}
              >
                <Text style={styles.modalSubmitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  permissionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 20,
  },
  permissionText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  permissionButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    marginBottom: 20,
  },
  permissionButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  backButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButtonSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonSmallText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
  },
  exerciseHeader: {
    alignItems: "center",
  },
  exerciseEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  exerciseName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 40,
    paddingTop: 30,
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  counterContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  counterCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  counterText: {
    fontSize: 64,
    fontWeight: "900",
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  counterUnit: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    marginTop: -10,
  },
  timeText: {
    fontSize: 24,
    color: "#FFD700",
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  controls: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    alignItems: "center",
  },
  startButton: {
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 25,
    marginBottom: 20,
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  stopButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    marginBottom: 20,
  },
  stopButtonText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  completeButton: {
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 25,
    marginBottom: 20,
  },
  completeButtonText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  manualControls: {
    flexDirection: "row",
    gap: 20,
  },
  manualButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  manualButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  instructions: {
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  instructionText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 8,
  },
  aiText: {
    color: "#4CAF50",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
  },
  // Enhanced styles for new features
  progressRing: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 2,
    borderColor: "transparent",
    top: -5,
    left: -5,
  },
  progressRingFill: {
    width: "100%",
    height: "100%",
    borderRadius: 105,
    borderWidth: 2,
    borderColor: "transparent",
    borderTopColor: "#FFD700",
  },
  timeContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  timeLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600",
    marginBottom: 4,
  },
  formFeedback: {
    position: "absolute",
    top: -60,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  formFeedbackText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  milestoneOverlay: {
    position: "absolute",
    top: -80,
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.9)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  milestoneText: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "800",
  },
  milestoneSubtext: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  startButtonGradient: {
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: "center",
  },
  trackingControls: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 20,
  },
  pauseButton: {
    backgroundColor: "rgba(255, 152, 0, 0.8)",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.3)",
  },
  pauseButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  resumeButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  resumeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  subtractButton: {
    backgroundColor: "rgba(244, 67, 54, 0.8)",
    borderColor: "rgba(244, 67, 54, 0.3)",
  },
  addButton: {
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  manualInputButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginTop: 10,
  },
  manualInputButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  encouragementText: {
    color: "#FFD700",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 8,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  statValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  modalContainer: {
    backgroundColor: "#2C2C2E",
    borderRadius: 20,
    padding: 30,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    color: "#ffffff",
    textAlign: "center",
    width: "100%",
    marginBottom: 20,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  modalCancelButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "600",
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  modalSubmitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ExerciseTrackingScreen;
