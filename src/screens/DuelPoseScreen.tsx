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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Pose Detection Components
import PoseDetectionCamera from "../components/PoseDetectionCamera";
import PoseOverlay from "../components/PoseOverlay";
import FormFeedbackDisplay from "../components/FormFeedbackDisplay";
import RepCounterDisplay from "../components/RepCounterDisplay";

// Services
import {
  DuelPoseService,
  DuelSyncData,
  DuelFormComparison,
} from "../services/DuelPoseService";

// Types
import {
  ExerciseType,
  FormFeedback,
  Pose,
  CalibrationData,
  PoseDetectionSettings,
} from "../types/pose";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface DuelPoseScreenProps {
  exerciseType: ExerciseType;
  targetCount: number;
  duelId: string;
  localPlayerId: string;
  localPlayerName: string;
  opponentId: string;
  opponentName: string;
  onComplete: (results: any) => void;
  onBack: () => void;
  onSyncData?: (data: DuelSyncData) => void;
  onReceiveData?: (callback: (data: DuelSyncData) => void) => void;
}

export const DuelPoseScreen: React.FC<DuelPoseScreenProps> = ({
  exerciseType,
  targetCount,
  duelId,
  localPlayerId,
  localPlayerName,
  opponentId,
  opponentName,
  onComplete,
  onBack,
  onSyncData,
  onReceiveData,
}) => {
  // Core state
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Pose detection state
  const [currentPoses, setCurrentPoses] = useState<Pose[]>([]);
  const [formFeedback, setFormFeedback] = useState<FormFeedback[]>([]);
  const [frameRate, setFrameRate] = useState(30);

  // Duel state
  const [localStats, setLocalStats] = useState({
    repCount: 0,
    formScore: 0,
    streak: 0,
  });
  const [opponentStats, setOpponentStats] = useState({
    repCount: 0,
    formScore: 0,
    streak: 0,
  });
  const [comparison, setComparison] = useState<DuelFormComparison | null>(null);
  const [encouragement, setEncouragement] = useState<string>("");

  // Services
  const duelService = useRef<DuelPoseService | null>(null);

  // Animations
  const countAnim = useRef(new Animated.Value(1)).current;
  const comparisonAnim = useRef(new Animated.Value(0)).current;
  const encouragementAnim = useRef(new Animated.Value(0)).current;

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

  // Initialize duel service
  useEffect(() => {
    const handleSyncData = (data: DuelSyncData) => {
      if (onSyncData) {
        onSyncData(data);
      }
    };

    const handleComparison = (comp: DuelFormComparison) => {
      setComparison(comp);

      // Update local stats
      const localParticipant =
        comp.participant1.id === localPlayerId
          ? comp.participant1
          : comp.participant2;
      const opponentParticipant =
        comp.participant1.id === localPlayerId
          ? comp.participant2
          : comp.participant1;

      setLocalStats({
        repCount: localParticipant.repCount,
        formScore: localParticipant.formScore,
        streak: localParticipant.streak,
      });

      setOpponentStats({
        repCount: opponentParticipant.repCount,
        formScore: opponentParticipant.formScore,
        streak: opponentParticipant.streak,
      });

      // Show encouragement
      setEncouragement(comp.encouragement);
      showEncouragement();
    };

    duelService.current = new DuelPoseService(
      exerciseType,
      handleSyncData,
      handleComparison
    );

    return () => {
      if (duelService.current) {
        duelService.current.cleanup();
      }
    };
  }, [exerciseType, localPlayerId, onSyncData]);

  // Set up data receiving
  useEffect(() => {
    if (onReceiveData && duelService.current) {
      onReceiveData((data: DuelSyncData) => {
        duelService.current?.receiveSyncData(data);
      });
    }
  }, [onReceiveData]);

  // Add participants
  useEffect(() => {
    const setupParticipants = async () => {
      if (!duelService.current) return;

      try {
        // Add local participant
        await duelService.current.addParticipant(
          localPlayerId,
          localPlayerName,
          true
        );

        // Add opponent
        await duelService.current.addParticipant(
          opponentId,
          opponentName,
          false
        );

        console.log("Participants added to duel");
      } catch (error) {
        console.error("Error setting up participants:", error);
      }
    };

    setupParticipants();
  }, [localPlayerId, localPlayerName, opponentId, opponentName]);

  // Start calibration
  const startCalibration = useCallback(async () => {
    if (!duelService.current) return;

    try {
      setIsCalibrating(true);
      await duelService.current.startCalibration();
      setIsCalibrating(false);
      setIsReady(true);
    } catch (error) {
      console.error("Calibration error:", error);
      setIsCalibrating(false);
      Alert.alert(
        "Calibration Failed",
        "Please try again or continue without calibration"
      );
      setIsReady(true);
    }
  }, []);

  // Start duel
  const startDuel = useCallback(async () => {
    if (!duelService.current) return;

    try {
      setIsActive(true);
      startTimeRef.current = Date.now();

      await duelService.current.startDuel();

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - (startTimeRef.current || 0)) / 1000
        );
        setTimeElapsed(elapsed);

        // For planks, count time as reps
        if (exerciseType === "planks") {
          setLocalStats((prev) => ({ ...prev, repCount: elapsed }));
        }
      }, 1000);

      console.log("Duel started");
    } catch (error) {
      console.error("Error starting duel:", error);
      Alert.alert("Error", "Failed to start duel");
    }
  }, [exerciseType]);

  // Handle pose detection frame
  const handlePoseFrame = useCallback(
    (poses: Pose[], frameRate: number) => {
      if (!isActive || !duelService.current) return;

      setCurrentPoses(poses);
      setFrameRate(frameRate);

      if (poses.length > 0) {
        // Process frame with duel service
        duelService.current.processPoseFrame(localPlayerId, poses, frameRate);

        // Get feedback from local participant's form tracker
        const localParticipant =
          duelService.current.getParticipant(localPlayerId);
        if (localParticipant) {
          const feedback = localParticipant.formTracker.getCurrentFeedback();
          setFormFeedback(feedback);
        }
      }
    },
    [isActive, localPlayerId]
  );

  // Handle duel completion
  const handleDuelComplete = useCallback(async () => {
    if (!duelService.current) return;

    try {
      setIsCompleted(true);
      setIsActive(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // End duel and get results
      const results = await duelService.current.endDuel();

      // Vibration feedback
      Vibration.vibrate([0, 100, 50, 100]);

      // Show completion celebration
      setTimeout(() => {
        showDuelResults(results);
      }, 800);
    } catch (error) {
      console.error("Error completing duel:", error);
    }
  }, []);

  // Show duel results
  const showDuelResults = (results: any) => {
    const localResult = results[localPlayerId];
    const opponentResult = results[opponentId];

    const localReps = localStats.repCount;
    const opponentReps = opponentStats.repCount;
    const localFormScore = localStats.formScore;
    const opponentFormScore = opponentStats.formScore;

    let winner = "Tie!";
    let winMessage = "Great effort from both players! 🤝";

    if (
      localReps > opponentReps ||
      (localReps === opponentReps && localFormScore > opponentFormScore)
    ) {
      winner = "You Win!";
      winMessage = "Congratulations! Your form and consistency paid off! 🏆";
    } else if (
      opponentReps > localReps ||
      (opponentReps === localReps && opponentFormScore > localFormScore)
    ) {
      winner = `${opponentName} Wins!`;
      winMessage =
        "Good effort! Keep practicing and you'll get them next time! 💪";
    }

    Alert.alert(
      `🥊 Duel Complete - ${winner}`,
      `${winMessage}\n\n` +
        `Your Stats:\n` +
        `• Reps: ${localReps}\n` +
        `• Form Score: ${Math.round(localFormScore)}%\n\n` +
        `${opponentName}'s Stats:\n` +
        `• Reps: ${opponentReps}\n` +
        `• Form Score: ${Math.round(opponentFormScore)}%\n\n` +
        `Duration: ${formatTime(timeElapsed)}`,
      [
        {
          text: "🚀 Continue",
          onPress: () => {
            onComplete({
              winner: winner.includes("You")
                ? localPlayerId
                : winner.includes(opponentName)
                ? opponentId
                : "tie",
              localStats,
              opponentStats,
              duration: timeElapsed,
              results,
            });
          },
        },
      ]
    );
  };

  // Show encouragement animation
  const showEncouragement = () => {
    Animated.sequence([
      Animated.timing(encouragementAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(encouragementAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Check for completion
  useEffect(() => {
    if (
      isActive &&
      (localStats.repCount >= targetCount ||
        opponentStats.repCount >= targetCount)
    ) {
      handleDuelComplete();
    }
  }, [
    localStats.repCount,
    opponentStats.repCount,
    targetCount,
    isActive,
    handleDuelComplete,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Camera/Pose Detection Layer */}
      <PoseDetectionCamera
        exerciseType={exerciseType}
        onPoseDetected={handlePoseFrame}
        onError={(error) => console.error("Camera error:", error)}
        isActive={isActive}
      />

      {/* Pose Overlay */}
      <PoseOverlay
        poses={currentPoses}
        formFeedback={formFeedback[0] || null}
        repCount={localStats.repCount}
        targetCount={targetCount}
        showSkeleton={true}
        exerciseType={exerciseType}
        renderMode="minimal" // Use minimal for better performance in duels
        frameRate={frameRate}
        isCalibrating={isCalibrating}
      />

      {/* UI Overlay */}
      <LinearGradient
        colors={["rgba(0,0,0,0.8)", "transparent", "rgba(0,0,0,0.8)"]}
        style={styles.overlay}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            <View style={styles.duelHeader}>
              <Text style={styles.duelTitle}>🥊 DUEL</Text>
              <Text style={styles.exerciseName}>{info.name}</Text>
            </View>

            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
            </View>
          </View>

          {/* Duel Comparison */}
          <View style={styles.comparisonContainer}>
            {/* Local Player */}
            <View style={styles.playerContainer}>
              <Text style={styles.playerName}>{localPlayerName}</Text>
              <RepCounterDisplay
                currentReps={localStats.repCount}
                targetReps={targetCount}
                formScore={localStats.formScore}
                streak={localStats.streak}
                size="medium"
                position="center"
                showProgress={true}
                showFormScore={true}
                showStreak={true}
              />
            </View>

            {/* VS Indicator */}
            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
              <View style={styles.progressComparison}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(
                        100,
                        (localStats.repCount / targetCount) * 100
                      )}%`,
                      backgroundColor: info.color,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.progressBar,
                    styles.opponentProgress,
                    {
                      width: `${Math.min(
                        100,
                        (opponentStats.repCount / targetCount) * 100
                      )}%`,
                      backgroundColor: "#FF8C42",
                    },
                  ]}
                />
              </View>
            </View>

            {/* Opponent */}
            <View style={styles.playerContainer}>
              <Text style={styles.playerName}>{opponentName}</Text>
              <RepCounterDisplay
                currentReps={opponentStats.repCount}
                targetReps={targetCount}
                formScore={opponentStats.formScore}
                streak={opponentStats.streak}
                size="medium"
                position="center"
                showProgress={true}
                showFormScore={true}
                showStreak={true}
              />
            </View>
          </View>

          {/* Form Feedback */}
          {formFeedback.length > 0 && (
            <FormFeedbackDisplay
              feedback={formFeedback}
              maxVisible={1}
              colorBlindFriendly={false}
              showSuggestions={false}
              compactMode={true}
            />
          )}

          {/* Encouragement */}
          {encouragement && (
            <Animated.View
              style={[
                styles.encouragementContainer,
                {
                  opacity: encouragementAnim,
                  transform: [
                    {
                      scale: encouragementAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.encouragementText}>{encouragement}</Text>
            </Animated.View>
          )}

          {/* Controls */}
          <View style={styles.controls}>
            {!isReady && !isCalibrating ? (
              <TouchableOpacity
                style={[
                  styles.calibrateButton,
                  { backgroundColor: info.color },
                ]}
                onPress={startCalibration}
              >
                <Text style={styles.calibrateButtonText}>
                  📐 Calibrate & Ready Up
                </Text>
              </TouchableOpacity>
            ) : isCalibrating ? (
              <View style={styles.calibratingContainer}>
                <Text style={styles.calibratingText}>📐 Calibrating...</Text>
                <Text style={styles.calibratingSubtext}>
                  Position yourself in the frame
                </Text>
              </View>
            ) : isReady && !isActive && !isCompleted ? (
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: info.color }]}
                onPress={startDuel}
              >
                <Text style={styles.startButtonText}>🚀 Start Duel!</Text>
              </TouchableOpacity>
            ) : isCompleted ? (
              <TouchableOpacity
                style={[styles.completeButton, { backgroundColor: "#4CAF50" }]}
                onPress={() => onComplete({})}
              >
                <Text style={styles.completeButtonText}>✅ View Results</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {isCompleted
                ? `🎉 Duel completed! Check the results above.`
                : !isReady
                ? `Calibrate your camera position for fair competition`
                : !isActive
                ? `Both players ready! Tap start when you're both prepared.`
                : `🤖 AI is tracking both players • First to ${targetCount} wins!`}
            </Text>

            {/* Status indicators */}
            {isActive && (
              <View style={styles.statusContainer}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Your Form</Text>
                  <Text
                    style={[
                      styles.statusValue,
                      {
                        color:
                          localStats.formScore >= 80
                            ? "#00FF88"
                            : localStats.formScore >= 60
                            ? "#FFD700"
                            : "#FF6B6B",
                      },
                    ]}
                  >
                    {Math.round(localStats.formScore)}%
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
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Opponent Form</Text>
                  <Text
                    style={[
                      styles.statusValue,
                      {
                        color:
                          opponentStats.formScore >= 80
                            ? "#00FF88"
                            : opponentStats.formScore >= 60
                            ? "#FFD700"
                            : "#FF6B6B",
                      },
                    ]}
                  >
                    {Math.round(opponentStats.formScore)}%
                  </Text>
                </View>
              </View>
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
  duelHeader: {
    alignItems: "center",
  },
  duelTitle: {
    color: "#FF6B6B",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
  },
  exerciseName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  timerContainer: {
    alignItems: "center",
  },
  timerText: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "700",
  },
  comparisonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  playerContainer: {
    alignItems: "center",
    flex: 1,
  },
  playerName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  vsContainer: {
    alignItems: "center",
    marginHorizontal: 20,
  },
  vsText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },
  progressComparison: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  progressBar: {
    position: "absolute",
    height: "50%",
    borderRadius: 15,
  },
  opponentProgress: {
    bottom: 0,
  },
  encouragementContainer: {
    position: "absolute",
    top: "40%",
    left: 20,
    right: 20,
    alignItems: "center",
    backgroundColor: "rgba(255,215,0,0.95)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  encouragementText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
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
    paddingVertical: 16,
    borderRadius: 25,
  },
  calibrateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  calibratingContainer: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 25,
  },
  calibratingText: {
    color: "#00FF88",
    fontSize: 16,
    fontWeight: "700",
  },
  calibratingSubtext: {
    color: "#ffffff",
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  startButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
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
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
});

export default DuelPoseScreen;
