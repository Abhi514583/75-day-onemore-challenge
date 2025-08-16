import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
} from "react-native";
import { COLORS } from "../config/colors";
import { ExerciseType, RepData } from "../types/pose";

interface ManualCountingFallbackProps {
  exerciseType: ExerciseType;
  targetCount: number;
  onRepCompleted: (repData: RepData) => void;
  onComplete: () => void;
  isActive: boolean;
}

export const ManualCountingFallback: React.FC<ManualCountingFallbackProps> = ({
  exerciseType,
  targetCount,
  onRepCompleted,
  onComplete,
  isActive,
}) => {
  const [currentCount, setCurrentCount] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [lastRepTime, setLastRepTime] = useState(Date.now());

  // Animation values
  const scaleAnim = new Animated.Value(1);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (currentCount >= targetCount && targetCount > 0) {
      onComplete();
    }
  }, [currentCount, targetCount, onComplete]);

  const handleRepPress = () => {
    if (!isActive) return;

    const now = Date.now();
    const repDuration = now - lastRepTime;

    // Create rep data
    const repData: RepData = {
      count: currentCount + 1,
      timestamp: now,
      formScore: 85, // Default score for manual counting
      duration: repDuration,
      phase: "up",
      exerciseType,
      confidence: 1.0, // Manual counting is always confident
    };

    // Update count
    setCurrentCount((prev) => prev + 1);
    setLastRepTime(now);

    // Trigger callbacks
    onRepCompleted(repData);

    // Haptic feedback
    Vibration.vibrate(50);

    // Button animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for milestone reps
    if ((currentCount + 1) % 5 === 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const getProgressPercentage = () => {
    if (targetCount === 0) return 0;
    return Math.min((currentCount / targetCount) * 100, 100);
  };

  const getEncouragementMessage = () => {
    const percentage = getProgressPercentage();

    if (percentage === 0) {
      return "Tap to count each rep!";
    } else if (percentage < 25) {
      return "Great start! Keep going!";
    } else if (percentage < 50) {
      return "You're doing awesome!";
    } else if (percentage < 75) {
      return "More than halfway there!";
    } else if (percentage < 100) {
      return "Almost done! Push through!";
    } else {
      return "Incredible work! 🎉";
    }
  };

  const formatExerciseName = (exercise: ExerciseType): string => {
    const names: Record<ExerciseType, string> = {
      pushups: "Push-ups",
      squats: "Squats",
      planks: "Plank Hold",
      situps: "Sit-ups",
      burpees: "Burpees",
      lunges: "Lunges",
      "mountain-climbers": "Mountain Climbers",
      "jumping-jacks": "Jumping Jacks",
    };
    return names[exercise] || exercise;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.exerciseTitle}>
          {formatExerciseName(exerciseType)}
        </Text>
        <Text style={styles.modeIndicator}>📱 Manual Counting Mode</Text>
      </View>

      {/* Progress Ring */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[styles.progressRing, { transform: [{ scale: pulseAnim }] }]}
        >
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  transform: [
                    {
                      rotate: `${(getProgressPercentage() / 100) * 360}deg`,
                    },
                  ],
                },
              ]}
            />
          </View>

          {/* Count Display */}
          <View style={styles.countContainer}>
            <Text style={styles.currentCount}>{currentCount}</Text>
            {targetCount > 0 && (
              <Text style={styles.targetCount}>/ {targetCount}</Text>
            )}
          </View>
        </Animated.View>
      </View>

      {/* Encouragement Message */}
      <Text style={styles.encouragementText}>{getEncouragementMessage()}</Text>

      {/* Manual Count Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.countButton,
            isPressed && styles.countButtonPressed,
            !isActive && styles.countButtonDisabled,
          ]}
          onPress={handleRepPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!isActive}
          activeOpacity={0.8}
        >
          <Text style={styles.countButtonText}>
            {exerciseType === "planks" ? "Hold Complete" : "Rep Complete"}
          </Text>
          <Text style={styles.countButtonSubtext}>
            Tap when you finish a rep
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Manual Counting Tips:</Text>
        <Text style={styles.instructionText}>
          • Tap the button after completing each rep
        </Text>
        <Text style={styles.instructionText}>
          • Focus on proper form over speed
        </Text>
        <Text style={styles.instructionText}>
          • Take breaks if needed - your progress is saved
        </Text>
        {exerciseType === "planks" && (
          <Text style={styles.instructionText}>
            • Tap when you complete your hold time
          </Text>
        )}
      </View>

      {/* Fallback Reason */}
      <View style={styles.fallbackInfo}>
        <Text style={styles.fallbackText}>
          💡 Using manual mode because pose detection is unavailable
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.BACKGROUND.PRIMARY[0],
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  exerciseTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  modeIndicator: {
    fontSize: 16,
    color: COLORS.TEXT.TERTIARY,
    fontStyle: "italic",
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  progressRing: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  progressBackground: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  progressFill: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: COLORS.UI.BUTTON_PRIMARY,
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  countContainer: {
    alignItems: "center",
  },
  currentCount: {
    fontSize: 48,
    fontWeight: "900",
    color: COLORS.TEXT.PRIMARY,
  },
  targetCount: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.TEXT.SECONDARY,
    marginTop: -8,
  },
  encouragementText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
    marginBottom: 40,
  },
  countButton: {
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  countButtonPressed: {
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
  },
  countButtonDisabled: {
    backgroundColor: COLORS.BACKGROUND.CARD_BORDER,
    opacity: 0.5,
  },
  countButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  countButtonSubtext: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
  },
  instructionsContainer: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: "100%",
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 6,
    lineHeight: 20,
  },
  fallbackInfo: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.UI.BUTTON_PRIMARY,
  },
  fallbackText: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "center",
    fontStyle: "italic",
  },
});
