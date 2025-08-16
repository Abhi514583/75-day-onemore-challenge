import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";

import { MLKitPoseService, Pose } from "../services/pose/MLKitPoseService";
import {
  PoseProcessor,
  ProcessedPoseData,
} from "../services/pose/PoseProcessor";
import {
  CameraErrorHandler,
  ErrorRecoveryOptions,
} from "../services/pose/CameraErrorHandler";
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

interface SimplePoseCameraProps {
  exerciseType: ExerciseType;
  onRepDetected: (repData: RepData) => void;
  onFormFeedback: (feedback: FormFeedback) => void;
  onCalibrationComplete: (calibrationData: CalibrationData) => void;
  isActive: boolean;
  settings: PoseDetectionSettings;
  onCameraStateChange?: (state: CameraState) => void;
  onError?: (error: CameraError) => void;
  onFallbackToManual?: () => void;
}

export const SimplePoseCamera: React.FC<SimplePoseCameraProps> = ({
  exerciseType,
  onRepDetected,
  onFormFeedback,
  onCalibrationComplete,
  isActive,
  settings,
  onCameraStateChange,
  onError,
  onFallbackToManual,
}) => {
  // Camera setup
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>("back");

  // State management
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    hasPermission: false,
    isInitialized: false,
    currentFrameRate: 24,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPoses, setCurrentPoses] = useState<Pose[]>([]);

  // Initialize camera and pose detection
  useEffect(() => {
    initializeCamera();
    return () => {
      cleanup();
    };
  }, []);

  // Update camera state callback
  useEffect(() => {
    onCameraStateChange?.(cameraState);
  }, [cameraState, onCameraStateChange]);

  const initializeCamera = async () => {
    try {
      console.log("📸 Initializing SimplePoseCamera...");

      // Check and request camera permission
      if (!permission?.granted) {
        console.log("📸 Requesting camera permission...");
        const { granted } = await requestPermission();
        if (!granted) {
          handleCameraError({
            type: "permission",
            message: "Camera permission denied",
            recoverable: true,
            suggestions: [
              "Go to Settings and enable camera permission",
              "Restart the app after granting permission",
            ],
          });
          return;
        }
      }

      // Initialize ML Kit pose detection
      await MLKitPoseService.initialize();

      setCameraState((prev) => ({
        ...prev,
        hasPermission: true,
        isInitialized: true,
      }));

      console.log("✅ SimplePoseCamera initialized successfully");
    } catch (error) {
      console.error("❌ Camera initialization failed:", error);
      handleCameraError({
        type: "initialization",
        message: `Initialization failed: ${error}`,
        recoverable: true,
        suggestions: [
          "Check camera permissions",
          "Restart the app",
          "Try using manual counting mode",
        ],
      });
    }
  };

  const cleanup = async () => {
    try {
      await MLKitPoseService.cleanup();
      setCameraState((prev) => ({
        ...prev,
        isActive: false,
        isInitialized: false,
      }));
      console.log("🧹 SimplePoseCamera cleaned up");
    } catch (error) {
      console.error("❌ Cleanup error:", error);
    }
  };

  const handleCameraError = (error: CameraError) => {
    setCameraState((prev) => ({ ...prev, error }));
    onError?.(error);

    const recoveryOptions: ErrorRecoveryOptions = {
      enableManualMode: () => {
        console.log("🔄 Switching to manual mode");
        onFallbackToManual?.();
      },
      retryCamera: async () => {
        console.log("🔄 Retrying camera initialization");
        await initializeCamera();
      },
      reduceQuality: () => {
        console.log("🔄 Reducing camera quality");
        // TODO: Implement quality reduction
      },
      restartPoseDetection: async () => {
        console.log("🔄 Restarting pose detection");
        await cleanup();
        await initializeCamera();
      },
      showTroubleshooting: () => {
        console.log("🔄 Showing troubleshooting guide");
        showTroubleshootingGuide();
      },
    };

    CameraErrorHandler.handleCameraError(error, recoveryOptions);
  };

  const showTroubleshootingGuide = () => {
    const tips = CameraErrorHandler.getTroubleshootingTips();
    Alert.alert("Troubleshooting Guide", tips.slice(0, 5).join("\n\n"), [
      { text: "Try Manual Mode", onPress: () => onFallbackToManual?.() },
      { text: "Got It", style: "default" },
    ]);
  };

  // Simulate pose detection processing
  const simulatePoseDetection = useCallback(async () => {
    if (isProcessing || !isActive) return;

    setIsProcessing(true);

    try {
      // Get mock poses from MLKitPoseService
      const poses = await MLKitPoseService.detectPoses(null as any);

      if (poses && poses.length > 0) {
        // Process poses for exercise analysis
        const processedData = PoseProcessor.processFrame(poses, exerciseType);

        if (processedData) {
          setCurrentPoses(poses);

          // Handle pose detection results
          await handlePoseDetection(processedData, Date.now());
        }
      }
    } catch (error) {
      console.error("❌ Pose detection simulation error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isActive, exerciseType]);

  const handlePoseDetection = async (
    processedData: ProcessedPoseData,
    timestamp: number
  ) => {
    try {
      // Provide feedback based on pose quality
      if (!processedData.isValid) {
        const feedback: FormFeedback = {
          type: "warning",
          message: "Adjust your position for better detection",
          bodyParts: [],
          severity: "medium",
          suggestions: [
            "Make sure you're fully visible in the camera",
            "Check lighting conditions",
            "Move closer or further from camera",
          ],
          priority: 5,
          timestamp,
          exerciseType,
        };

        onFormFeedback(feedback);
      } else {
        // Good pose detected
        const feedback: FormFeedback = {
          type: "good",
          message: "Good position detected!",
          bodyParts: [],
          severity: "low",
          suggestions: [],
          priority: 3,
          timestamp,
          exerciseType,
        };

        onFormFeedback(feedback);
      }
    } catch (error) {
      console.error("❌ Pose detection handling error:", error);
    }
  };

  // Toggle camera type
  const toggleCameraType = () => {
    setCameraType((current) => (current === "back" ? "front" : "back"));
  };

  // Camera activation/deactivation
  useEffect(() => {
    setCameraState((prev) => ({ ...prev, isActive }));
  }, [isActive]);

  // Start pose detection simulation when active
  useEffect(() => {
    if (isActive && cameraState.isInitialized) {
      const interval = setInterval(simulatePoseDetection, 1000); // Every second
      return () => clearInterval(interval);
    }
  }, [isActive, cameraState.isInitialized, simulatePoseDetection]);

  // Render camera permission request
  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          This app needs camera access to track your workout form and count
          repetitions automatically.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>
            Grant Camera Permission
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render camera error
  if (cameraState.error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Camera Error</Text>
        <Text style={styles.errorText}>{cameraState.error.message}</Text>
        {cameraState.error.suggestions.map((suggestion, index) => (
          <Text key={index} style={styles.suggestionText}>
            • {suggestion}
          </Text>
        ))}
        <TouchableOpacity style={styles.retryButton} onPress={initializeCamera}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={cameraType} />

      {/* Camera Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.flipButton} onPress={toggleCameraType}>
          <Text style={styles.flipButtonText}>
            {cameraType === "back" ? "📱 Front" : "📷 Back"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.manualButton}
          onPress={onFallbackToManual}
        >
          <Text style={styles.manualButtonText}>Manual Mode</Text>
        </TouchableOpacity>
      </View>

      {/* Debug overlay (only in development) */}
      {__DEV__ && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugText}>
            Camera: {cameraType === "back" ? "Back" : "Front"} | Processing:{" "}
            {isProcessing ? "ON" : "OFF"}
          </Text>
          <Text style={styles.debugText}>
            Poses: {currentPoses.length} | Exercise: {exerciseType}
          </Text>
          <Text style={styles.debugText}>
            Status: {cameraState.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      )}

      {/* Pose Detection Status */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusIndicator,
            {
              backgroundColor: isProcessing
                ? COLORS.UI.BUTTON_PRIMARY
                : COLORS.BACKGROUND.CARD_BORDER,
            },
          ]}
        >
          <Text style={styles.statusText}>
            {isProcessing ? "🤖 Analyzing..." : "📸 Ready"}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  controlsContainer: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  flipButton: {
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  flipButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  manualButton: {
    backgroundColor: COLORS.ACCENT.ERROR,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  manualButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  statusContainer: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  statusIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.BACKGROUND.PRIMARY[0],
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 16,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.BACKGROUND.PRIMARY[0],
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.ACCENT.ERROR,
    marginBottom: 16,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "left",
    marginBottom: 4,
  },
  retryButton: {
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  debugOverlay: {
    position: "absolute",
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 8,
  },
  debugText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: 2,
  },
});
