import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SimplePoseCamera } from "./SimplePoseCamera";
import { ManualCountingFallback } from "./ManualCountingFallback";
import {
  ExerciseType,
  RepData,
  FormFeedback,
  CalibrationData,
  PoseDetectionSettings,
  CameraState,
  CameraError,
} from "../types/pose";
import { COLORS } from "../config/colors";

export const CameraIntegrationTest: React.FC = () => {
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [exerciseType] = useState<ExerciseType>("pushups");
  const [repCount, setRepCount] = useState(0);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [cameraState, setCameraState] = useState<CameraState | null>(null);
  const [isActive, setIsActive] = useState(true);

  const settings: PoseDetectionSettings = {
    enabled: true,
    exerciseType: "pushups",
    difficultyLevel: "beginner",
    showSkeleton: true,
    skeletonOpacity: 0.8,
    renderMode: "full",
    feedbackStyle: "visual",
    confidenceThreshold: 0.6,
    formStrictness: 0.7,
    feedbackFrequency: "medium",
    autoCalibrate: true,
    persistCalibration: false,
    recalibrateOnLightingChange: true,
    targetFrameRate: 24,
    enablePerformanceMode: false,
    reducedQualityThreshold: 15,
  };

  const handleRepDetected = (repData: RepData) => {
    console.log("🏋️ Rep detected:", repData);
    setRepCount((prev) => prev + 1);
  };

  const handleFormFeedback = (feedback: FormFeedback) => {
    console.log("📝 Form feedback:", feedback);
    setFeedback(feedback);

    // Clear feedback after 3 seconds
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCalibrationComplete = (calibrationData: CalibrationData) => {
    console.log("📊 Calibration complete:", calibrationData);
  };

  const handleCameraStateChange = (state: CameraState) => {
    setCameraState(state);
  };

  const handleCameraError = (error: CameraError) => {
    console.error("📸 Camera error:", error);
  };

  const handleFallbackToManual = () => {
    setMode("manual");
  };

  const resetTest = () => {
    setRepCount(0);
    setFeedback(null);
    setMode("camera");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Camera Integration Test</Text>
        <Text style={styles.subtitle}>
          Mode: {mode === "camera" ? "📸 Camera" : "📱 Manual"} | Reps:{" "}
          {repCount}
        </Text>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === "camera" && styles.modeButtonActive,
          ]}
          onPress={() => setMode("camera")}
        >
          <Text
            style={[
              styles.modeButtonText,
              mode === "camera" && styles.modeButtonTextActive,
            ]}
          >
            📸 Camera Mode
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === "manual" && styles.modeButtonActive,
          ]}
          onPress={() => setMode("manual")}
        >
          <Text
            style={[
              styles.modeButtonText,
              mode === "manual" && styles.modeButtonTextActive,
            ]}
          >
            📱 Manual Mode
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {mode === "camera" ? (
          <SimplePoseCamera
            exerciseType={exerciseType}
            onRepDetected={handleRepDetected}
            onFormFeedback={handleFormFeedback}
            onCalibrationComplete={handleCalibrationComplete}
            isActive={isActive}
            settings={settings}
            onCameraStateChange={handleCameraStateChange}
            onError={handleCameraError}
            onFallbackToManual={handleFallbackToManual}
          />
        ) : (
          <ManualCountingFallback
            exerciseType={exerciseType}
            targetCount={10}
            onRepCompleted={handleRepDetected}
            onComplete={() => console.log("🎉 Workout complete!")}
            isActive={isActive}
          />
        )}
      </View>

      {/* Feedback Display */}
      {feedback && (
        <View
          style={[
            styles.feedbackContainer,
            { backgroundColor: getFeedbackColor(feedback.type) },
          ]}
        >
          <Text style={styles.feedbackText}>{feedback.message}</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            {
              backgroundColor: isActive
                ? COLORS.ACCENT.ERROR
                : COLORS.UI.BUTTON_PRIMARY,
            },
          ]}
          onPress={() => setIsActive(!isActive)}
        >
          <Text style={styles.controlButtonText}>
            {isActive ? "⏸️ Pause" : "▶️ Start"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={resetTest}>
          <Text style={styles.controlButtonText}>🔄 Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Status Info */}
      {cameraState && (
        <ScrollView style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Camera Status:</Text>
          <Text style={styles.statusText}>
            Active: {cameraState.isActive ? "✅" : "❌"}
          </Text>
          <Text style={styles.statusText}>
            Permission: {cameraState.hasPermission ? "✅" : "❌"}
          </Text>
          <Text style={styles.statusText}>
            Initialized: {cameraState.isInitialized ? "✅" : "❌"}
          </Text>
          <Text style={styles.statusText}>
            Frame Rate: {cameraState.currentFrameRate} fps
          </Text>
          {cameraState.error && (
            <Text style={styles.errorText}>
              Error: {cameraState.error.message}
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const getFeedbackColor = (type: FormFeedback["type"]): string => {
  switch (type) {
    case "good":
      return "rgba(34, 197, 94, 0.9)"; // Green
    case "warning":
      return "rgba(251, 191, 36, 0.9)"; // Yellow
    case "error":
      return "rgba(239, 68, 68, 0.9)"; // Red
    case "encouragement":
      return "rgba(59, 130, 246, 0.9)"; // Blue
    default:
      return "rgba(107, 114, 128, 0.9)"; // Gray
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY[0],
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
  },
  modeToggle: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND.CARD,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
  },
  modeButtonText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    fontWeight: "600",
  },
  modeButtonTextActive: {
    color: COLORS.TEXT.PRIMARY,
  },
  content: {
    flex: 1,
  },
  feedbackContainer: {
    position: "absolute",
    top: 150,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 8,
    zIndex: 1000,
  },
  feedbackText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    padding: 20,
    justifyContent: "space-around",
  },
  controlButton: {
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  controlButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  statusContainer: {
    maxHeight: 120,
    backgroundColor: COLORS.BACKGROUND.CARD,
    margin: 20,
    padding: 16,
    borderRadius: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.ACCENT.ERROR,
    marginTop: 8,
  },
});
