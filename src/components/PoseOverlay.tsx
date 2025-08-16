import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions, Text } from "react-native";
import Svg, {
  Circle,
  Line,
  G,
  Defs,
  LinearGradient,
  Stop,
  Path,
  Ellipse,
} from "react-native-svg";
import { Pose, LandmarkType, FormFeedback, ExerciseType } from "../types/pose";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export interface PoseOverlayProps {
  poses: Pose[];
  formFeedback: FormFeedback | null;
  repCount: number;
  targetCount: number;
  showSkeleton: boolean;
  exerciseType: ExerciseType;
  renderMode: "full" | "minimal" | "markers-only";
  frameRate?: number;
  isCalibrating?: boolean;
  calibrationProgress?: number;
}

interface SkeletonConnection {
  from: LandmarkType;
  to: LandmarkType;
  color: string;
  width: number;
  priority: number; // Higher priority connections shown in minimal mode
}

export const PoseOverlay: React.FC<PoseOverlayProps> = ({
  poses,
  formFeedback,
  repCount,
  targetCount,
  showSkeleton,
  exerciseType,
  renderMode,
  frameRate = 30,
  isCalibrating = false,
  calibrationProgress = 0,
}) => {
  // Define skeleton connections with priorities
  const skeletonConnections: SkeletonConnection[] = useMemo(
    () => [
      // High priority - core body structure (shown in minimal mode)
      {
        from: LandmarkType.LEFT_SHOULDER,
        to: LandmarkType.RIGHT_SHOULDER,
        color: "#00FF88",
        width: 3,
        priority: 10,
      },
      {
        from: LandmarkType.LEFT_HIP,
        to: LandmarkType.RIGHT_HIP,
        color: "#00FF88",
        width: 3,
        priority: 10,
      },
      {
        from: LandmarkType.LEFT_SHOULDER,
        to: LandmarkType.LEFT_HIP,
        color: "#00FF88",
        width: 3,
        priority: 9,
      },
      {
        from: LandmarkType.RIGHT_SHOULDER,
        to: LandmarkType.RIGHT_HIP,
        color: "#00FF88",
        width: 3,
        priority: 9,
      },

      // Medium priority - arms and legs
      {
        from: LandmarkType.LEFT_SHOULDER,
        to: LandmarkType.LEFT_ELBOW,
        color: "#FFD700",
        width: 2.5,
        priority: 8,
      },
      {
        from: LandmarkType.LEFT_ELBOW,
        to: LandmarkType.LEFT_WRIST,
        color: "#FFD700",
        width: 2.5,
        priority: 8,
      },
      {
        from: LandmarkType.RIGHT_SHOULDER,
        to: LandmarkType.RIGHT_ELBOW,
        color: "#FFD700",
        width: 2.5,
        priority: 8,
      },
      {
        from: LandmarkType.RIGHT_ELBOW,
        to: LandmarkType.RIGHT_WRIST,
        color: "#FFD700",
        width: 2.5,
        priority: 8,
      },
      {
        from: LandmarkType.LEFT_HIP,
        to: LandmarkType.LEFT_KNEE,
        color: "#FF6B6B",
        width: 2.5,
        priority: 7,
      },
      {
        from: LandmarkType.LEFT_KNEE,
        to: LandmarkType.LEFT_ANKLE,
        color: "#FF6B6B",
        width: 2.5,
        priority: 7,
      },
      {
        from: LandmarkType.RIGHT_HIP,
        to: LandmarkType.RIGHT_KNEE,
        color: "#FF6B6B",
        width: 2.5,
        priority: 7,
      },
      {
        from: LandmarkType.RIGHT_KNEE,
        to: LandmarkType.RIGHT_ANKLE,
        color: "#FF6B6B",
        width: 2.5,
        priority: 7,
      },

      // Low priority - head and detailed features (only in full mode)
      {
        from: LandmarkType.NOSE,
        to: LandmarkType.LEFT_EAR,
        color: "#87CEEB",
        width: 2,
        priority: 5,
      },
      {
        from: LandmarkType.NOSE,
        to: LandmarkType.RIGHT_EAR,
        color: "#87CEEB",
        width: 2,
        priority: 5,
      },
      {
        from: LandmarkType.LEFT_SHOULDER,
        to: LandmarkType.LEFT_EAR,
        color: "#87CEEB",
        width: 2,
        priority: 4,
      },
      {
        from: LandmarkType.RIGHT_SHOULDER,
        to: LandmarkType.RIGHT_EAR,
        color: "#87CEEB",
        width: 2,
        priority: 4,
      },
    ],
    []
  );

  // Get key landmarks based on exercise type
  const getKeyLandmarks = (exerciseType: ExerciseType): LandmarkType[] => {
    switch (exerciseType) {
      case "pushups":
        return [
          LandmarkType.LEFT_SHOULDER,
          LandmarkType.RIGHT_SHOULDER,
          LandmarkType.LEFT_ELBOW,
          LandmarkType.RIGHT_ELBOW,
          LandmarkType.LEFT_WRIST,
          LandmarkType.RIGHT_WRIST,
          LandmarkType.LEFT_HIP,
          LandmarkType.RIGHT_HIP,
          LandmarkType.NOSE,
        ];
      case "squats":
        return [
          LandmarkType.LEFT_HIP,
          LandmarkType.RIGHT_HIP,
          LandmarkType.LEFT_KNEE,
          LandmarkType.RIGHT_KNEE,
          LandmarkType.LEFT_ANKLE,
          LandmarkType.RIGHT_ANKLE,
          LandmarkType.LEFT_SHOULDER,
          LandmarkType.RIGHT_SHOULDER,
        ];
      case "planks":
        return [
          LandmarkType.LEFT_SHOULDER,
          LandmarkType.RIGHT_SHOULDER,
          LandmarkType.LEFT_WRIST,
          LandmarkType.RIGHT_WRIST,
          LandmarkType.LEFT_HIP,
          LandmarkType.RIGHT_HIP,
          LandmarkType.LEFT_ANKLE,
          LandmarkType.RIGHT_ANKLE,
          LandmarkType.NOSE,
        ];
      default:
        return [
          LandmarkType.LEFT_SHOULDER,
          LandmarkType.RIGHT_SHOULDER,
          LandmarkType.LEFT_HIP,
          LandmarkType.RIGHT_HIP,
          LandmarkType.LEFT_KNEE,
          LandmarkType.RIGHT_KNEE,
          LandmarkType.LEFT_ELBOW,
          LandmarkType.RIGHT_ELBOW,
        ];
    }
  };

  // Filter connections based on render mode
  const getVisibleConnections = (): SkeletonConnection[] => {
    switch (renderMode) {
      case "full":
        return skeletonConnections;
      case "minimal":
        return skeletonConnections.filter((conn) => conn.priority >= 7);
      case "markers-only":
        return [];
      default:
        return skeletonConnections;
    }
  };

  // Get landmark color based on feedback
  const getLandmarkColor = (landmarkType: LandmarkType): string => {
    if (!formFeedback) return "#00FF88";

    // Check if this landmark is mentioned in feedback
    const isProblematic = formFeedback.bodyParts.some((part) => {
      const partLandmarks = getBodyPartLandmarks(part);
      return partLandmarks.includes(landmarkType);
    });

    if (isProblematic) {
      switch (formFeedback.severity) {
        case "critical":
          return "#FF0000";
        case "high":
          return "#FF4444";
        case "medium":
          return "#FF8800";
        case "low":
          return "#FFAA00";
        default:
          return "#FFD700";
      }
    }

    return "#00FF88";
  };

  // Map body parts to landmarks
  const getBodyPartLandmarks = (bodyPart: string): LandmarkType[] => {
    switch (bodyPart.toLowerCase()) {
      case "arms":
      case "elbows":
        return [
          LandmarkType.LEFT_ELBOW,
          LandmarkType.RIGHT_ELBOW,
          LandmarkType.LEFT_WRIST,
          LandmarkType.RIGHT_WRIST,
        ];
      case "shoulders":
        return [LandmarkType.LEFT_SHOULDER, LandmarkType.RIGHT_SHOULDER];
      case "hips":
        return [LandmarkType.LEFT_HIP, LandmarkType.RIGHT_HIP];
      case "knees":
        return [LandmarkType.LEFT_KNEE, LandmarkType.RIGHT_KNEE];
      case "ankles":
      case "feet":
        return [LandmarkType.LEFT_ANKLE, LandmarkType.RIGHT_ANKLE];
      case "core":
        return [
          LandmarkType.LEFT_HIP,
          LandmarkType.RIGHT_HIP,
          LandmarkType.LEFT_SHOULDER,
          LandmarkType.RIGHT_SHOULDER,
        ];
      case "head":
      case "neck":
        return [
          LandmarkType.NOSE,
          LandmarkType.LEFT_EAR,
          LandmarkType.RIGHT_EAR,
        ];
      default:
        return [];
    }
  };

  // Render skeleton connections
  const renderConnections = (pose: Pose) => {
    const visibleConnections = getVisibleConnections();

    return visibleConnections.map((connection, index) => {
      const fromLandmark = pose.landmarks.find(
        (l) => l.type === connection.from
      );
      const toLandmark = pose.landmarks.find((l) => l.type === connection.to);

      if (
        !fromLandmark ||
        !toLandmark ||
        fromLandmark.visibility < 0.5 ||
        toLandmark.visibility < 0.5
      ) {
        return null;
      }

      return (
        <Line
          key={`connection-${index}`}
          x1={fromLandmark.x}
          y1={fromLandmark.y}
          x2={toLandmark.x}
          y2={toLandmark.y}
          stroke={connection.color}
          strokeWidth={connection.width}
          strokeOpacity={0.8}
          strokeLinecap="round"
        />
      );
    });
  };

  // Render landmark points
  const renderLandmarks = (pose: Pose) => {
    const keyLandmarks =
      renderMode === "markers-only"
        ? getKeyLandmarks(exerciseType)
        : pose.landmarks.map((l) => l.type);

    return pose.landmarks
      .filter(
        (landmark) =>
          keyLandmarks.includes(landmark.type) && landmark.visibility > 0.5
      )
      .map((landmark, index) => {
        const color = getLandmarkColor(landmark.type);
        const radius = renderMode === "markers-only" ? 6 : 4;

        return (
          <Circle
            key={`landmark-${index}`}
            cx={landmark.x}
            cy={landmark.y}
            r={radius}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth={1}
            opacity={0.9}
          />
        );
      });
  };

  // Render calibration guide
  const renderCalibrationGuide = () => {
    if (!isCalibrating) return null;

    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    const guideWidth = screenWidth * 0.6;
    const guideHeight = screenHeight * 0.8;

    return (
      <G>
        {/* Calibration frame */}
        <Path
          d={`M ${centerX - guideWidth / 2} ${centerY - guideHeight / 2} 
              L ${centerX + guideWidth / 2} ${centerY - guideHeight / 2}
              L ${centerX + guideWidth / 2} ${centerY + guideHeight / 2}
              L ${centerX - guideWidth / 2} ${centerY + guideHeight / 2} Z`}
          stroke="#00FF88"
          strokeWidth={3}
          strokeDasharray="10,5"
          fill="none"
          opacity={0.7}
        />

        {/* Progress indicator */}
        <Circle
          cx={centerX}
          cy={centerY - guideHeight / 2 - 30}
          r={15}
          fill="none"
          stroke="#00FF88"
          strokeWidth={3}
        />
        <Circle
          cx={centerX}
          cy={centerY - guideHeight / 2 - 30}
          r={15}
          fill="#00FF88"
          opacity={calibrationProgress}
        />
      </G>
    );
  };

  // Render feedback indicator
  const renderFeedbackIndicator = () => {
    if (!formFeedback) return null;

    const indicatorColor =
      {
        good: "#00FF88",
        warning: "#FFD700",
        error: "#FF4444",
        encouragement: "#87CEEB",
        success: "#00FF88",
      }[formFeedback.type] || "#FFD700";

    return (
      <View
        style={[styles.feedbackIndicator, { backgroundColor: indicatorColor }]}
      >
        <Text style={styles.feedbackText} numberOfLines={2}>
          {formFeedback.message}
        </Text>
      </View>
    );
  };

  // Render rep counter
  const renderRepCounter = () => (
    <View style={styles.repCounterContainer}>
      <Text style={styles.repCounterText}>{repCount}</Text>
      <Text style={styles.repCounterLabel}>/ {targetCount} reps</Text>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${Math.min(100, (repCount / targetCount) * 100)}%` },
          ]}
        />
      </View>
    </View>
  );

  // Render performance indicator
  const renderPerformanceIndicator = () => {
    if (!frameRate) return null;

    const performanceColor =
      frameRate >= 24 ? "#00FF88" : frameRate >= 15 ? "#FFD700" : "#FF4444";

    return (
      <View style={styles.performanceIndicator}>
        <View
          style={[styles.performanceDot, { backgroundColor: performanceColor }]}
        />
        <Text style={styles.performanceText}>{Math.round(frameRate)} FPS</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Skeleton overlay */}
      {showSkeleton && poses.length > 0 && (
        <Svg
          style={styles.svgOverlay}
          width={screenWidth}
          height={screenHeight}
        >
          <Defs>
            <LinearGradient
              id="skeletonGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#00FF88" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#87CEEB" stopOpacity="0.6" />
            </LinearGradient>
          </Defs>

          {poses.map((pose, poseIndex) => (
            <G key={`pose-${poseIndex}`}>
              {renderConnections(pose)}
              {renderLandmarks(pose)}
            </G>
          ))}

          {renderCalibrationGuide()}
        </Svg>
      )}

      {/* UI Elements */}
      {renderFeedbackIndicator()}
      {renderRepCounter()}
      {renderPerformanceIndicator()}

      {/* Calibration overlay */}
      {isCalibrating && (
        <View style={styles.calibrationOverlay}>
          <Text style={styles.calibrationText}>
            Position yourself in the frame
          </Text>
          <Text style={styles.calibrationSubtext}>
            Stand with arms at your sides
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  svgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1,
  },
  feedbackIndicator: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  feedbackText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  repCounterContainer: {
    position: "absolute",
    top: 140,
    right: 20,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    zIndex: 20,
  },
  repCounterText: {
    color: "#00FF88",
    fontSize: 36,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  repCounterLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  progressBarContainer: {
    width: 80,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#00FF88",
    borderRadius: 2,
  },
  performanceIndicator: {
    position: "absolute",
    bottom: 100,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 20,
  },
  performanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  performanceText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  calibrationOverlay: {
    position: "absolute",
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    zIndex: 30,
  },
  calibrationText: {
    color: "#00FF88",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  calibrationSubtext: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    opacity: 0.8,
  },
});

export default PoseOverlay;
