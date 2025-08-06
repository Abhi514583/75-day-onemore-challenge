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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAppDispatch } from "../store/hooks";
import { completeExercise } from "../store/slices/challengeSlice";

Dimensions.get("window");

interface ExerciseTrackingProps {
  exerciseType: "pushups" | "squats" | "situps" | "planks";
  targetCount: number;
  onComplete: () => void;
  onBack: () => void;
}

const ExerciseTrackingScreen: React.FC<ExerciseTrackingProps> = ({
  exerciseType,
  targetCount,
  onComplete,
  onBack,
}) => {
  const dispatch = useAppDispatch();
  const [permission, requestPermission] = useCameraPermissions();

  const [currentCount, setCurrentCount] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const countAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const repIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentCount / targetCount,
      duration: 300,
      useNativeDriver: false,
    }).start();

    if (currentCount >= targetCount && !isCompleted) {
      handleExerciseComplete();
    }
  }, [currentCount, targetCount]);

  const handleExerciseComplete = () => {
    setIsCompleted(true);
    setIsTracking(false);

    if (timerRef.current) clearInterval(timerRef.current);
    if (repIntervalRef.current) clearInterval(repIntervalRef.current);

    dispatch(completeExercise({ exerciseType, actualCount: currentCount }));

    Animated.sequence([
      Animated.timing(countAnim, {
        toValue: 1.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(countAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Alert.alert(
        "🎉 Exercise Complete!",
        `You did ${currentCount} ${getExerciseUnit()}!`,
        [{ text: "Continue", onPress: onComplete }]
      );
    }, 500);
  };

  const startTracking = () => {
    setIsTracking(true);
    setCurrentCount(0);
    setTimeElapsed(0);
    startTimeRef.current = Date.now();

    if (exerciseType === "planks") {
      // For planks, track time automatically
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - (startTimeRef.current || 0)) / 1000
        );
        setTimeElapsed(elapsed);
        setCurrentCount(elapsed);
      }, 1000);
    } else {
      // For other exercises, manual counting with +1/-1 buttons
      console.log(`📱 Manual counting mode for ${exerciseType}`);
      // User will use +1/-1 buttons to count reps
    }
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (repIntervalRef.current) clearInterval(repIntervalRef.current);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

            {/* Main Counter */}
            <View style={styles.counterContainer}>
              <Animated.View
                style={[
                  styles.counterCircle,
                  {
                    transform: [{ scale: countAnim }],
                    borderColor: info.color,
                  },
                ]}
              >
                <Text style={styles.counterText}>{currentCount}</Text>
                <Text style={styles.counterUnit}>{getExerciseUnit()}</Text>
              </Animated.View>

              {exerciseType === "planks" && (
                <Text style={styles.timeText}>{formatTime(timeElapsed)}</Text>
              )}
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              {!isTracking && !isCompleted ? (
                <TouchableOpacity
                  style={[styles.startButton, { backgroundColor: info.color }]}
                  onPress={startTracking}
                >
                  <Text style={styles.startButtonText}>🚀 Start Exercise</Text>
                </TouchableOpacity>
              ) : isTracking ? (
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopTracking}
                >
                  <Text style={styles.stopButtonText}>⏸️ Pause</Text>
                </TouchableOpacity>
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

              {/* Manual Count Buttons */}
              {isTracking && exerciseType !== "planks" && (
                <View style={styles.manualControls}>
                  <TouchableOpacity
                    style={styles.manualButton}
                    onPress={() =>
                      setCurrentCount((prev) => Math.max(0, prev - 1))
                    }
                  >
                    <Text style={styles.manualButtonText}>-1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.manualButton}
                    onPress={() => setCurrentCount((prev) => prev + 1)}
                  >
                    <Text style={styles.manualButtonText}>+1</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
              <Text style={styles.instructionText}>
                {isTracking
                  ? exerciseType === "planks"
                    ? `⏱️ Hold your plank position!`
                    : `📱 Tap +1 after each rep • ${
                        targetCount - currentCount
                      } more to go!`
                  : `Position yourself in the camera and tap start when ready`}
              </Text>
              {!isTracking && (
                <Text style={styles.aiText}>
                  ✨ AI detection coming in v2.0!
                </Text>
              )}
            </View>
          </SafeAreaView>
        </LinearGradient>
      </CameraView>
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
});

export default ExerciseTrackingScreen;
