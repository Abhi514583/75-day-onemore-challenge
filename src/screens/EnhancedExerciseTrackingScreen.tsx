import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Alert,
  Vibration,
  Modal,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { completeExercise } from "../store/slices/challengeSlice";
import { updatePersonalBest, awardXP } from "../store/slices/userSlice";
import useDuel from "../hooks/useDuel";
import useDataSync from "../hooks/useDataSync";
import { Duel as FirebaseDuel } from "../types/firebase";

interface ExerciseTrackingProps {
  exerciseType: "pushups" | "squats" | "situps" | "planks";
  targetCount: number;
  onComplete: (score: number, duration: number) => void;
  onBack: () => void;
  mode?: "challenge" | "duel" | "pb";
  duel?: FirebaseDuel; // Changed from duelId to full duel object
  opponentName?: string;
}

const EnhancedExerciseTrackingScreen: React.FC<ExerciseTrackingProps> = ({
  exerciseType,
  targetCount,
  onComplete,
  onBack,
  mode = "challenge",
  duel,
  opponentName,
}) => {
  const dispatch = useAppDispatch();
  const { personalBests } = useAppSelector((state) => state.user);
  const { submitScore } = useDuel();
  const { queueAttemptSync, queuePersonalBestSync } = useDataSync();

  const [currentCount, setCurrentCount] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCount, setManualCount] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Start pulse animation for duel mode
    if (mode === "duel") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [mode]);

  const getExerciseInfo = () => {
    const exercises = {
      pushups: { name: "Push-ups", emoji: "💪", color: COLORS.ACCENT.PRIMARY },
      squats: { name: "Squats", emoji: "🦵", color: COLORS.ACCENT.SECONDARY },
      situps: { name: "Sit-ups", emoji: "🔥", color: COLORS.ACCENT.WARNING },
      planks: { name: "Plank", emoji: "⏱️", color: COLORS.STATUS.COMPLETED },
    };
    return exercises[exerciseType];
  };

  const getModeInfo = () => {
    switch (mode) {
      case "challenge":
        return {
          title: "Daily Challenge",
          subtitle: `Target: ${targetCount} ${
            exerciseType === "planks" ? "seconds" : "reps"
          }`,
          color: COLORS.ACCENT.PRIMARY,
        };
      case "duel":
        return {
          title: "⚔️ DUEL MODE",
          subtitle: `vs ${opponentName} • One set only!`,
          color: COLORS.ACCENT.ERROR,
        };
      case "pb":
        return {
          title: "🏆 Personal Best Attempt",
          subtitle: `Current PB: ${personalBests?.[exerciseType] || 0} ${
            exerciseType === "planks" ? "seconds" : "reps"
          }`,
          color: COLORS.STATUS.COMPLETED,
        };
    }
  };

  const handleStart = () => {
    setIsTracking(true);
    setStartTime(Date.now());
    console.log(`📱 ${getModeInfo().title} started for ${exerciseType}`);
  };

  const handleStop = () => {
    setIsTracking(false);
    setEndTime(Date.now());

    if (mode === "challenge" && currentCount < targetCount * 0.7) {
      // For challenge mode, offer assistance if under 70%
      Alert.alert(
        "Need Help?",
        `You're at ${currentCount}/${targetCount}. Would you like to lighten today's target by 10%?`,
        [
          { text: "Keep Going", style: "cancel" },
          {
            text: "Lighten Target",
            onPress: () => {
              const newTarget = Math.floor(targetCount * 0.9);
              Alert.alert(
                "Target Reduced!",
                `New target: ${newTarget} ${
                  exerciseType === "planks" ? "seconds" : "reps"
                }`
              );
            },
          },
        ]
      );
    } else {
      setShowManualInput(true);
    }
  };

  const handleChallengeSubmission = async (score: number, duration: number) => {
    try {
      // Update Redux state
      dispatch(
        completeExercise({
          exerciseType,
          actualCount: score,
        })
      );
      dispatch(awardXP(10)); // Base XP for completing exercise

      // Queue for sync
      await queueAttemptSync({
        exercise: exerciseType,
        mode: "challenge",
        score,
        sets: [score], // Single set for challenge
        isPB: score > (personalBests?.[exerciseType] || 0),
        notes: proofNote.trim() || undefined,
      });

      // Check if it's a new PB
      if (score > (personalBests?.[exerciseType] || 0)) {
        await queuePersonalBestSync({
          exercise: exerciseType,
          value: score,
          source: "manual",
        });

        dispatch(
          updatePersonalBest({
            exercise: exerciseType,
            value: score,
          })
        );
      }

      setIsCompleted(true);
      Vibration.vibrate([0, 100, 100, 100]);

      setTimeout(() => {
        onComplete(score, duration);
      }, 1500);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to save challenge progress"
      );
    }
  };

  const handlePBSubmission = async (score: number, duration: number) => {
    try {
      const currentPB = personalBests?.[exerciseType] || 0;

      // Queue attempt for sync
      await queueAttemptSync({
        exercise: exerciseType,
        mode: "pb",
        score,
        isPB: score > currentPB,
        notes: proofNote.trim() || undefined,
      });

      if (score > currentPB) {
        // New PB!
        await queuePersonalBestSync({
          exercise: exerciseType,
          value: score,
          source: "manual",
        });

        dispatch(
          updatePersonalBest({
            exercise: exerciseType,
            value: score,
          })
        );

        Alert.alert(
          "New Personal Best!",
          `${score} ${
            exerciseType === "planks" ? "seconds" : "reps"
          } - Amazing!`
        );
      } else {
        Alert.alert(
          "Good Effort!",
          `You scored ${score}, but didn't beat your PB of ${currentPB}.`
        );
      }

      setIsCompleted(true);
      Vibration.vibrate([0, 100, 100, 100]);

      setTimeout(() => {
        onComplete(score, duration);
      }, 1500);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save personal best");
    }
  };

  const handleDuelSubmission = async (score: number, duration: number) => {
    if (!duel) return;

    setIsSubmitting(true);

    try {
      // Submit score to Firebase duel
      const result = await submitScore(duel.id, score);

      if (result.success) {
        // Queue attempt for sync
        await queueAttemptSync({
          exercise: exerciseType,
          mode: "duel",
          score,
          isPB: score > (personalBests?.[exerciseType] || 0),
          notes: proofNote.trim() || undefined,
        });

        // Check if it's a new PB
        if (score > (personalBests?.[exerciseType] || 0)) {
          await queuePersonalBestSync({
            exercise: exerciseType,
            value: score,
            source: "duel",
          });

          dispatch(
            updatePersonalBest({
              exercise: exerciseType,
              value: score,
            })
          );
        }

        Alert.alert(
          "Score Submitted!",
          `Your score of ${score} ${
            exerciseType === "planks" ? "seconds" : "reps"
          } has been submitted to the duel.`,
          [
            {
              text: "OK",
              onPress: () => {
                setIsCompleted(true);
                Vibration.vibrate([0, 100, 100, 100]);

                setTimeout(() => {
                  onComplete(score, duration);
                }, 1500);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Submission Failed",
          result.error || "Failed to submit score to duel"
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit duel score");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitScore = () => {
    const finalScore = parseInt(manualCount) || currentCount;
    const duration = endTime && startTime ? endTime - startTime : 0;

    if (finalScore <= 0) {
      Alert.alert("Invalid Score", "Please enter a valid score");
      return;
    }

    // Handle different modes
    switch (mode) {
      case "challenge":
        handleChallengeSubmission(finalScore, duration);
        break;

      case "pb":
        handlePBSubmission(finalScore, duration);
        break;

      case "duel":
        if (duel) {
          handleDuelSubmission(finalScore, duration);
        }
        break;
    }

    setIsCompleted(true);
    Vibration.vibrate([0, 100, 100, 100]);

    // Complete after short delay
    setTimeout(() => {
      onComplete(finalScore, duration);
    }, 1500);
  };

  const info = getExerciseInfo();
  const modeInfo = getModeInfo();

  return (
    <LinearGradient
      colors={COLORS.BACKGROUND.PRIMARY}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <View style={styles.modeIndicator}>
              <Text style={[styles.modeTitle, { color: modeInfo.color }]}>
                {modeInfo.title}
              </Text>
              <Text style={styles.modeSubtitle}>{modeInfo.subtitle}</Text>
            </View>
          </View>

          {/* Exercise Display */}
          <Animated.View
            style={[
              styles.exerciseDisplay,
              mode === "duel" && { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={styles.exerciseEmoji}>{info.emoji}</Text>
            <Text style={styles.exerciseName}>{info.name}</Text>

            {/* Counter */}
            <View style={styles.counterContainer}>
              <Text style={styles.counterValue}>{currentCount}</Text>
              <Text style={styles.counterUnit}>
                {exerciseType === "planks" ? "seconds" : "reps"}
              </Text>
            </View>

            {/* Progress for Challenge Mode */}
            {mode === "challenge" && targetCount > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          (currentCount / targetCount) * 100,
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {currentCount} / {targetCount} (
                  {Math.round((currentCount / targetCount) * 100)}%)
                </Text>
              </View>
            )}

            {/* PB Indicator */}
            {mode === "pb" && (
              <View style={styles.pbIndicator}>
                <Text style={styles.pbText}>
                  Beat: {personalBests?.[exerciseType] || 0}{" "}
                  {exerciseType === "planks" ? "seconds" : "reps"}
                </Text>
                {currentCount > (personalBests?.[exerciseType] || 0) && (
                  <Text style={styles.newPbText}>🎉 NEW PERSONAL BEST!</Text>
                )}
              </View>
            )}
          </Animated.View>

          {/* Controls */}
          <View style={styles.controls}>
            {!isTracking && !isCompleted && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStart}
              >
                <LinearGradient
                  colors={[modeInfo.color, COLORS.UI.BUTTON_SECONDARY]}
                  style={styles.startButtonGradient}
                >
                  <Text style={styles.startButtonText}>
                    {mode === "duel" ? "⚔️ Start Duel" : "🚀 Start"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {isTracking && (
              <View style={styles.trackingControls}>
                <TouchableOpacity
                  style={styles.countButton}
                  onPress={() => setCurrentCount((c) => c + 1)}
                >
                  <Text style={styles.countButtonText}>+1</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={handleStop}
                >
                  <Text style={styles.stopButtonText}>Stop & Submit</Text>
                </TouchableOpacity>
              </View>
            )}

            {isCompleted && (
              <View style={styles.completedContainer}>
                <Text style={styles.completedText}>✅ Completed!</Text>
                <Text style={styles.completedSubtext}>Great work!</Text>
              </View>
            )}
          </View>

          {/* Manual Input Modal */}
          <Modal
            visible={showManualInput}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowManualInput(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Confirm Your Score</Text>
                <Text style={styles.modalSubtitle}>
                  Enter your final count for {info.name}
                </Text>

                <TextInput
                  style={styles.modalInput}
                  value={manualCount}
                  onChangeText={setManualCount}
                  placeholder={currentCount.toString()}
                  keyboardType="numeric"
                  autoFocus={true}
                />

                {mode === "duel" && (
                  <TextInput
                    style={styles.modalTextArea}
                    value={proofNote}
                    onChangeText={setProofNote}
                    placeholder="Optional: Add a note about your performance..."
                    multiline={true}
                    numberOfLines={3}
                  />
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowManualInput(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalSubmitButton,
                      isSubmitting && styles.buttonDisabled,
                    ]}
                    onPress={submitScore}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.modalSubmitText}>
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </Animated.View>
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
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  backButton: {
    alignSelf: "flex-start",
    padding: 10,
    marginBottom: 20,
  },
  backButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  modeIndicator: {
    alignItems: "center",
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  modeSubtitle: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    textAlign: "center",
  },
  exerciseDisplay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 40,
  },
  exerciseEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  exerciseName: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
  },
  counterContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  counterValue: {
    color: COLORS.ACCENT.PRIMARY,
    fontSize: 72,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  counterUnit: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 18,
    marginTop: 5,
  },
  progressContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  progressBar: {
    width: "80%",
    height: 8,
    backgroundColor: COLORS.UI.BORDER,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.ACCENT.PRIMARY,
    borderRadius: 4,
  },
  progressText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 14,
  },
  pbIndicator: {
    alignItems: "center",
    marginTop: 20,
  },
  pbText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    marginBottom: 10,
  },
  newPbText: {
    color: COLORS.STATUS.COMPLETED,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  controls: {
    paddingBottom: 40,
  },
  startButton: {
    borderRadius: 25,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  startButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 20,
    fontWeight: "bold",
  },
  trackingControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },
  countButton: {
    flex: 1,
    backgroundColor: COLORS.ACCENT.PRIMARY,
    paddingVertical: 20,
    borderRadius: 15,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  countButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 24,
    fontWeight: "bold",
  },
  stopButton: {
    flex: 1,
    backgroundColor: COLORS.ACCENT.ERROR,
    paddingVertical: 20,
    borderRadius: 15,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  stopButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: "bold",
  },
  completedContainer: {
    alignItems: "center",
    padding: 20,
  },
  completedText: {
    color: COLORS.STATUS.COMPLETED,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  completedSubtext: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.UI.CARD_BACKGROUND,
    borderRadius: 20,
    padding: 30,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalTitle: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    marginBottom: 25,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: COLORS.UI.INPUT_BACKGROUND,
    borderColor: COLORS.UI.BORDER,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    color: COLORS.TEXT.PRIMARY,
    width: "100%",
    textAlign: "center",
    marginBottom: 20,
  },
  modalTextArea: {
    backgroundColor: COLORS.UI.INPUT_BACKGROUND,
    borderColor: COLORS.UI.BORDER,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: COLORS.TEXT.PRIMARY,
    width: "100%",
    height: 80,
    textAlignVertical: "top",
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 15,
    width: "100%",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    fontWeight: "600",
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: COLORS.ACCENT.PRIMARY,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  modalSubmitText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default EnhancedExerciseTrackingScreen;
