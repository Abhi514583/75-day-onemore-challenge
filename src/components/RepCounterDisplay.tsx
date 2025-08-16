import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Svg, {
  Circle,
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

const { width: screenWidth } = Dimensions.get("window");

export interface RepCounterDisplayProps {
  currentReps: number;
  targetReps: number;
  formScore?: number;
  isValidRep?: boolean;
  streak?: number;
  onCounterPress?: () => void;
  showProgress?: boolean;
  showFormScore?: boolean;
  showStreak?: boolean;
  animateOnIncrement?: boolean;
  size?: "small" | "medium" | "large";
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "center";
}

interface MilestoneConfig {
  threshold: number;
  message: string;
  color: string;
  icon: string;
}

export const RepCounterDisplay: React.FC<RepCounterDisplayProps> = ({
  currentReps,
  targetReps,
  formScore = 0,
  isValidRep = true,
  streak = 0,
  onCounterPress,
  showProgress = true,
  showFormScore = true,
  showStreak = true,
  animateOnIncrement = true,
  size = "medium",
  position = "top-right",
}) => {
  const [previousReps, setPreviousReps] = useState(currentReps);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneMessage, setMilestoneMessage] = useState("");

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const milestoneAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const formScoreAnim = useRef(new Animated.Value(0)).current;

  // Milestone configurations
  const milestones: MilestoneConfig[] = [
    { threshold: 5, message: "Great start! 🔥", color: "#FFD700", icon: "🎯" },
    {
      threshold: 10,
      message: "Double digits! 💪",
      color: "#FF6B6B",
      icon: "🚀",
    },
    {
      threshold: 15,
      message: "Halfway there! ⚡",
      color: "#4ECDC4",
      icon: "⭐",
    },
    {
      threshold: 20,
      message: "Strong finish! 🏆",
      color: "#45B7D1",
      icon: "👑",
    },
    { threshold: 25, message: "Beast mode! 🔥", color: "#96CEB4", icon: "💎" },
    { threshold: 30, message: "Incredible! 🎉", color: "#FFEAA7", icon: "🏅" },
  ];

  // Size configurations
  const sizeConfig = {
    small: {
      containerSize: 80,
      fontSize: 24,
      labelSize: 10,
      padding: 12,
      strokeWidth: 4,
    },
    medium: {
      containerSize: 100,
      fontSize: 32,
      labelSize: 12,
      padding: 16,
      strokeWidth: 5,
    },
    large: {
      containerSize: 120,
      fontSize: 40,
      labelSize: 14,
      padding: 20,
      strokeWidth: 6,
    },
  };

  const config = sizeConfig[size];

  // Position styles
  const getPositionStyle = () => {
    const baseStyle = {
      position: "absolute" as const,
      zIndex: 50,
    };

    switch (position) {
      case "top-right":
        return { ...baseStyle, top: 60, right: 20 };
      case "top-left":
        return { ...baseStyle, top: 60, left: 20 };
      case "bottom-right":
        return { ...baseStyle, bottom: 100, right: 20 };
      case "bottom-left":
        return { ...baseStyle, bottom: 100, left: 20 };
      case "center":
        return {
          ...baseStyle,
          top: "50%",
          left: "50%",
          transform: [
            { translateX: -config.containerSize / 2 },
            { translateY: -config.containerSize / 2 },
          ],
        };
      default:
        return { ...baseStyle, top: 60, right: 20 };
    }
  };

  // Animate rep increment
  const animateRepIncrement = () => {
    if (!animateOnIncrement) return;

    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Bounce animation for valid reps
    if (isValidRep) {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Check for milestones
  const checkMilestone = (reps: number) => {
    const milestone = milestones.find((m) => m.threshold === reps);
    if (milestone) {
      setMilestoneMessage(milestone.message);
      setShowMilestone(true);

      // Animate milestone
      Animated.sequence([
        Animated.timing(milestoneAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(milestoneAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowMilestone(false);
      });
    }
  };

  // Update progress animation
  const updateProgressAnimation = () => {
    const progress = Math.min(1, currentReps / targetReps);
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  // Update form score animation
  const updateFormScoreAnimation = () => {
    const normalizedScore = formScore / 100;
    Animated.timing(formScoreAnim, {
      toValue: normalizedScore,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Handle rep changes
  useEffect(() => {
    if (currentReps > previousReps) {
      animateRepIncrement();
      checkMilestone(currentReps);
    }
    setPreviousReps(currentReps);
    updateProgressAnimation();
  }, [currentReps]);

  // Handle form score changes
  useEffect(() => {
    updateFormScoreAnimation();
  }, [formScore]);

  // Get progress color based on completion
  const getProgressColor = () => {
    const progress = currentReps / targetReps;
    if (progress >= 1) return "#00FF88";
    if (progress >= 0.75) return "#FFD700";
    if (progress >= 0.5) return "#FF8C00";
    return "#FF6B6B";
  };

  // Get form score color
  const getFormScoreColor = () => {
    if (formScore >= 90) return "#00FF88";
    if (formScore >= 75) return "#FFD700";
    if (formScore >= 60) return "#FF8C00";
    return "#FF6B6B";
  };

  // Render circular progress
  const renderCircularProgress = () => {
    const radius = (config.containerSize - config.strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = currentReps / targetReps;
    const strokeDashoffset = circumference * (1 - progress);

    return (
      <Svg
        width={config.containerSize}
        height={config.containerSize}
        style={styles.progressSvg}
      >
        <Defs>
          <LinearGradient
            id="progressGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop
              offset="0%"
              stopColor={getProgressColor()}
              stopOpacity="0.8"
            />
            <Stop
              offset="100%"
              stopColor={getProgressColor()}
              stopOpacity="1"
            />
          </LinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={config.containerSize / 2}
          cy={config.containerSize / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={config.strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <Circle
          cx={config.containerSize / 2}
          cy={config.containerSize / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={config.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${config.containerSize / 2} ${
            config.containerSize / 2
          })`}
        />
      </Svg>
    );
  };

  // Render form score indicator
  const renderFormScoreIndicator = () => {
    if (!showFormScore) return null;

    return (
      <View style={styles.formScoreContainer}>
        <View
          style={[
            styles.formScoreBar,
            { backgroundColor: "rgba(255,255,255,0.2)" },
          ]}
        >
          <Animated.View
            style={[
              styles.formScoreFill,
              {
                backgroundColor: getFormScoreColor(),
                width: formScoreAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.formScoreText}>{Math.round(formScore)}%</Text>
      </View>
    );
  };

  // Render streak indicator
  const renderStreakIndicator = () => {
    if (!showStreak || streak === 0) return null;

    return (
      <View style={styles.streakContainer}>
        <Text style={styles.streakIcon}>🔥</Text>
        <Text style={styles.streakText}>{streak}</Text>
      </View>
    );
  };

  // Render milestone celebration
  const renderMilestone = () => {
    if (!showMilestone) return null;

    return (
      <Animated.View
        style={[
          styles.milestoneContainer,
          {
            opacity: milestoneAnim,
            transform: [
              {
                scale: milestoneAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.milestoneText}>{milestoneMessage}</Text>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, getPositionStyle()]}>
      {/* Main counter */}
      <TouchableOpacity
        onPress={onCounterPress}
        activeOpacity={0.8}
        style={[
          styles.counterContainer,
          {
            width: config.containerSize,
            height: config.containerSize,
            padding: config.padding,
          },
        ]}
      >
        {/* Background with progress */}
        {showProgress && renderCircularProgress()}

        {/* Counter content */}
        <Animated.View
          style={[
            styles.counterContent,
            {
              transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
            },
          ]}
        >
          <Text style={[styles.repCount, { fontSize: config.fontSize }]}>
            {currentReps}
          </Text>
          <Text style={[styles.repLabel, { fontSize: config.labelSize }]}>
            / {targetReps}
          </Text>
        </Animated.View>

        {/* Valid rep indicator */}
        {isValidRep && (
          <Animated.View
            style={[
              styles.validRepIndicator,
              {
                opacity: bounceAnim,
                transform: [
                  {
                    scale: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.validRepIcon}>✓</Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Form score indicator */}
      {renderFormScoreIndicator()}

      {/* Streak indicator */}
      {renderStreakIndicator()}

      {/* Milestone celebration */}
      {renderMilestone()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  counterContainer: {
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
  },
  progressSvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  counterContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  repCount: {
    color: "#00FF88",
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  repLabel: {
    color: "#FFFFFF",
    fontWeight: "500",
    opacity: 0.8,
    marginTop: -2,
  },
  validRepIndicator: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "#00FF88",
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00FF88",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  validRepIcon: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  formScoreContainer: {
    marginTop: 8,
    alignItems: "center",
    width: 80,
  },
  formScoreBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  formScoreFill: {
    height: "100%",
    borderRadius: 2,
  },
  formScoreText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    opacity: 0.8,
  },
  streakContainer: {
    position: "absolute",
    top: -15,
    left: -15,
    backgroundColor: "rgba(255,69,0,0.9)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#FF4500",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 5,
  },
  streakIcon: {
    fontSize: 12,
    marginRight: 2,
  },
  streakText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  milestoneContainer: {
    position: "absolute",
    top: -50,
    backgroundColor: "rgba(255,215,0,0.95)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  milestoneText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default RepCounterDisplay;
