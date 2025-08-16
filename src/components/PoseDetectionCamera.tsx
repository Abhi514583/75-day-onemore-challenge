import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
  Frame,
} from "react-native-vision-camera";
import { runOnJS } from "react-native-reanimated";

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

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface PoseDetectionCameraProps {
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

export const PoseDetectionCamera: React.FC<PoseDetectionCameraProps> = ({
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
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();

  // State management
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    hasPermission: false,
    isInitialized: false,
    currentFrameRate: 0,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedTime, setLastProcessedTime] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [currentPoses, setCurrentPoses] = useState<Pose[]>([]);

  // Refs for performance tracking
  const frameCountRef = useRef(0);
  const lastFpsUpdate = useRef(Date.now());
  const processingTimeRef = useRef<number[]>([]);

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
      console.log("📸 Initializing PoseDetectionCamera...");

      // Check and request camera permission
      if (!hasPermission) {
        console.log("📸 Requesting camera permission...");
        const granted = await requestPermission();
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

      console.log("✅ PoseDetectionCamera initialized successfully");
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
      console.log("🧹 PoseDetectionCamera cleaned up");
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

  // Frame processing with pose detection
  const frameProcessor = useFrameProcessor(
    (frame: Frame) => {
      "worklet";

      // Throttle processing based on target frame rate
      const now = Date.now();
      const targetInterval = 1000 / settings.targetFrameRate;

      if (now - lastProcessedTime < targetInterval) {
        return;
      }

      // Update frame rate tracking
      frameCountRef.current++;
      if (now - lastFpsUpdate.current >= 1000) {
        const fps = frameCountRef.current;
        frameCountRef.current = 0;
        lastFpsUpdate.current = now;

        runOnJS(updateFrameRate)(fps);
      }

      // Process frame for pose detection
      runOnJS(processFrame)(frame, now);
    },
    [settings.targetFrameRate, lastProcessedTime]
  );

  const updateFrameRate = useCallback((fps: number) => {
    setCameraState((prev) => ({ ...prev, currentFrameRate: fps }));
  }, []);

  const processFrame = useCallback(
    async (frame: Frame, timestamp: number) => {
      if (isProcessing || !isActive) return;

      setIsProcessing(true);
      setLastProcessedTime(timestamp);

      try {
        const startTime = Date.now();

        // Detect poses using ML Kit
        const poses = await MLKitPoseService.detectPoses(frame);

        if (poses && poses.length > 0) {
          // Process poses for exercise analysis
          const processedData = PoseProcessor.processFrame(poses, exerciseType);

          if (processedData) {
            setCurrentPoses(poses);

            // Handle pose detection results
            await handlePoseDetection(processedData, timestamp);
          }
        }

        // Track processing performance
        const processingTime = Date.now() - startTime;
        processingTimeRef.current.push(processingTime);

        // Keep only last 10 processing times for average calculation
        if (processingTimeRef.current.length > 10) {
          processingTimeRef.current.shift();
        }
      } catch (error) {
        console.error("❌ Frame processing error:", error);
        handleCameraError({
          type: "processing",
          message: `Frame processing failed: ${error}`,
          recoverable: true,
          suggestions: [
            "Check device performance",
            "Try reducing frame rate",
            "Restart pose detection",
          ],
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, isActive, exerciseType]
  );

  const handlePoseDetection = async (
    processedData: ProcessedPoseData,
    timestamp: number
  ) => {
    try {
      // TODO: Implement exercise-specific detection logic
      // This will be expanded in tasks 5.x (exercise detection algorithms)

      // For now, just validate pose quality and provide basic feedback
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

  // Camera activation/deactivation
  useEffect(() => {
    setCameraState((prev) => ({ ...prev, isActive }));
  }, [isActive]);

  // Render camera permission request
  if (!hasPermission) {
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

  // Render camera unavailable
  if (!device) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Camera Unavailable</Text>
        <Text style={styles.errorText}>
          Unable to access camera. Please check your device settings.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeCamera}>
          <Text style={styles.retryButtonText}>Try Again</Text>
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
      <Camera
        style={styles.camera}
        device={device}
        isActive={isActive && cameraState.isInitialized}
        frameProcessor={frameProcessor}
        fps={settings.targetFrameRate}
      />

      {/* Debug overlay (only in development) */}
      {__DEV__ && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugText}>
            FPS: {cameraState.currentFrameRate} | Processing:{" "}
            {isProcessing ? "ON" : "OFF"}
          </Text>
          <Text style={styles.debugText}>
            Poses: {currentPoses.length} | Exercise: {exerciseType}
          </Text>
          {processingTimeRef.current.length > 0 && (
            <Text style={styles.debugText}>
              Avg Processing:{" "}
              {Math.round(
                processingTimeRef.current.reduce((a, b) => a + b, 0) /
                  processingTimeRef.current.length
              )}
              ms
            </Text>
          )}
        </View>
      )}
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
