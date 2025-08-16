import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { MLKitPoseService, Pose } from "../services/pose/MLKitPoseService";
import { PoseProcessor, CalibrationData } from "../services/pose/PoseProcessor";
import { ExerciseType, POSE_DETECTION_CONSTANTS } from "../types/pose";
import { COLORS } from "../config/colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface CalibrationScreenProps {
  exerciseType: ExerciseType;
  onCalibrationComplete: (data: CalibrationData) => void;
  onSkip: () => void;
}

interface CalibrationStep {
  id: number;
  title: string;
  instruction: string;
  cameraPosition: string;
  pose: string;
  duration: number;
}

const getCalibrationSteps = (exerciseType: ExerciseType): CalibrationStep[] => {
  const baseSteps = [
    {
      id: 1,
      title: "Position Your Camera",
      instruction: "Place your device 6-8 feet away at chest height",
      cameraPosition: "Setup",
      pose: "Stand naturally with arms at your sides",
      duration: 3,
    },
  ];

  const exerciseSteps: Record<ExerciseType, CalibrationStep[]> = {
    pushups: [
      ...baseSteps,
      {
        id: 2,
        title: "Side Profile View",
        instruction: "Position camera to your side, showing full body profile",
        cameraPosition: "90° Side View",
        pose: "Stand with face visible to camera",
        duration: 3,
      },
      {
        id: 3,
        title: "Starting Position",
        instruction: "Get into plank position",
        cameraPosition: "Side View",
        pose: "Plank position - straight line from head to heels",
        duration: 5,
      },
    ],
    squats: [
      ...baseSteps,
      {
        id: 2,
        title: "Diagonal Front View",
        instruction: "Position camera at 45° angle in front",
        cameraPosition: "45° Diagonal Front",
        pose: "Stand with feet shoulder-width apart",
        duration: 3,
      },
      {
        id: 3,
        title: "Squat Position",
        instruction: "Perform a squat to test range",
        cameraPosition: "45° Diagonal Front",
        pose: "Squat down - knees and hips visible",
        duration: 5,
      },
    ],
    planks: [
      ...baseSteps,
      {
        id: 2,
        title: "Side Profile View",
        instruction: "Position camera to your side",
        cameraPosition: "90° Side View",
        pose: "Stand with face visible to camera",
        duration: 3,
      },
      {
        id: 3,
        title: "Plank Position",
        instruction: "Get into plank position",
        cameraPosition: "Side View",
        pose: "Plank - straight body alignment",
        duration: 5,
      },
    ],
    situps: [
      ...baseSteps,
      {
        id: 2,
        title: "Side Profile View",
        instruction: "Position camera to your side",
        cameraPosition: "90° Side View",
        pose: "Lie down with knees bent",
        duration: 3,
      },
      {
        id: 3,
        title: "Sit-up Range",
        instruction: "Perform a sit-up to test range",
        cameraPosition: "Side View",
        pose: "Sit up - torso and legs visible",
        duration: 5,
      },
    ],
    burpees: [
      ...baseSteps,
      {
        id: 2,
        title: "Diagonal Side View",
        instruction: "Position camera at 45° to your side",
        cameraPosition: "45° Diagonal Side",
        pose: "Stand ready for full movement",
        duration: 3,
      },
      {
        id: 3,
        title: "Full Range Test",
        instruction: "Perform a slow burpee",
        cameraPosition: "45° Diagonal Side",
        pose: "Complete burpee movement",
        duration: 8,
      },
    ],
    lunges: [
      ...baseSteps,
      {
        id: 2,
        title: "Side Profile View",
        instruction: "Position camera to your side",
        cameraPosition: "90° Side View",
        pose: "Stand with working leg visible",
        duration: 3,
      },
    ],
    "mountain-climbers": [
      ...baseSteps,
      {
        id: 2,
        title: "Diagonal Side View",
        instruction: "Position camera at 45° to your side",
        cameraPosition: "45° Diagonal Side",
        pose: "Plank position ready for movement",
        duration: 5,
      },
    ],
    "jumping-jacks": [
      ...baseSteps,
      {
        id: 2,
        title: "Front View",
        instruction: "Position camera directly in front",
        cameraPosition: "Front View",
        pose: "Stand with arms and legs visible",
        duration: 3,
      },
    ],
  };

  return exerciseSteps[exerciseType] || baseSteps;
};

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({
  exerciseType,
  onCalibrationComplete,
  onSkip,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [capturedPoses, setCapturedPoses] = useState<Pose[]>([]);
  const [cameraType, setCameraType] = useState<CameraType>("back");

  const steps = getCalibrationSteps(exerciseType);
  const currentStepData = steps[currentStep];

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Update progress
    Animated.timing(progressAnim, {
      toValue: (currentStep + 1) / steps.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const startCapture = async () => {
    setIsCapturing(true);
    setCountdown(currentStepData.duration);

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          captureCalibrationData();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const captureCalibrationData = async () => {
    try {
      // Simulate pose capture (in real implementation, this would capture actual poses)
      const mockPoses = await MLKitPoseService.detectPoses(null as any);

      if (mockPoses && mockPoses.length > 0) {
        setCapturedPoses((prev) => [...prev, ...mockPoses]);

        if (currentStep < steps.length - 1) {
          // Move to next step
          setCurrentStep((prev) => prev + 1);
          setIsCapturing(false);
        } else {
          // Complete calibration
          await completeCalibration(mockPoses);
        }
      }
    } catch (error) {
      console.error("❌ Calibration capture failed:", error);
      setIsCapturing(false);
    }
  };

  const completeCalibration = async (finalPoses: Pose[]) => {
    try {
      // Use all captured poses for calibration
      const allPoses = [...capturedPoses, ...finalPoses];
      const calibrationData = await PoseProcessor.calibrate(
        allPoses,
        exerciseType
      );

      if (calibrationData) {
        // Save calibration
        await PoseProcessor.saveCalibration(calibrationData);
        console.log("✅ Calibration completed successfully");
        onCalibrationComplete(calibrationData);
      } else {
        throw new Error("Failed to create calibration data");
      }
    } catch (error) {
      console.error("❌ Calibration completion failed:", error);
      // Could show error UI here
    }
  };

  const skipCalibration = () => {
    console.log("⏭️ Calibration skipped");
    onSkip();
  };

  const toggleCamera = () => {
    setCameraType((current) => (current === "back" ? "front" : "back"));
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          We need camera access to calibrate pose detection for {exerciseType}.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={skipCalibration}>
          <Text style={styles.skipButtonText}>Skip Calibration</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView style={styles.camera} facing={cameraType} />

      {/* Overlay Content */}
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of {steps.length}
          </Text>
        </View>

        {/* Step Content */}
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>{currentStepData.title}</Text>
          <Text style={styles.stepInstruction}>
            {currentStepData.instruction}
          </Text>

          <View style={styles.positionInfo}>
            <Text style={styles.positionLabel}>Camera Position:</Text>
            <Text style={styles.positionValue}>
              {currentStepData.cameraPosition}
            </Text>
          </View>

          <View style={styles.poseInfo}>
            <Text style={styles.poseLabel}>Your Pose:</Text>
            <Text style={styles.poseValue}>{currentStepData.pose}</Text>
          </View>
        </View>

        {/* Countdown Display */}
        {isCapturing && (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>{countdown}</Text>
            <Text style={styles.countdownLabel}>Hold position...</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {!isCapturing ? (
            <>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={startCapture}
              >
                <Text style={styles.captureButtonText}>
                  {currentStep === 0 ? "Start Calibration" : "Capture Position"}
                </Text>
              </TouchableOpacity>

              <View style={styles.secondaryControls}>
                <TouchableOpacity
                  style={styles.cameraToggle}
                  onPress={toggleCamera}
                >
                  <Text style={styles.cameraToggleText}>
                    {cameraType === "back" ? "📱 Front" : "📷 Back"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={skipCalibration}
                >
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.capturingContainer}>
              <Text style={styles.capturingText}>📸 Capturing...</Text>
            </View>
          )}
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tips:</Text>
          <Text style={styles.tipText}>• Ensure good lighting</Text>
          <Text style={styles.tipText}>• Keep your full body visible</Text>
          <Text style={styles.tipText}>• Stay still during capture</Text>
          <Text style={styles.tipText}>• Clear background works best</Text>
        </View>
      </Animated.View>
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
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 20,
    paddingTop: 60,
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  progressBackground: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
    borderRadius: 3,
  },
  progressText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  stepContainer: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  stepInstruction: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  positionInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  positionLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },
  positionValue: {
    fontSize: 14,
    color: COLORS.UI.BUTTON_PRIMARY,
    fontWeight: "600",
  },
  poseInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  poseLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },
  poseValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  countdownContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: "900",
    color: COLORS.UI.BUTTON_PRIMARY,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  countdownLabel: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  controls: {
    alignItems: "center",
    marginBottom: 20,
  },
  captureButton: {
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  captureButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cameraToggle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cameraToggleText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  skipButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  skipButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  capturingContainer: {
    alignItems: "center",
  },
  capturingText: {
    fontSize: 20,
    color: COLORS.UI.BUTTON_PRIMARY,
    fontWeight: "700",
  },
  tipsContainer: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 4,
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
    marginBottom: 16,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
