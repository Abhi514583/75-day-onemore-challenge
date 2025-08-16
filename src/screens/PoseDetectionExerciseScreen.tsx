import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppDispatch } from "../store/hooks";
import { completeExercise } from "../store/slices/challengeSlice";

// Pose Detection Components
import PoseDetectionCamera from "../components/PoseDetectionCamera";
import PoseOverlay from "../components/PoseOverlay";
import FormFeedbackDisplay from "../components/FormFeedbackDisplay";
import RepCounterDisplay from "../components/RepCounterDisplay";
import ManualCountingFallback from "../components/ManualCountingFallback";

// Pose Detection Services
import { FormTracker } from "../services/pose/FormTracker";
import { FeedbackManager } from "../services/pose/FeedbackManager";
import { CalibrationManager } from "../services/pose/CalibrationManager";

// Types
import {
  ExerciseType,
  FormFeedback,
  Pose,
  CalibrationData,
  PoseDetectionSettings,
} from "../types/pose";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface PoseDetectionExerciseProps {
  exerciseType: ExerciseType;
  targetCount: number;
  onComplete: (score: number, duration: number, formData?: any) => void;
  onBack: () => void;
  mode?: "challenge" | "duel" | "pb";
  duelId?: string;
  opponentName?: string;
}

export const PoseDetectionExerciseScreen: React.FC<
  PoseDetectionExerciseProps
> = ({
  exerciseType,
  targetCount,
  onComplete,
  onBack,
  mode = "challenge",
  duelId,
  opponentName,
}) => {
  const dispatch = useAppDispatch();

  // Core state
  const [currentCount, setCurrentCount] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Pose detection state
  const [poseDetectionEnabled, setPoseDetectionEnabled] = useState(true);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationData, setCalibrationData] =
    useState<CalibrationData | null>(null);
  const [currentPoses, setCurrentPoses] = useState<Pose[]>([]);
  const [formFeedback, setFormFeedback] = useState<FormFeedback[]>([]);
  const [formScore, setFormScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [frameRate, setFrameRate] = useState(30);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<PoseDetectionSettings>({
    enabled: true,
    exerciseType,
    difficultyLevel: "intermediate",
    showSkeleton: true,
    skeletonOpacity: 0.8,
    renderMode: "full",
    feedbackStyle: "all",
    confidenceThreshold: 0.6,
    formStrictness: 0.7,
    feedbackFrequency: "medium",
    autoCalibrate: true,
    persistCalibration: true,
    recalibrateOnLightingChange: true,
    targetFrameRate: 24,
    enablePerformanceMode: true,
    reducedQualityThreshold: 15,
  });

  // Services
  const formTracker = useRef(new FormTracker()).current;
  const calibrationManager = useRef(new CalibrationManager()).current;

  // Animations
  const countAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Exercise info
  const getExerciseInfo = () => {
    const exercises = {
      pushups: { name: "Push-ups", emoji: "💪", color: "#FF6B6B" },
      squats: { name: "Squats", emoji: "🦵", color: "#4ECDC4" },
      planks: { name: "Plank", emoji: "⏱️", color: "#96CEB4" },
      situps: { name: "Sit-ups", emoji: "🏋️", color: "#45B7D1" },
      burpees: { name: "Burpees", emoji: "🔥", color: "#FF8C42" },
      lunges: { name: "Lunges", emoji: "🦵", color: "#A8E6CF" },
      "mountain-climbers": {
        name: "Mountain Climbers",
        emoji: "🏔️",
        color: "#FFB6C1",
      },
      "jumping-jacks": { name: "Jumping Jacks", emoji: "🤸", color: "#DDA0DD" },
    };
    return exercises[exerciseType];
  };

  const info = getExerciseInfo();

  // Start tracking
  const startTracking = useCallback(async () => {
    try {
      setIsTracking(true);
      setIsPaused(false);
      setCurrentCount(0);
      setTimeElapsed(0);
      setStreak(0);
      startTimeRef.current = Date.now();

      // Start form tracking session
      if (poseDetectionEnabled) {
        formTracker.startSession(exerciseType);
      }

      // Start timer
      timerRef.current = setInterval(() => {
        if (!isPaused) {
          const elapsed = Math.floor(
            (Date.now() - (startTimeRef.current || 0)) / 1000
          );
          setTimeElapsed(elapsed);

          // For planks, count time as reps
          if (exerciseType === "planks") {
            setCurrentCount(elapsed);
          }
        }
      }, 1000);

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(countAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(countAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } catch (error) {
      console.error("Error starting tracking:", error);
      Alert.alert("Error", "Failed to start workout tracking");
    }
  }, [exerciseType, poseDetectionEnabled, isPaused]);

  // Handle pose detection frame
  const handlePoseFrame = useCallback(
    (poses: Pose[], frameRate: number) => {
      if (!isTracking || isPaused || !poseDetectionEnabled) return;

      setCurrentPoses(poses);
      setFrameRate(frameRate);

      if (poses.length > 0) {
        // Process frame with form tracker
        const result = formTracker.processFrame(
          poses[0],
          exerciseType,
          calibrationData
        );

        if (result.formScore) {
          setFormScore(result.formScore.overall);
        }

        setFormFeedback(result.feedback);

        // Handle rep detection
        if (result.shouldCountRep && exerciseType !== "planks") {
          handleRepDetected(result.formScore);
        }
      }
    },
    [isTracking, isPaused, poseDetectionEnabled, exerciseType, calibrationData]
  );

  // Handle detected rep
  const handleRepDetected = useCallback(
    (formScore: any) => {
      const newCount = currentCount + 1;
      setCurrentCount(newCount);

      // Record rep in form tracker
      if (formScore) {
        formTracker.recordRep(formScore, true);
      }

      // Update streak
      if (formScore && formScore.overall >= 75) {
        setStreak((prev) => prev + 1);
      } else {
        setStreak(0);
      }

      // Rep animation
      Animated.sequence([
        Animated.timing(countAnim, {
          toValue: 1.3,
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

      // Check completion
      if (newCount >= targetCount) {
        handleExerciseComplete();
      }
    },
    [currentCount, targetCount]
  );

  // Manual rep addition (fallback)
  const handleManualRep = useCallback(() => {
    if (!isTracking || isPaused || isCompleted) return;

    const newCount = currentCount + 1;
    setCurrentCount(newCount);

    // Create mock form score for manual reps
    const mockFormScore = {
      overall: 80,
      breakdown: {
        alignment: 80,
        jointAngles: 80,
        consistency: 80,
        safety: 80,
      },
      grade: "B" as const,
      improvements: [],
    };

    if (poseDetectionEnabled) {
      formTracker.recordRep(mockFormScore, true);
    }

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

    Vibration.vibrate(50);

    if (newCount >= targetCount) {
      handleExerciseComplete();
    }
  }, [
    currentCount,
    targetCount,
    isTracking,
    isPaused,
    isCompleted,
    poseDetectionEnabled,
  ]);

  // Handle exercise completion
  const handleExerciseComplete = useCallback(async () => {
    setIsCompleted(true);
    setIsTracking(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // End form tracking session
    let sessionData = null;
    if (poseDetectionEnabled) {
      sessionData = await formTracker.endSession();
    }

    // Vibration feedback
    Vibration.vibrate([0, 100, 50, 100]);

    // Dispatch completion to Redux
    dispatch(
      completeExercise({
        exerciseType,
        actualCount: currentCount,
        formData: sessionData,
      })
    );

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
      showCompletionCelebration(sessionData);
    }, 800);
  }, [currentCount, exerciseType, poseDetectionEnabled, dispatch]);

  // Show completion celebration
  const showCompletionCelebration = (sessionData: any) => {
    const isPersonalBest = currentCount > targetCount;
    const formScoreText = sessionData
      ? `\n🎯 Form Score: ${sessionData.averageScore.overall}% (${sessionData.averageScore.grade})`
      : "";

    Alert.alert(
      `🎉 ${info.name} Complete!`,
      `Amazing work! You completed ${currentCount} ${
        exerciseType === "planks" ? "seconds" : "reps"
      }!${formScoreText}\n\n${
        isPersonalBest
          ? "🔥 That's above your target! You're crushing it!"
          : "💪 Great job staying consistent!"
      }\n\nTime: ${formatTime(timeElapsed)}`,
      [
        {
          text: "🚀 Continue",
          onPress: () => {
            onComplete(currentCount, timeElapsed, sessionData);
          },
        },
      ]
    );
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle calibration
  const handleCalibration = useCallback(async () => {
    try {
      setIsCalibrating(true);
      const calibration = await calibrationManager.startCalibration(
        exerciseType
      );
      setCalibrationData(calibration);
      setIsCalibrating(false);
    } catch (error) {
      console.error("Calibration error:", error);
      setIsCalibrating(false);
      Alert.alert("Calibration Failed", "Using default settings");
    }
  }, [exerciseType]);

  // Handle camera error
  const handleCameraError = useCallback((error: string) => {
    setCameraError(error);
    setPoseDetectionEnabled(false);
  }, []);

  // Toggle pose detection
  const togglePoseDetection = useCallback(() => {
    setPoseDetectionEnabled((prev) => !prev);
    if (!poseDetectionEnabled && !calibrationData) {
      handleCalibration();
    }
  }, [poseDetectionEnabled, calibrationData, handleCalibration]);

  // Pause/Resume
  const pauseTracking = () => {
    setIsPaused(true);
    countAnim.stopAnimation();
  };

  const resumeTracking = () => {
    setIsPaused(false);
    // Restart pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(countAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(countAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Stop tracking
  const stopTracking = () => {
    setIsTracking(false);
    setIsPaused(false);
    countAnim.stopAnimation();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Progress animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentCount / targetCount,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentCount, targetCount]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Camera/Pose Detection Layer */}
      {poseDetectionEnabled && !cameraError ? (
        <PoseDetectionCamera
          exerciseType={exerciseType}
          onPoseDetected={handlePoseFrame}
          onError={handleCameraError}
          calibrationData={calibrationData}
          settings={settings}
          isActive={isTracking && !isPaused}
        />
      ) : (
        <ManualCountingFallback
          exerciseType={exerciseType}
          onRepDetected={handleManualRep}
          isActive={isTracking && !isPaused}
        />
      )}

      {/* Pose Overlay */}
      {poseDetectionEnabled && !cameraError && (
        <PoseOverlay
          poses={currentPoses}
          formFeedback={formFeedback[0] || null}
          repCount={currentCount}
          targetCount={targetCount}
          showSkeleton={settings.showSkeleton}
          exerciseType={exerciseType}
          renderMode={settings.renderMode}
          frameRate={frameRate}
          isCalibrating={isCalibrating}
        />
      )}

      {/* UI Overlay */}
      <LinearGradient
        colors={["rgba(0,0,0,0.7)", "transparent", "rgba(0,0,0,0.7)"]}
        style={styles.overlay}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseEmoji}>{info.emoji}</Text>
              <Text style={styles.exerciseName}>{info.name}</Text>
            </View>

            {/* Pose Detection Toggle */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>AI</Text>
              <Switch
                value={poseDetectionEnabled}
                onValueChange={togglePoseDetection}
                trackColor={{ false: "#767577", true: "#00FF88" }}
                thumbColor={poseDetectionEnabled ? "#ffffff" : "#f4f3f4"}
              />
            </View>
          </View>

          {/* Form Feedback */}
          {poseDetectionEnabled && formFeedback.length > 0 && (
            <FormFeedbackDisplay
              feedback={formFeedback}
              maxVisible={2}
              colorBlindFriendly={false}
              showSuggestions={true}
              compactMode={false}
            />
          )}

          {/* Rep Counter */}
          <RepCounterDisplay
            currentReps={currentCount}
            targetReps={targetCount}
            formScore={formScore}
            isValidRep={true}
            streak={streak}
            showProgress={true}
            showFormScore={poseDetectionEnabled}
            showStreak={poseDetectionEnabled}
            size="large"
            position="center"
          />

          {/* Controls */}
          <View style={styles.controls}>
            {!isTracking && !isCompleted ? (
              <>
                {poseDetectionEnabled && !calibrationData && (
                  <TouchableOpacity
                    style={[
                      styles.calibrateButton,
                      { backgroundColor: info.color },
                    ]}
                    onPress={handleCalibration}
                  >
                    <Text style={styles.calibrateButtonText}>
                      📐 Calibrate First
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: info.color }]}
                  onPress={startTracking}
                  disabled={poseDetectionEnabled && !calibrationData}
                >
                  <Text style={styles.startButtonText}>🚀 Start Exercise</Text>
                </TouchableOpacity>
              </>
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
                  style={[styles.resumeButton, { backgroundColor: info.color }]}
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
                style={[styles.completeButton, { backgroundColor: "#4CAF50" }]}
                onPress={() => onComplete(currentCount, timeElapsed)}
              >
                <Text style={styles.completeButtonText}>✅ Complete!</Text>
              </TouchableOpacity>
            )}

            {/* Manual controls for non-pose detection mode */}
            {!poseDetectionEnabled &&
              isTracking &&
              !isPaused &&
              exerciseType !== "planks" && (
                <TouchableOpacity
                  style={[
                    styles.manualRepButton,
                    { backgroundColor: info.color },
                  ]}
                  onPress={handleManualRep}
                >
                  <Text style={styles.manualRepButtonText}>+1 Rep</Text>
                </TouchableOpacity>
              )}
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {isCompleted
                ? `🎉 Amazing work! You completed ${currentCount} ${
                    exerciseType === "planks" ? "seconds" : "reps"
                  }!`
                : isPaused
                ? `⏸️ Workout paused • Tap resume when ready`
                : isTracking
                ? poseDetectionEnabled
                  ? `🤖 AI is tracking your form • ${Math.max(
                      0,
                      targetCount - currentCount
                    )} more to go!`
                  : exerciseType === "planks"
                  ? `⏱️ Hold your plank position! ${Math.max(
                      0,
                      targetCount - currentCount
                    )} seconds to go!`
                  : `💪 Tap +1 after each rep • ${Math.max(
                      0,
                      targetCount - currentCount
                    )} more to go!`
                : poseDetectionEnabled
                ? calibrationData
                  ? `Position yourself in the camera and tap start when ready`
                  : `Calibrate your camera position first for accurate tracking`
                : `Manual mode active • Position yourself and tap start when ready`}
            </Text>

            {/* Status indicators */}
            {poseDetectionEnabled && (
              <View style={styles.statusContainer}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Form Score</Text>
                  <Text
                    style={[
                      styles.statusValue,
                      {
                        color:
                          formScore >= 80
                            ? "#00FF88"
                            : formScore >= 60
                            ? "#FFD700"
                            : "#FF6B6B",
                      },
                    ]}
                  >
                    {Math.round(formScore)}%
                  </Text>
                </View>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>FPS</Text>
                  <Text
                    style={[
                      styles.statusValue,
                      {
                        color:
                          frameRate >= 24
                            ? "#00FF88"
                            : frameRate >= 15
                            ? "#FFD700"
                            : "#FF6B6B",
                      },
                    ]}
                  >
                    {Math.round(frameRate)}
                  </Text>
                </View>
                {streak > 0 && (
                  <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>Streak</Text>
                    <Text style={[styles.statusValue, { color: "#FF8C42" }]}>
                      🔥 {streak}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {cameraError && (
              <Text style={styles.errorText}>
                📷 Camera Error: {cameraError}
              </Text>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
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
  toggleContainer: {
    alignItems: "center",
  },
  toggleLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  controls: {
    position: "absolute",
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  calibrateButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  calibrateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  startButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 20,
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  trackingControls: {
    flexDirection: "row",
    gap: 15,
  },
  pauseButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  pauseButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  resumeButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  resumeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  stopButton: {
    backgroundColor: "rgba(255, 69, 58, 0.8)",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  stopButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  completeButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
  },
  completeButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  manualRepButton: {
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 15,
  },
  manualRepButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  instructions: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  instructionText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 10,
  },
  statusItem: {
    alignItems: "center",
  },
  statusLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    fontWeight: "500",
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },
});

export default PoseDetectionExerciseScreen;
