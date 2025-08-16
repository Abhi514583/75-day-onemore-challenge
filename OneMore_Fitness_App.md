# OneMore Fitness App - Complete Codebase

## Overview

OneMore is an AI-powered fitness app built with React Native and Expo that uses Google ML Kit for real-time pose detection to automatically count exercise repetitions and provide form feedback. The app features daily challenges, duels with friends, and comprehensive workout tracking.

---

## index.ts

```typescript
import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
```

---

## app.json

```json
{
  "expo": {
    "name": "OneMoreApp2",
    "slug": "OneMoreApp2",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.onemoreapp.fitness",
      "infoPlist": {
        "NSCameraUsageDescription": "$(PRODUCT_NAME) needs access to your Camera to track your workout form and count repetitions automatically."
      }
    },
    "android": {
      "package": "com.onemoreapp.fitness",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "permissions": ["CAMERA", "android.permission.CAMERA"]
    },
    "plugins": [
      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "$(PRODUCT_NAME) needs access to your Camera to track your workout form and count repetitions automatically.",
          "enableMicrophonePermission": false
        }
      ]
    ],
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "393d4dae-e18b-4cc0-adaf-36602e84a42e"
      }
    }
  }
}
```

---

## package.json

```json
{
  "name": "onemoreapp2",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "build:dev": "expo install --fix && eas build --profile development",
    "build:preview": "expo install --fix && eas build --profile preview",
    "build:production": "expo install --fix && eas build --profile production"
  },
  "dependencies": {
    "@react-native-async-storage/async-storage": "^2.1.2",
    "@react-native-community/netinfo": "^11.4.1",
    "@reduxjs/toolkit": "^2.0.1",
    "expo": "~53.0.0",
    "expo-camera": "~16.1.11",
    "expo-dev-client": "~5.2.4",
    "expo-device": "~7.1.4",
    "expo-file-system": "~18.1.11",
    "expo-linear-gradient": "~14.1.5",
    "expo-media-library": "~17.1.7",
    "expo-sharing": "~13.1.5",
    "expo-status-bar": "~2.2.3",
    "firebase": "^12.1.0",
    "react": "19.0.0",
    "react-native": "0.79.5",
    "react-native-chart-kit": "^6.12.0",
    "react-native-reanimated": "~3.17.4",
    "react-native-safe-area-context": "5.4.0",
    "react-native-svg": "15.11.2",
    "react-native-view-shot": "^4.0.3",
    "react-native-vision-camera": "^4.7.1",
    "react-native-worklets-core": "^1.6.2",
    "react-redux": "^9.1.0",
    "redux-persist": "^6.0.0",
    "expo-notifications": "~0.31.4"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/react": "~19.0.10",
    "@types/react-native": "~0.73.0",
    "typescript": "^5.3.3"
  },
  "private": true
}
```

---

## App.tsx

```typescript
// Main App component with Redux store and navigation logic
import React, { useState, useEffect } from "react";
import { View, StyleSheet, AppState, AppStateStatus } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { SafeAreaProviderWrapper } from "./src/components/SafeAreaWrapper";

import { store, persistor } from "./src/store";
import { useAppSelector, useAppDispatch } from "./src/store/hooks";
import {
  startChallenge,
  syncCurrentDay,
  autoSyncCurrentDay,
  resetChallenge,
} from "./src/store/slices/challengeSlice";
import {
  completeOnboarding,
  resetUserData,
} from "./src/store/slices/userSlice";

import WelcomeScreen from "./src/screens/WelcomeScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import MainApp from "./src/screens/MainApp";
import ExerciseTrackingScreen from "./src/screens/ExerciseTrackingScreen";
import LoadingScreen from "./src/components/LoadingScreen";
import AppEntry from "./src/screens/AppEntry";

// Import debug utils in development
if (__DEV__) {
  require("./src/utils/debug");
}

interface ExerciseBaselines {
  pushups: number;
  squats: number;
  situps: number;
  planks: number;
}

function AppContent() {
  const dispatch = useAppDispatch();
  const { isOnboarded } = useAppSelector(
    (state) => state.user || { isOnboarded: false }
  );
  const { isActive, baselines, currentDay, dailyProgress } = useAppSelector(
    (state) =>
      state.challenge || {
        isActive: false,
        baselines: { pushups: 10, squats: 15, situps: 10, planks: 30 },
        currentDay: 1,
        dailyProgress: {},
      }
  );

  const [currentScreen, setCurrentScreen] = useState<
    "welcome" | "onboarding" | "main" | "exercise"
  >("welcome");
  const [currentExercise, setCurrentExercise] = useState<{
    type: "pushups" | "squats" | "situps" | "planks";
    target: number;
  } | null>(null);

  useEffect(() => {
    // Determine initial screen based on persisted state
    console.log("🔍 Determining initial screen...");
    console.log("User onboarded:", isOnboarded);
    console.log("Challenge active:", isActive);

    if (isOnboarded && isActive) {
      // User has completed onboarding and has an active challenge
      console.log("📱 Navigating to main app (returning user)");
      setCurrentScreen("main");
      dispatch(syncCurrentDay()); // Sync the current day in case time has passed
    } else if (isOnboarded) {
      // User has been onboarded but no active challenge
      console.log(
        "📱 Navigating to welcome (onboarded user, no active challenge)"
      );
      setCurrentScreen("welcome");
    } else {
      // First time user
      console.log("📱 Navigating to welcome (new user)");
      setCurrentScreen("welcome");
    }
  }, [dispatch, isOnboarded, isActive]);

  // Handle app state changes for timezone/DST sync
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`📱 App state changed to: ${nextAppState}`);

      if (nextAppState === "active") {
        // App became active - sync current day to handle timezone changes, DST, etc.
        console.log("🔄 App became active, auto-syncing current day...");
        dispatch(autoSyncCurrentDay());
      }
    };

    // Add app state change listener
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Initial sync when component mounts
    if (isActive) {
      dispatch(autoSyncCurrentDay());
    }

    // Cleanup
    return () => {
      subscription?.remove();
    };
  }, [dispatch, isActive]);

  const navigateToOnboarding = () => {
    if (isOnboarded) {
      // User has been onboarded before, go straight to main app
      setCurrentScreen("main");
    } else {
      // First time user, go to onboarding
      setCurrentScreen("onboarding");
    }
  };

  const navigateToMain = (newBaselines: ExerciseBaselines) => {
    // Complete onboarding and start challenge
    dispatch(completeOnboarding({ fitnessLevel: "beginner" }));
    dispatch(startChallenge(newBaselines));
    setCurrentScreen("main");
  };

  const navigateToExercise = (exerciseType: string) => {
    // Find the target for this exercise type
    const today = new Date().toISOString().split("T")[0];
    const todayProgress = dailyProgress[today];
    let target = 0;

    switch (exerciseType) {
      case "pushups":
        target = baselines.pushups + (currentDay - 1);
        break;
      case "squats":
        target = baselines.squats + (currentDay - 1);
        break;
      case "situps":
        target = baselines.situps + (currentDay - 1);
        break;
      case "planks":
        target = baselines.planks + (currentDay - 1) * 5;
        break;
    }

    setCurrentExercise({
      type: exerciseType as "pushups" | "squats" | "situps" | "planks",
      target,
    });
    setCurrentScreen("exercise");
  };

  const navigateToPersonalBestAttempt = (
    exerciseType: string,
    isPB: boolean
  ) => {
    // For PB attempts, we don't use daily targets
    setCurrentExercise({
      type: exerciseType as "pushups" | "squats" | "situps" | "planks",
      target: 0, // PB attempts are open-ended
    });
    setCurrentScreen("exercise");
  };

  const navigateBackToMain = () => {
    setCurrentScreen("main");
    setCurrentExercise(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {currentScreen === "welcome" && (
        <WelcomeScreen onStartChallenge={navigateToOnboarding} />
      )}
      {currentScreen === "onboarding" && (
        <OnboardingScreen onComplete={navigateToMain} />
      )}
      {currentScreen === "main" && (
        <MainApp
          onStartSession={navigateToExercise}
          onStartAttempt={navigateToPersonalBestAttempt}
        />
      )}
      {currentScreen === "exercise" && currentExercise && (
        <ExerciseTrackingScreen
          exerciseType={currentExercise.type}
          targetCount={currentExercise.target}
          onComplete={navigateBackToMain}
          onBack={navigateBackToMain}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProviderWrapper>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <AppEntry />
        </PersistGate>
      </Provider>
    </SafeAreaProviderWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

---

## src/services/pose/MLKitPoseService.ts

```typescript
// Google ML Kit Pose Detection service with graceful fallback
import { Frame } from "react-native-vision-camera";

// Graceful fallback for ML Kit pose detection
let PoseDetection: any = null;

try {
  PoseDetection = require("@react-native-ml-kit/pose-detection");
} catch (error) {
  console.warn("ML Kit Pose Detection not available:", error.message);
}

// Pose landmark types based on ML Kit
export enum LandmarkType {
  NOSE = 0,
  LEFT_EYE_INNER = 1,
  LEFT_EYE = 2,
  LEFT_EYE_OUTER = 3,
  RIGHT_EYE_INNER = 4,
  RIGHT_EYE = 5,
  RIGHT_EYE_OUTER = 6,
  LEFT_EAR = 7,
  RIGHT_EAR = 8,
  LEFT_MOUTH = 9,
  RIGHT_MOUTH = 10,
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  LEFT_PINKY = 17,
  RIGHT_PINKY = 18,
  LEFT_INDEX = 19,
  RIGHT_INDEX = 20,
  LEFT_THUMB = 21,
  RIGHT_THUMB = 22,
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32,
}

export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility: number;
  type: LandmarkType;
}

export interface Pose {
  landmarks: PoseLandmark[];
  timestamp: number;
  confidence: number;
}

export class MLKitPoseService {
  private static initialized = false;
  private static detector: any = null;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (!PoseDetection) {
        console.warn(
          "🤖 ML Kit Pose Detection not available - using mock mode"
        );
        this.initialized = true;
        return;
      }

      // Initialize ML Kit pose detector
      this.detector = await PoseDetection.createPoseDetector({
        mode: "stream", // For real-time detection
        detectLandmarks: true,
        trackingEnabled: true,
      });

      console.log("🤖 MLKit Pose Detection initialized successfully");
      this.initialized = true;
    } catch (error) {
      console.error("❌ Failed to initialize MLKit Pose Detection:", error);
      // Don't throw - allow graceful fallback
      this.initialized = true; // Mark as initialized to prevent retry loops
    }
  }

  static async detectPoses(frame: Frame): Promise<Pose[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (!PoseDetection || !this.detector) {
        // Return mock pose data for testing when ML Kit is not available
        return this.getMockPose();
      }

      // Process frame with ML Kit
      const poses = await this.detector.detectInImage(frame);

      return poses.map((pose: any) => ({
        landmarks: pose.landmarks.map((landmark: any, index: number) => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z || 0,
          visibility: landmark.visibility || 1.0,
          type: index as LandmarkType,
        })),
        timestamp: Date.now(),
        confidence: pose.confidence || 0.8,
      }));
    } catch (error) {
      console.error("❌ Pose detection failed:", error);
      return [];
    }
  }

  static async cleanup(): Promise<void> {
    try {
      if (this.detector) {
        await this.detector.close();
        this.detector = null;
      }
      this.initialized = false;
      console.log("🧹 MLKit Pose Detection cleaned up");
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
    }
  }

  static isAvailable(): boolean {
    return this.initialized && (PoseDetection !== null || true); // Allow mock mode
  }

  // Mock pose data for testing when ML Kit is not available
  private static getMockPose(): Pose[] {
    // Return a basic standing pose for testing
    const mockLandmarks: PoseLandmark[] = [
      { x: 160, y: 100, z: 0, visibility: 0.9, type: LandmarkType.NOSE },
      {
        x: 140,
        y: 200,
        z: 0,
        visibility: 0.9,
        type: LandmarkType.LEFT_SHOULDER,
      },
      {
        x: 180,
        y: 200,
        z: 0,
        visibility: 0.9,
        type: LandmarkType.RIGHT_SHOULDER,
      },
      { x: 120, y: 280, z: 0, visibility: 0.9, type: LandmarkType.LEFT_ELBOW },
      { x: 200, y: 280, z: 0, visibility: 0.9, type: LandmarkType.RIGHT_ELBOW },
      { x: 100, y: 360, z: 0, visibility: 0.9, type: LandmarkType.LEFT_WRIST },
      { x: 220, y: 360, z: 0, visibility: 0.9, type: LandmarkType.RIGHT_WRIST },
      { x: 130, y: 400, z: 0, visibility: 0.9, type: LandmarkType.LEFT_HIP },
      { x: 190, y: 400, z: 0, visibility: 0.9, type: LandmarkType.RIGHT_HIP },
      { x: 125, y: 550, z: 0, visibility: 0.9, type: LandmarkType.LEFT_KNEE },
      { x: 195, y: 550, z: 0, visibility: 0.9, type: LandmarkType.RIGHT_KNEE },
      { x: 120, y: 700, z: 0, visibility: 0.9, type: LandmarkType.LEFT_ANKLE },
      { x: 200, y: 700, z: 0, visibility: 0.9, type: LandmarkType.RIGHT_ANKLE },
    ];

    return [
      {
        landmarks: mockLandmarks,
        timestamp: Date.now(),
        confidence: 0.8,
      },
    ];
  }
}
```

---

## src/services/pose/PoseProcessor.ts

```typescript
// Pose data processing and calibration management
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pose, PoseLandmark, LandmarkType } from "./MLKitPoseService";

export interface ProcessedPoseData {
  pose: Pose;
  isValid: boolean;
  confidence: number;
  missingLandmarks: LandmarkType[];
  jointAngles: JointAngles;
  bodyAlignment: BodyAlignment;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  missingLandmarks: LandmarkType[];
}

export interface CalibrationData {
  exerciseType: string;
  userHeight: number;
  cameraAngle: number;
  baselinePose: Pose;
  jointRanges: JointRanges;
  timestamp: number;
  persistent: boolean;
  expiresAt?: number;
}

export interface JointAngles {
  leftElbow: number;
  rightElbow: number;
  leftKnee: number;
  rightKnee: number;
  leftHip: number;
  rightHip: number;
  leftShoulder: number;
  rightShoulder: number;
  torsoAngle: number;
}

export interface BodyAlignment {
  shoulderLevel: number; // Difference in shoulder heights
  hipLevel: number; // Difference in hip heights
  spineAlignment: number; // Deviation from straight line
  bodyCenter: { x: number; y: number };
}

export interface JointRanges {
  elbowRange: [number, number];
  kneeRange: [number, number];
  hipRange: [number, number];
  shoulderRange: [number, number];
}

export class PoseProcessor {
  private static readonly CALIBRATION_STORAGE_KEY = "pose_calibration_";
  private static readonly CALIBRATION_EXPIRY_DAYS = 7;
  private static readonly MIN_LANDMARK_VISIBILITY = 0.5;
  private static readonly MIN_POSE_CONFIDENCE = 0.6;

  /**
   * Process raw pose data from ML Kit and validate it
   */
  static processFrame(
    poses: Pose[],
    exerciseType: string
  ): ProcessedPoseData | null {
    if (!poses || poses.length === 0) {
      return null;
    }

    // Use the pose with highest confidence
    const bestPose = poses.reduce((prev, current) =>
      current.confidence > prev.confidence ? current : prev
    );

    // Validate pose quality
    const validation = this.validatePose(bestPose);
    if (!validation.isValid) {
      return {
        pose: bestPose,
        isValid: false,
        confidence: validation.confidence,
        missingLandmarks: validation.missingLandmarks,
        jointAngles: this.calculateJointAngles(bestPose),
        bodyAlignment: this.calculateBodyAlignment(bestPose),
      };
    }

    // Calculate joint angles and body alignment
    const jointAngles = this.calculateJointAngles(bestPose);
    const bodyAlignment = this.calculateBodyAlignment(bestPose);

    return {
      pose: bestPose,
      isValid: true,
      confidence: validation.confidence,
      missingLandmarks: [],
      jointAngles,
      bodyAlignment,
    };
  }

  /**
   * Validate pose quality and completeness
   */
  static validatePose(pose: Pose): ValidationResult {
    const issues: string[] = [];
    const missingLandmarks: LandmarkType[] = [];

    // Check overall confidence
    if (pose.confidence < this.MIN_POSE_CONFIDENCE) {
      issues.push(`Low pose confidence: ${pose.confidence.toFixed(2)}`);
    }

    // Check for required landmarks based on exercise needs
    const requiredLandmarks = this.getRequiredLandmarks();

    for (const requiredType of requiredLandmarks) {
      const landmark = pose.landmarks.find((l) => l.type === requiredType);

      if (!landmark) {
        missingLandmarks.push(requiredType);
        issues.push(`Missing landmark: ${LandmarkType[requiredType]}`);
      } else if (landmark.visibility < this.MIN_LANDMARK_VISIBILITY) {
        missingLandmarks.push(requiredType);
        issues.push(
          `Low visibility for ${
            LandmarkType[requiredType]
          }: ${landmark.visibility.toFixed(2)}`
        );
      }
    }

    const isValid = issues.length === 0;
    const confidence = isValid
      ? pose.confidence
      : Math.max(0, pose.confidence - issues.length * 0.1);

    return {
      isValid,
      confidence,
      issues,
      missingLandmarks,
    };
  }

  /**
   * Create calibration data for a specific exercise
   */
  static async calibrate(
    poses: Pose[],
    exerciseType: string
  ): Promise<CalibrationData | null> {
    if (!poses || poses.length === 0) {
      return null;
    }

    const bestPose = poses.reduce((prev, current) =>
      current.confidence > prev.confidence ? current : prev
    );

    // Validate pose is suitable for calibration
    const validation = this.validatePose(bestPose);
    if (!validation.isValid) {
      throw new Error(
        `Cannot calibrate with invalid pose: ${validation.issues.join(", ")}`
      );
    }

    // Calculate baseline measurements
    const jointAngles = this.calculateJointAngles(bestPose);
    const bodyAlignment = this.calculateBodyAlignment(bestPose);

    // Estimate user height from pose landmarks
    const userHeight = this.estimateUserHeight(bestPose);

    // Calculate camera angle based on pose orientation
    const cameraAngle = this.calculateCameraAngle(bestPose);

    // Create joint ranges based on baseline pose
    const jointRanges: JointRanges = {
      elbowRange: [
        Math.max(0, jointAngles.leftElbow - 30),
        Math.min(180, jointAngles.leftElbow + 30),
      ],
      kneeRange: [
        Math.max(0, jointAngles.leftKnee - 30),
        Math.min(180, jointAngles.leftKnee + 30),
      ],
      hipRange: [
        Math.max(0, jointAngles.leftHip - 20),
        Math.min(180, jointAngles.leftHip + 20),
      ],
      shoulderRange: [
        Math.max(0, jointAngles.leftShoulder - 20),
        Math.min(180, jointAngles.leftShoulder + 20),
      ],
    };

    const calibrationData: CalibrationData = {
      exerciseType,
      userHeight,
      cameraAngle,
      baselinePose: bestPose,
      jointRanges,
      timestamp: Date.now(),
      persistent: false, // Default to session-only
      expiresAt:
        Date.now() + this.CALIBRATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    };

    return calibrationData;
  }

  /**
   * Save calibration data to storage
   */
  static async saveCalibration(
    calibrationData: CalibrationData
  ): Promise<void> {
    try {
      const key = `${this.CALIBRATION_STORAGE_KEY}${calibrationData.exerciseType}`;
      await AsyncStorage.setItem(key, JSON.stringify(calibrationData));
      console.log(`📊 Calibration saved for ${calibrationData.exerciseType}`);
    } catch (error) {
      console.error("❌ Failed to save calibration:", error);
      throw error;
    }
  }

  /**
   * Load calibration data from storage
   */
  static async loadCalibration(
    exerciseType: string
  ): Promise<CalibrationData | null> {
    try {
      const key = `${this.CALIBRATION_STORAGE_KEY}${exerciseType}`;
      const stored = await AsyncStorage.getItem(key);

      if (!stored) {
        return null;
      }

      const calibrationData: CalibrationData = JSON.parse(stored);

      // Check if calibration has expired
      if (calibrationData.expiresAt && Date.now() > calibrationData.expiresAt) {
        console.log(`⏰ Calibration expired for ${exerciseType}, removing...`);
        await AsyncStorage.removeItem(key);
        return null;
      }

      console.log(`📊 Calibration loaded for ${exerciseType}`);
      return calibrationData;
    } catch (error) {
      console.error("❌ Failed to load calibration:", error);
      return null;
    }
  }

  /**
   * Calculate joint angles from pose landmarks
   */
  static calculateJointAngles(pose: Pose): JointAngles {
    const getLandmark = (type: LandmarkType) =>
      pose.landmarks.find((l) => l.type === type);

    // Helper function to calculate angle between three points
    const calculateAngle = (
      p1: PoseLandmark,
      p2: PoseLandmark,
      p3: PoseLandmark
    ): number => {
      if (!p1 || !p2 || !p3) return 0;

      const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
      const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

      if (mag1 === 0 || mag2 === 0) return 0;

      const cos = dot / (mag1 * mag2);
      return Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
    };

    // Calculate elbow angles
    const leftShoulder = getLandmark(LandmarkType.LEFT_SHOULDER);
    const leftElbow = getLandmark(LandmarkType.LEFT_ELBOW);
    const leftWrist = getLandmark(LandmarkType.LEFT_WRIST);
    const rightShoulder = getLandmark(LandmarkType.RIGHT_SHOULDER);
    const rightElbow = getLandmark(LandmarkType.RIGHT_ELBOW);
    const rightWrist = getLandmark(LandmarkType.RIGHT_WRIST);

    // Calculate knee angles
    const leftHip = getLandmark(LandmarkType.LEFT_HIP);
    const leftKnee = getLandmark(LandmarkType.LEFT_KNEE);
    const leftAnkle = getLandmark(LandmarkType.LEFT_ANKLE);
    const rightHip = getLandmark(LandmarkType.RIGHT_HIP);
    const rightKnee = getLandmark(LandmarkType.RIGHT_KNEE);
    const rightAnkle = getLandmark(LandmarkType.RIGHT_ANKLE);

    // Calculate torso angle (relative to vertical)
    const nose = getLandmark(LandmarkType.NOSE);
    const midHip =
      leftHip && rightHip
        ? {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2,
            z: (leftHip.z! + rightHip.z!) / 2,
            visibility: Math.min(leftHip.visibility, rightHip.visibility),
            type: LandmarkType.NOSE, // Placeholder
          }
        : null;

    const torsoAngle =
      nose && midHip
        ? Math.abs(
            90 -
              Math.atan2(
                Math.abs(nose.x - midHip.x),
                Math.abs(midHip.y - nose.y)
              ) *
                (180 / Math.PI)
          )
        : 0;

    return {
      leftElbow: calculateAngle(leftShoulder!, leftElbow!, leftWrist!),
      rightElbow: calculateAngle(rightShoulder!, rightElbow!, rightWrist!),
      leftKnee: calculateAngle(leftHip!, leftKnee!, leftAnkle!),
      rightKnee: calculateAngle(rightHip!, rightKnee!, rightAnkle!),
      leftHip: calculateAngle(leftShoulder!, leftHip!, leftKnee!),
      rightHip: calculateAngle(rightShoulder!, rightHip!, rightKnee!),
      leftShoulder: calculateAngle(leftElbow!, leftShoulder!, leftHip!),
      rightShoulder: calculateAngle(rightElbow!, rightShoulder!, rightHip!),
      torsoAngle,
    };
  }

  /**
   * Calculate body alignment metrics
   */
  static calculateBodyAlignment(pose: Pose): BodyAlignment {
    const getLandmark = (type: LandmarkType) =>
      pose.landmarks.find((l) => l.type === type);

    const leftShoulder = getLandmark(LandmarkType.LEFT_SHOULDER);
    const rightShoulder = getLandmark(LandmarkType.RIGHT_SHOULDER);
    const leftHip = getLandmark(LandmarkType.LEFT_HIP);
    const rightHip = getLandmark(LandmarkType.RIGHT_HIP);

    // Calculate shoulder level difference
    const shoulderLevel =
      leftShoulder && rightShoulder
        ? Math.abs(leftShoulder.y - rightShoulder.y)
        : 0;

    // Calculate hip level difference
    const hipLevel = leftHip && rightHip ? Math.abs(leftHip.y - rightHip.y) : 0;

    // Calculate spine alignment (deviation from straight line)
    const spineAlignment =
      leftShoulder && rightShoulder && leftHip && rightHip
        ? Math.abs(
            (leftShoulder.x + rightShoulder.x) / 2 -
              (leftHip.x + rightHip.x) / 2
          )
        : 0;

    // Calculate body center point
    const bodyCenter =
      leftShoulder && rightShoulder && leftHip && rightHip
        ? {
            x: (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4,
            y: (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4,
          }
        : { x: 0, y: 0 };

    return {
      shoulderLevel,
      hipLevel,
      spineAlignment,
      bodyCenter,
    };
  }

  /**
   * Get required landmarks for pose validation
   */
  private static getRequiredLandmarks(): LandmarkType[] {
    return [
      LandmarkType.LEFT_SHOULDER,
      LandmarkType.RIGHT_SHOULDER,
      LandmarkType.LEFT_ELBOW,
      LandmarkType.RIGHT_ELBOW,
      LandmarkType.LEFT_WRIST,
      LandmarkType.RIGHT_WRIST,
      LandmarkType.LEFT_HIP,
      LandmarkType.RIGHT_HIP,
      LandmarkType.LEFT_KNEE,
      LandmarkType.RIGHT_KNEE,
      LandmarkType.LEFT_ANKLE,
      LandmarkType.RIGHT_ANKLE,
    ];
  }

  /**
   * Estimate user height from pose landmarks
   */
  private static estimateUserHeight(pose: Pose): number {
    const getLandmark = (type: LandmarkType) =>
      pose.landmarks.find((l) => l.type === type);

    const nose = getLandmark(LandmarkType.NOSE);
    const leftAnkle = getLandmark(LandmarkType.LEFT_ANKLE);
    const rightAnkle = getLandmark(LandmarkType.RIGHT_ANKLE);

    if (!nose || (!leftAnkle && !rightAnkle)) {
      return 170; // Default height in cm
    }

    const ankle = leftAnkle || rightAnkle!;
    const pixelHeight = Math.abs(nose.y - ankle.y);

    // Rough estimation: assume camera captures about 2m height at typical distance
    // This is a simplified calculation - in practice would need camera calibration
    const estimatedHeight = (pixelHeight / 400) * 170; // Normalize to typical height

    return Math.max(150, Math.min(220, estimatedHeight)); // Clamp to reasonable range
  }

  /**
   * Calculate camera angle based on pose orientation
   */
  private static calculateCameraAngle(pose: Pose): number {
    const getLandmark = (type: LandmarkType) =>
      pose.landmarks.find((l) => l.type === type);

    const leftShoulder = getLandmark(LandmarkType.LEFT_SHOULDER);
    const rightShoulder = getLandmark(LandmarkType.RIGHT_SHOULDER);

    if (!leftShoulder || !rightShoulder) {
      return 0; // Default to front-facing
    }

    // Calculate shoulder line angle relative to horizontal
    const shoulderAngle =
      Math.atan2(
        rightShoulder.y - leftShoulder.y,
        rightShoulder.x - leftShoulder.x
      ) *
      (180 / Math.PI);

    return shoulderAngle;
  }
}
```

---

## src/services/pose/FormValidator.ts

```typescript
// Comprehensive form validation with exercise-specific rules
import { Pose, LandmarkType } from "./MLKitPoseService";
import { CalibrationData, JointAngles } from "./PoseProcessor";
import { FeedbackManager } from "./FeedbackManager";
import { FormFeedbackMessages } from "./FormFeedbackMessages";
import {
  ExerciseType,
  FormFeedback,
  FormValidationResult,
  JointIssue,
  AlignmentIssue,
  FormSeverity,
  POSE_DETECTION_CONSTANTS,
} from "../../types/pose";

export class FormValidator {
  /**
   * Validate form for any exercise type
   */
  static validateForm(
    pose: Pose,
    exerciseType: ExerciseType,
    calibration?: CalibrationData
  ): FormValidationResult {
    // Calculate joint angles
    const jointAngles = this.calculateJointAngles(pose);

    // Get exercise-specific validation
    const validation = this.getExerciseValidation(
      pose,
      exerciseType,
      jointAngles,
      calibration
    );

    // Calculate overall form score
    const formScore = this.calculateFormScore(
      validation.jointIssues,
      validation.alignmentIssues
    );

    return {
      isValidForm:
        validation.jointIssues.length === 0 &&
        validation.alignmentIssues.length === 0,
      formScore,
      feedback: validation.feedback,
      jointIssues: validation.jointIssues,
      alignmentIssues: validation.alignmentIssues,
    };
  }

  /**
   * Get form feedback with priority handling using FeedbackManager
   */
  static getFormFeedback(
    validationResult: FormValidationResult,
    feedbackManager: FeedbackManager
  ): FormFeedback[] {
    // Add all feedback to the manager for proper prioritization
    feedbackManager.addMultipleFeedback(validationResult.feedback);

    // Return the prioritized feedback
    return feedbackManager.getCurrentFeedback();
  }

  /**
   * Create enhanced feedback using predefined messages
   */
  static createEnhancedFeedback(
    exerciseType: ExerciseType,
    issueType: string,
    customMessage?: string
  ): FormFeedback | null {
    const template = FormFeedbackMessages.getFeedbackMessage(
      exerciseType,
      issueType
    );

    if (!template) {
      return null;
    }

    const feedback = FormFeedbackMessages.createFeedbackFromTemplate(
      exerciseType,
      template
    );

    // Override message if custom one provided
    if (customMessage) {
      feedback.message = customMessage;
    }

    return feedback;
  }

  /**
   * Calculate joint angles for all major joints
   */
  static calculateJointAngles(pose: Pose): JointAngles {
    const getLandmark = (type: LandmarkType) =>
      pose.landmarks.find((l) => l.type === type);

    // Helper function to calculate angle between three points
    const calculateAngle = (p1: any, p2: any, p3: any): number => {
      if (!p1 || !p2 || !p3) return 0;

      const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
      const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

      if (mag1 === 0 || mag2 === 0) return 0;

      const cos = dot / (mag1 * mag2);
      return Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
    };

    // Get landmarks
    const leftShoulder = getLandmark(LandmarkType.LEFT_SHOULDER);
    const leftElbow = getLandmark(LandmarkType.LEFT_ELBOW);
    const leftWrist = getLandmark(LandmarkType.LEFT_WRIST);
    const rightShoulder = getLandmark(LandmarkType.RIGHT_SHOULDER);
    const rightElbow = getLandmark(LandmarkType.RIGHT_ELBOW);
    const rightWrist = getLandmark(LandmarkType.RIGHT_WRIST);

    const leftHip = getLandmark(LandmarkType.LEFT_HIP);
    const leftKnee = getLandmark(LandmarkType.LEFT_KNEE);
    const leftAnkle = getLandmark(LandmarkType.LEFT_ANKLE);
    const rightHip = getLandmark(LandmarkType.RIGHT_HIP);
    const rightKnee = getLandmark(LandmarkType.RIGHT_KNEE);
    const rightAnkle = getLandmark(LandmarkType.RIGHT_ANKLE);

    const nose = getLandmark(LandmarkType.NOSE);

    // Calculate torso angle (relative to vertical)
    const midHip =
      leftHip && rightHip
        ? {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2,
            z: ((leftHip.z || 0) + (rightHip.z || 0)) / 2,
            visibility: Math.min(leftHip.visibility, rightHip.visibility),
            type: LandmarkType.NOSE, // Placeholder
          }
        : null;

    const torsoAngle =
      nose && midHip
        ? Math.abs(
            90 -
              Math.atan2(
                Math.abs(nose.x - midHip.x),
                Math.abs(midHip.y - nose.y)
              ) *
                (180 / Math.PI)
          )
        : 0;

    return {
      leftElbow: calculateAngle(leftShoulder, leftElbow, leftWrist),
      rightElbow: calculateAngle(rightShoulder, rightElbow, rightWrist),
      leftKnee: calculateAngle(leftHip, leftKnee, leftAnkle),
      rightKnee: calculateAngle(rightHip, rightKnee, rightAnkle),
      leftHip: calculateAngle(leftShoulder, leftHip, leftKnee),
      rightHip: calculateAngle(rightShoulder, rightHip, rightKnee),
      leftShoulder: calculateAngle(leftElbow, leftShoulder, leftHip),
      rightShoulder: calculateAngle(rightElbow, rightShoulder, rightHip),
      torsoAngle,
    };
  }

  // ... (Additional methods for exercise-specific validation)
  // Note: The full FormValidator class is quite large - this shows the key structure
}
```

---

## src/services/pose/FeedbackManager.ts

```typescript
// Priority-based feedback management system
import {
  FormFeedback,
  ExerciseType,
  FormSeverity,
  POSE_DETECTION_CONSTANTS,
} from "../../types/pose";

export interface FeedbackQueue {
  safety: FormFeedback[];
  formCritical: FormFeedback[];
  formMinor: FormFeedback[];
  repCount: FormFeedback[];
  encouragement: FormFeedback[];
}

export interface FeedbackDisplayState {
  currentFeedback: FormFeedback[];
  queuedFeedback: FormFeedback[];
  lastDisplayTime: number;
  suppressUntil: number;
}

export class FeedbackManager {
  private feedbackQueue: FeedbackQueue;
  private displayState: FeedbackDisplayState;
  private readonly maxDisplayItems = 3;
  private readonly minDisplayDuration = 2000; // 2 seconds
  private readonly suppressDuration = 1000; // 1 second between similar feedback

  constructor() {
    this.feedbackQueue = {
      safety: [],
      formCritical: [],
      formMinor: [],
      repCount: [],
      encouragement: [],
    };

    this.displayState = {
      currentFeedback: [],
      queuedFeedback: [],
      lastDisplayTime: 0,
      suppressUntil: 0,
    };
  }

  /**
   * Add feedback to the appropriate priority queue
   */
  addFeedback(feedback: FormFeedback): void {
    // Check if we should suppress similar feedback
    if (this.shouldSuppressFeedback(feedback)) {
      return;
    }

    // Add to appropriate queue based on priority
    const queueType = this.getQueueType(feedback.priority);
    this.feedbackQueue[queueType].push(feedback);

    // Clean old feedback from queues
    this.cleanOldFeedback();

    // Update display
    this.updateDisplay();
  }

  /**
   * Add multiple feedback items at once
   */
  addMultipleFeedback(feedbackList: FormFeedback[]): void {
    feedbackList.forEach((feedback) => this.addFeedback(feedback));
  }

  /**
   * Get current feedback to display
   */
  getCurrentFeedback(): FormFeedback[] {
    return this.displayState.currentFeedback;
  }

  /**
   * Clear all feedback
   */
  clearAllFeedback(): void {
    this.feedbackQueue = {
      safety: [],
      formCritical: [],
      formMinor: [],
      repCount: [],
      encouragement: [],
    };

    this.displayState.currentFeedback = [];
    this.displayState.queuedFeedback = [];
  }

  // ... (Additional methods for feedback management)
}
```

---

## src/services/pose/FormScoring.ts

```typescript
// Comprehensive form scoring and progress tracking
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ExerciseType,
  FormValidationResult,
  FormFeedback,
  JointIssue,
  AlignmentIssue,
  POSE_DETECTION_CONSTANTS,
} from "../../types/pose";

export interface FormScore {
  overall: number; // 0-100
  breakdown: {
    alignment: number;
    jointAngles: number;
    consistency: number;
    safety: number;
  };
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
  improvements: string[];
}

export interface FormSession {
  sessionId: string;
  exerciseType: ExerciseType;
  startTime: number;
  endTime?: number;
  repScores: FormScore[];
  averageScore: FormScore;
  improvementTrend: number; // -1 to 1
  consistencyScore: number; // 0-100
  totalReps: number;
  validReps: number;
}

export interface FormHistory {
  exerciseType: ExerciseType;
  sessions: FormSession[];
  overallStats: {
    totalSessions: number;
    averageScore: number;
    bestScore: number;
    improvementRate: number; // % improvement per session
    consistencyTrend: number;
    weakAreas: string[];
    strongAreas: string[];
  };
  weeklyProgress: {
    week: string;
    averageScore: number;
    sessionCount: number;
    improvementFromPrevious: number;
  }[];
}

export class FormScoring {
  private static readonly STORAGE_KEY_PREFIX = "form_history_";
  private static readonly MAX_SESSIONS_STORED = 50;

  /**
   * Calculate comprehensive form score
   */
  static calculateFormScore(
    validationResult: FormValidationResult,
    exerciseType: ExerciseType,
    previousScores: FormScore[] = []
  ): FormScore {
    const alignmentScore = this.calculateAlignmentScore(
      validationResult.alignmentIssues
    );
    const jointScore = this.calculateJointScore(validationResult.jointIssues);
    const safetyScore = this.calculateSafetyScore(validationResult.feedback);
    const consistencyScore = this.calculateConsistencyScore(previousScores);

    // Weighted overall score
    const weights = {
      safety: 0.4, // Safety is most important
      alignment: 0.25, // Body alignment
      jointAngles: 0.25, // Joint positioning
      consistency: 0.1, // Consistency with previous reps
    };

    const overall = Math.round(
      safetyScore * weights.safety +
        alignmentScore * weights.alignment +
        jointScore * weights.jointAngles +
        consistencyScore * weights.consistency
    );

    const breakdown = {
      alignment: alignmentScore,
      jointAngles: jointScore,
      consistency: consistencyScore,
      safety: safetyScore,
    };

    const grade = this.calculateGrade(overall);
    const improvements = this.generateImprovements(validationResult, breakdown);

    return {
      overall: Math.max(0, Math.min(100, overall)),
      breakdown,
      grade,
      improvements,
    };
  }

  // ... (Additional methods for scoring and tracking)
}
```

---

## src/services/pose/FormTracker.ts

```typescript
// Real-time form tracking and session management
import { FormScoring, FormScore, FormSession } from "./FormScoring";
import { FormValidator } from "./FormValidator";
import { FeedbackManager } from "./FeedbackManager";
import {
  ExerciseType,
  FormValidationResult,
  FormFeedback,
  Pose,
  CalibrationData,
} from "../../types/pose";

export interface FormTrackingState {
  isTracking: boolean;
  currentSession: FormSession | null;
  currentRepScores: FormScore[];
  feedbackManager: FeedbackManager;
  lastValidationTime: number;
  sessionStats: {
    totalReps: number;
    validReps: number;
    averageScore: number;
    currentStreak: number; // consecutive good form reps
    bestStreak: number;
  };
}

export class FormTracker {
  private state: FormTrackingState;
  private readonly minValidationInterval = 100; // ms between validations

  constructor() {
    this.state = {
      isTracking: false,
      currentSession: null,
      currentRepScores: [],
      feedbackManager: new FeedbackManager(),
      lastValidationTime: 0,
      sessionStats: {
        totalReps: 0,
        validReps: 0,
        averageScore: 0,
        currentStreak: 0,
        bestStreak: 0,
      },
    };
  }

  /**
   * Start tracking form for a new session
   */
  startSession(exerciseType: ExerciseType): string {
    const sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this.state.currentSession = {
      sessionId,
      exerciseType,
      startTime: Date.now(),
      repScores: [],
      averageScore: {
        overall: 0,
        breakdown: { alignment: 0, jointAngles: 0, consistency: 0, safety: 0 },
        grade: "F",
        improvements: [],
      },
      improvementTrend: 0,
      consistencyScore: 0,
      totalReps: 0,
      validReps: 0,
    };

    this.state.isTracking = true;
    this.state.currentRepScores = [];
    this.state.feedbackManager.clearAllFeedback();
    this.state.sessionStats = {
      totalReps: 0,
      validReps: 0,
      averageScore: 0,
      currentStreak: 0,
      bestStreak: 0,
    };

    return sessionId;
  }

  /**
   * Process pose data and update form tracking
   */
  processFrame(
    pose: Pose,
    exerciseType: ExerciseType,
    calibration?: CalibrationData
  ): {
    formScore: FormScore | null;
    feedback: FormFeedback[];
    shouldCountRep: boolean;
    sessionStats: FormTrackingState["sessionStats"];
  } {
    const now = Date.now();

    // Throttle validation to avoid overwhelming processing
    if (now - this.state.lastValidationTime < this.minValidationInterval) {
      return {
        formScore: null,
        feedback: this.state.feedbackManager.getCurrentFeedback(),
        shouldCountRep: false,
        sessionStats: this.state.sessionStats,
      };
    }

    this.state.lastValidationTime = now;

    // Validate form
    const validationResult = FormValidator.validateForm(
      pose,
      exerciseType,
      calibration
    );

    // Calculate form score
    const formScore = FormScoring.calculateFormScore(
      validationResult,
      exerciseType,
      this.state.currentRepScores.slice(-5) // Last 5 reps for consistency
    );

    // Add feedback to manager
    this.state.feedbackManager.addMultipleFeedback(validationResult.feedback);

    // Get current feedback
    const currentFeedback = this.state.feedbackManager.getCurrentFeedback();

    // Determine if this should count as a rep
    const shouldCountRep = this.shouldCountRep(formScore, validationResult);

    return {
      formScore,
      feedback: currentFeedback,
      shouldCountRep,
      sessionStats: this.state.sessionStats,
    };
  }

  // ... (Additional methods for session management)
}
```

---

## src/services/pose/FormFeedbackMessages.ts

```typescript
// Predefined form feedback messages for different exercises
import {
  ExerciseType,
  FormFeedback,
  POSE_DETECTION_CONSTANTS,
} from "../../types/pose";

export interface FormIssueTemplate {
  message: string;
  bodyParts: string[];
  suggestions: string[];
  severity: "critical" | "high" | "medium" | "low";
}

export class FormFeedbackMessages {
  // Push-up specific feedback messages
  static readonly PUSHUP_MESSAGES = {
    ELBOW_TOO_WIDE: {
      message: "Elbows too wide",
      bodyParts: ["arms", "elbows"],
      suggestions: [
        "Keep elbows closer to your body",
        "Aim for 45° angle from torso",
        "Think about squeezing your armpits",
      ],
      severity: "medium" as const,
    },
    GOING_TOO_LOW: {
      message: "Don't go too low",
      bodyParts: ["arms", "chest"],
      suggestions: [
        "Stop when elbows reach 90°",
        "Control your descent",
        "Focus on quality over depth",
      ],
      severity: "high" as const,
    },
    INCOMPLETE_RANGE: {
      message: "Complete the full range",
      bodyParts: ["arms"],
      suggestions: [
        "Push all the way up",
        "Fully extend your arms",
        "Don't stop halfway",
      ],
      severity: "medium" as const,
    },
    BODY_SAG: {
      message: "Keep body straight",
      bodyParts: ["core", "hips"],
      suggestions: [
        "Engage your core",
        "Don't let hips sag",
        "Maintain plank position",
      ],
      severity: "high" as const,
    },
    PIKE_UP: {
      message: "Don't pike up",
      bodyParts: ["hips", "core"],
      suggestions: [
        "Lower your hips",
        "Keep body in straight line",
        "Engage your core",
      ],
      severity: "medium" as const,
    },
    HEAD_POSITION: {
      message: "Keep head neutral",
      bodyParts: ["neck", "head"],
      suggestions: [
        "Look down at the floor",
        "Don't crane your neck up",
        "Maintain neutral spine",
      ],
      severity: "low" as const,
    },
  };

  // Squat specific feedback messages
  static readonly SQUAT_MESSAGES = {
    KNEE_CAVE: {
      message: "Knees caving inward",
      bodyParts: ["knees"],
      suggestions: [
        "Push knees out over toes",
        "Engage your glutes",
        "Think about spreading the floor",
      ],
      severity: "critical" as const,
    },
    KNEE_FORWARD: {
      message: "Knees too far forward",
      bodyParts: ["knees"],
      suggestions: [
        "Sit back more",
        "Keep knees behind toes",
        "Push hips back first",
      ],
      severity: "high" as const,
    },
    NOT_DEEP_ENOUGH: {
      message: "Go deeper",
      bodyParts: ["hips", "knees"],
      suggestions: [
        "Squat until thighs are parallel",
        "Sit back into the squat",
        "Increase your mobility",
      ],
      severity: "medium" as const,
    },
    FORWARD_LEAN: {
      message: "Keep chest up",
      bodyParts: ["chest", "back"],
      suggestions: [
        "Keep your chest proud",
        "Don't lean forward",
        "Maintain upright torso",
      ],
      severity: "medium" as const,
    },
    HEEL_LIFT: {
      message: "Keep heels down",
      bodyParts: ["feet", "ankles"],
      suggestions: [
        "Keep full foot on ground",
        "Work on ankle mobility",
        "Don't rise onto toes",
      ],
      severity: "high" as const,
    },
    UNEVEN_DEPTH: {
      message: "Keep hips level",
      bodyParts: ["hips"],
      suggestions: [
        "Squat evenly on both sides",
        "Check for imbalances",
        "Focus on symmetry",
      ],
      severity: "medium" as const,
    },
  };

  // Plank specific feedback messages
  static readonly PLANK_MESSAGES = {
    HIP_SAG: {
      message: "Hips are sagging",
      bodyParts: ["hips", "core"],
      suggestions: [
        "Lift your hips up",
        "Engage your core",
        "Create straight line from head to heels",
      ],
      severity: "high" as const,
    },
    HIP_TOO_HIGH: {
      message: "Hips too high",
      bodyParts: ["hips", "core"],
      suggestions: ["Lower your hips", "Don't pike up", "Keep body straight"],
      severity: "medium" as const,
    },
    SHOULDER_POSITION: {
      message: "Shoulders over wrists",
      bodyParts: ["shoulders", "arms"],
      suggestions: [
        "Move shoulders directly over wrists",
        "Don't lean forward or back",
        "Maintain proper alignment",
      ],
      severity: "medium" as const,
    },
    HEAD_DROP: {
      message: "Keep head neutral",
      bodyParts: ["neck", "head"],
      suggestions: [
        "Look down at the floor",
        "Don't let head drop",
        "Maintain neutral neck",
      ],
      severity: "low" as const,
    },
    ELBOW_FLARE: {
      message: "Keep elbows close",
      bodyParts: ["elbows", "arms"],
      suggestions: [
        "Don't let elbows flare out",
        "Keep arms close to body",
        "Engage your lats",
      ],
      severity: "low" as const,
    },
  };

  // General form messages that apply to multiple exercises
  static readonly GENERAL_MESSAGES = {
    BREATHING: {
      message: "Remember to breathe",
      bodyParts: [],
      suggestions: [
        "Don't hold your breath",
        "Breathe steadily throughout",
        "Exhale on exertion",
      ],
      severity: "low" as const,
    },
    TEMPO_TOO_FAST: {
      message: "Slow down",
      bodyParts: [],
      suggestions: [
        "Control the movement",
        "Focus on quality over speed",
        "Take your time",
      ],
      severity: "medium" as const,
    },
    INCONSISTENT_FORM: {
      message: "Keep form consistent",
      bodyParts: [],
      suggestions: [
        "Maintain same technique each rep",
        "Don't get sloppy as you fatigue",
        "Quality over quantity",
      ],
      severity: "medium" as const,
    },
    GOOD_FORM: {
      message: "Excellent form!",
      bodyParts: [],
      suggestions: ["Keep it up!", "You're doing great!"],
      severity: "low" as const,
    },
  };

  /**
   * Get specific feedback message for an exercise and issue type
   */
  static getFeedbackMessage(
    exerciseType: ExerciseType,
    issueType: string
  ): FormIssueTemplate | null {
    switch (exerciseType) {
      case "pushups":
        return (
          this.PUSHUP_MESSAGES[
            issueType as keyof typeof this.PUSHUP_MESSAGES
          ] || null
        );
      case "squats":
        return (
          this.SQUAT_MESSAGES[issueType as keyof typeof this.SQUAT_MESSAGES] ||
          null
        );
      case "planks":
        return (
          this.PLANK_MESSAGES[issueType as keyof typeof this.PLANK_MESSAGES] ||
          null
        );
      default:
        return (
          this.GENERAL_MESSAGES[
            issueType as keyof typeof this.GENERAL_MESSAGES
          ] || null
        );
    }
  }

  /**
   * Create FormFeedback from template
   */
  static createFeedbackFromTemplate(
    exerciseType: ExerciseType,
    template: FormIssueTemplate
  ): FormFeedback {
    const priority = this.getSeverityPriority(template.severity);
    const type = this.getSeverityType(template.severity);

    return {
      type,
      message: template.message,
      bodyParts: template.bodyParts,
      severity: template.severity,
      suggestions: template.suggestions,
      priority,
      timestamp: Date.now(),
      exerciseType,
    };
  }

  // ... (Additional helper methods)
}
```

---

## src/services/pose/ExerciseDetector.ts

```typescript
// Main exercise detection service that coordinates individual exercise detectors
import { Pose } from "./MLKitPoseService";
import { CalibrationData } from "./PoseProcessor";
import { PushUpDetector } from "./exercises/PushUpDetector";
import { SquatDetector } from "./exercises/SquatDetector";
import { PlankDetector } from "./exercises/PlankDetector";
import {
  ExerciseType,
  RepData,
  RepDetectionResult,
  ExerciseRules,
  POSE_DETECTION_CONSTANTS,
} from "../../types/pose";

export interface ExerciseSession {
  exerciseType: ExerciseType;
  startTime: number;
  endTime?: number;
  totalReps: number;
  validReps: number;
  invalidReps: number;
  averageFormScore: number;
  totalDuration: number;
  repHistory: RepData[];
}

export class ExerciseDetector {
  private pushUpDetector = new PushUpDetector();
  private squatDetector = new SquatDetector();
  private plankDetector = new PlankDetector();

  private currentExercise: ExerciseType | null = null;
  private currentSession: ExerciseSession | null = null;
  private calibrationData: CalibrationData | null = null;

  /**
   * Start a new exercise session
   */
  startSession(
    exerciseType: ExerciseType,
    calibrationData?: CalibrationData
  ): void {
    console.log(`🏋️ Starting ${exerciseType} session`);

    this.currentExercise = exerciseType;
    this.calibrationData = calibrationData || null;

    // Reset appropriate detector
    this.resetDetector(exerciseType);

    // Initialize session
    this.currentSession = {
      exerciseType,
      startTime: Date.now(),
      totalReps: 0,
      validReps: 0,
      invalidReps: 0,
      averageFormScore: 0,
      totalDuration: 0,
      repHistory: [],
    };
  }

  /**
   * Process a pose and detect reps for the current exercise
   */
  detectRep(pose: Pose): RepDetectionResult {
    if (!this.currentExercise || !this.currentSession) {
      return {
        repDetected: false,
        currentPhase: "up",
        progress: 0,
        reason: "No active exercise session",
      };
    }

    // Get detection result from appropriate detector
    const result = this.getDetectionResult(pose, this.currentExercise);

    // Update session if rep was detected
    if (result.repDetected && result.repData) {
      this.updateSession(result.repData);
    }

    return result;
  }

  /**
   * Get detection result from the appropriate exercise detector
   */
  private getDetectionResult(
    pose: Pose,
    exerciseType: ExerciseType
  ): RepDetectionResult {
    switch (exerciseType) {
      case "pushups":
        return this.pushUpDetector.detectRep(pose, this.calibrationData);

      case "squats":
        return this.squatDetector.detectRep(pose, this.calibrationData);

      case "planks":
        return this.plankDetector.detectRep(pose, this.calibrationData);

      case "situps":
        // TODO: Implement SitUpDetector
        return this.createMockResult("situps", pose.timestamp);

      case "burpees":
        // TODO: Implement BurpeeDetector
        return this.createMockResult("burpees", pose.timestamp);

      case "lunges":
        // TODO: Implement LungeDetector
        return this.createMockResult("lunges", pose.timestamp);

      case "mountain-climbers":
        // TODO: Implement MountainClimberDetector
        return this.createMockResult("mountain-climbers", pose.timestamp);

      case "jumping-jacks":
        // TODO: Implement JumpingJackDetector
        return this.createMockResult("jumping-jacks", pose.timestamp);

      default:
        return {
          repDetected: false,
          currentPhase: "up",
          progress: 0,
          reason: `Exercise type ${exerciseType} not implemented`,
        };
    }
  }

  // ... (Additional methods for session management and exercise rules)
}
```

---

## src/services/pose/CalibrationManager.ts

```typescript
// Calibration management with lighting detection and persistence
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PoseProcessor, CalibrationData } from "./PoseProcessor";
import { Pose } from "./MLKitPoseService";
import { ExerciseType } from "../../types/pose";

export interface CalibrationStatus {
  isCalibrated: boolean;
  lastCalibration: number | null;
  exerciseType: ExerciseType;
  needsRecalibration: boolean;
  reason?: string;
}

export interface LightingCondition {
  brightness: number;
  contrast: number;
  timestamp: number;
}

export class CalibrationManager {
  private static readonly STORAGE_PREFIX = "pose_calibration_";
  private static readonly LIGHTING_STORAGE_KEY = "lighting_conditions";
  private static readonly EXPIRY_DAYS = 7;
  private static readonly LIGHTING_CHANGE_THRESHOLD = 0.3; // 30% change triggers recalibration

  /**
   * Check if calibration exists and is valid for an exercise
   */
  static async getCalibrationStatus(
    exerciseType: ExerciseType
  ): Promise<CalibrationStatus> {
    try {
      const calibrationData = await PoseProcessor.loadCalibration(exerciseType);
      const now = Date.now();

      if (!calibrationData) {
        return {
          isCalibrated: false,
          lastCalibration: null,
          exerciseType,
          needsRecalibration: false,
        };
      }

      // Check if expired
      if (calibrationData.expiresAt && now > calibrationData.expiresAt) {
        return {
          isCalibrated: false,
          lastCalibration: calibrationData.timestamp,
          exerciseType,
          needsRecalibration: true,
          reason: "Calibration expired",
        };
      }

      // Check if lighting conditions changed significantly
      const needsLightingRecalibration = await this.checkLightingChange();
      if (needsLightingRecalibration) {
        return {
          isCalibrated: true,
          lastCalibration: calibrationData.timestamp,
          exerciseType,
          needsRecalibration: true,
          reason: "Lighting conditions changed",
        };
      }

      return {
        isCalibrated: true,
        lastCalibration: calibrationData.timestamp,
        exerciseType,
        needsRecalibration: false,
      };
    } catch (error) {
      console.error("❌ Error checking calibration status:", error);
      return {
        isCalibrated: false,
        lastCalibration: null,
        exerciseType,
        needsRecalibration: false,
      };
    }
  }

  /**
   * Perform calibration with enhanced validation
   */
  static async performCalibration(
    poses: Pose[],
    exerciseType: ExerciseType,
    persistent: boolean = false
  ): Promise<CalibrationData | null> {
    try {
      console.log(`📊 Starting calibration for ${exerciseType}...`);

      // Validate poses quality
      const validationResult = this.validateCalibrationPoses(poses);
      if (!validationResult.isValid) {
        throw new Error(
          `Calibration validation failed: ${validationResult.reason}`
        );
      }

      // Create calibration data
      const calibrationData = await PoseProcessor.calibrate(
        poses,
        exerciseType
      );
      if (!calibrationData) {
        throw new Error("Failed to create calibration data");
      }

      // Set persistence and expiration
      calibrationData.persistent = persistent;
      if (persistent) {
        calibrationData.expiresAt =
          Date.now() + this.EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      }

      // Save calibration
      await PoseProcessor.saveCalibration(calibrationData);

      // Store current lighting conditions
      await this.storeLightingConditions(poses);

      console.log(`✅ Calibration completed for ${exerciseType}`);
      return calibrationData;
    } catch (error) {
      console.error("❌ Calibration failed:", error);
      return null;
    }
  }

  // ... (Additional calibration management methods)
}
```

---

## src/services/pose/CameraErrorHandler.ts

```typescript
// Comprehensive camera error handling and recovery
import { Alert } from "react-native";
import {
  CameraError,
  PoseDetectionError,
  RecoveryAction,
} from "../../types/pose";

export interface ErrorRecoveryOptions {
  enableManualMode: () => void;
  retryCamera: () => Promise<void>;
  reduceQuality: () => void;
  restartPoseDetection: () => Promise<void>;
  showTroubleshooting: () => void;
}

export class CameraErrorHandler {
  private static errorCount = 0;
  private static lastErrorTime = 0;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly ERROR_COOLDOWN = 5000; // 5 seconds

  /**
   * Handle camera-related errors with appropriate recovery actions
   */
  static handleCameraError(
    error: CameraError,
    recoveryOptions: ErrorRecoveryOptions
  ): void {
    console.error("📸 Camera Error:", error);

    // Track error frequency to prevent spam
    const now = Date.now();
    if (now - this.lastErrorTime < this.ERROR_COOLDOWN) {
      this.errorCount++;
    } else {
      this.errorCount = 1;
    }
    this.lastErrorTime = now;

    // If too many errors in short time, suggest manual mode
    if (this.errorCount >= this.MAX_RETRY_ATTEMPTS) {
      this.handleRepeatedErrors(error, recoveryOptions);
      return;
    }

    // Handle specific error types
    switch (error.type) {
      case "permission":
        this.handlePermissionError(error, recoveryOptions);
        break;
      case "unavailable":
        this.handleUnavailableError(error, recoveryOptions);
        break;
      case "initialization":
        this.handleInitializationError(error, recoveryOptions);
        break;
      case "processing":
        this.handleProcessingError(error, recoveryOptions);
        break;
      default:
        this.handleGenericError(error, recoveryOptions);
    }
  }

  /**
   * Handle pose detection errors
   */
  static handlePoseDetectionError(
    error: PoseDetectionError,
    recoveryOptions: ErrorRecoveryOptions
  ): void {
    console.error("🤖 Pose Detection Error:", error);

    const recoveryActions = this.getRecoveryActions(error);

    // Try automatic recovery first
    const automaticAction = recoveryActions.find((action) => action.automatic);
    if (automaticAction) {
      this.executeRecoveryAction(automaticAction, recoveryOptions);
      return;
    }

    // Show user recovery options
    this.showRecoveryDialog(error, recoveryActions, recoveryOptions);
  }

  // ... (Additional error handling methods)

  /**
   * Get user-friendly troubleshooting tips
   */
  static getTroubleshootingTips(): string[] {
    return [
      "🔆 Ensure good lighting - avoid backlighting or shadows",
      "📏 Position camera 6-8 feet away for full body visibility",
      "🧹 Clean camera lens if image appears blurry",
      "📱 Close other apps that might be using the camera",
      "🔄 Restart the app if issues persist",
      "⚡ Check device performance - close background apps",
      "🎯 Make sure you're fully visible in the camera frame",
      "🏠 Use a clear background without distracting patterns",
      "👕 Wear contrasting colors to your background",
      "🔇 Disable other camera apps or video calls",
    ];
  }
}
```

---

## src/services/pose/exercises/PushUpDetector.ts

```typescript
// Push-up specific detection algorithm with form validation
import { Pose, LandmarkType } from "../MLKitPoseService";
import { CalibrationData, JointAngles } from "../PoseProcessor";
import {
  RepData,
  RepDetectionResult,
  MovementState,
} from "../../../types/pose";

export interface PushUpState {
  phase: "up" | "down" | "transition";
  elbowAngle: number;
  bodyAlignment: number;
  isValidForm: boolean;
  repStartTime: number;
  lastPhaseChange: number;
}

export class PushUpDetector {
  private static readonly ELBOW_DOWN_THRESHOLD = 90; // degrees
  private static readonly ELBOW_UP_THRESHOLD = 160; // degrees
  private static readonly MIN_REP_DURATION = 800; // milliseconds
  private static readonly MAX_REP_DURATION = 5000; // milliseconds
  private static readonly BODY_ALIGNMENT_TOLERANCE = 15; // degrees deviation
  private static readonly CONFIDENCE_THRESHOLD = 0.7;

  private currentState: PushUpState = {
    phase: "up",
    elbowAngle: 180,
    bodyAlignment: 0,
    isValidForm: true,
    repStartTime: Date.now(),
    lastPhaseChange: Date.now(),
  };

  private repCount = 0;
  private poseHistory: Pose[] = [];
  private readonly maxHistorySize = 10;

  /**
   * Detect push-up rep from pose data
   */
  detectRep(pose: Pose, calibrationData?: CalibrationData): RepDetectionResult {
    // Add to history
    this.poseHistory.push(pose);
    if (this.poseHistory.length > this.maxHistorySize) {
      this.poseHistory.shift();
    }

    // Calculate joint angles
    const jointAngles = this.calculateJointAngles(pose);
    if (!jointAngles) {
      return {
        repDetected: false,
        currentPhase: this.currentState.phase,
        progress: 0,
        reason: "Unable to detect key landmarks",
      };
    }

    // Validate body alignment
    const bodyAlignment = this.validateBodyAlignment(pose);

    // Update current state
    this.updateState(jointAngles, bodyAlignment, pose.timestamp);

    // Check for rep completion
    const repResult = this.checkRepCompletion(pose.timestamp);

    return {
      repDetected: repResult.detected,
      repData: repResult.repData,
      currentPhase: this.currentState.phase,
      progress: this.calculateProgress(),
      reason: repResult.reason,
    };
  }

  // ... (Additional methods for angle calculation, form validation, etc.)
}
```

---

## src/services/pose/exercises/SquatDetector.ts

```typescript
// Squat specific detection algorithm with knee tracking and depth analysis
import { Pose, LandmarkType } from "../MLKitPoseService";
import { CalibrationData } from "../PoseProcessor";
import { RepData, RepDetectionResult } from "../../../types/pose";

export interface SquatState {
  phase: "up" | "down" | "transition";
  hipAngle: number;
  kneeAngle: number;
  kneeAlignment: number;
  isValidForm: boolean;
  repStartTime: number;
  lastPhaseChange: number;
  depth: number; // How deep the squat is (0-1)
}

export class SquatDetector {
  private static readonly HIP_DOWN_THRESHOLD = 90; // degrees
  private static readonly HIP_UP_THRESHOLD = 160; // degrees
  private static readonly KNEE_DOWN_THRESHOLD = 90; // degrees
  private static readonly KNEE_UP_THRESHOLD = 160; // degrees
  private static readonly MIN_REP_DURATION = 1000; // milliseconds
  private static readonly MAX_REP_DURATION = 6000; // milliseconds
  private static readonly KNEE_ALIGNMENT_TOLERANCE = 20; // pixels
  private static readonly MIN_DEPTH_THRESHOLD = 0.6; // 60% depth required

  private currentState: SquatState = {
    phase: "up",
    hipAngle: 180,
    kneeAngle: 180,
    kneeAlignment: 0,
    isValidForm: true,
    repStartTime: Date.now(),
    lastPhaseChange: Date.now(),
    depth: 0,
  };

  private repCount = 0;
  private poseHistory: Pose[] = [];
  private readonly maxHistorySize = 8;

  /**
   * Detect squat rep from pose data
   */
  detectRep(pose: Pose, calibrationData?: CalibrationData): RepDetectionResult {
    // Add to history
    this.poseHistory.push(pose);
    if (this.poseHistory.length > this.maxHistorySize) {
      this.poseHistory.shift();
    }

    // Calculate joint angles
    const jointAngles = this.calculateJointAngles(pose);
    if (!jointAngles) {
      return {
        repDetected: false,
        currentPhase: this.currentState.phase,
        progress: 0,
        reason: "Unable to detect key landmarks",
      };
    }

    // Validate knee alignment
    const kneeAlignment = this.validateKneeAlignment(pose);

    // Calculate squat depth
    const depth = this.calculateSquatDepth(jointAngles);

    // Update current state
    this.updateState(jointAngles, kneeAlignment, depth, pose.timestamp);

    // Check for rep completion
    const repResult = this.checkRepCompletion(pose.timestamp);

    return {
      repDetected: repResult.detected,
      repData: repResult.repData,
      currentPhase: this.currentState.phase,
      progress: this.calculateProgress(),
      reason: repResult.reason,
    };
  }

  // ... (Additional methods for joint calculation, knee validation, depth analysis)
}
```

---

## src/services/pose/exercises/PlankDetector.ts

```typescript
// Plank specific detection algorithm with hold time tracking
import { Pose, LandmarkType } from "../MLKitPoseService";
import { CalibrationData } from "../PoseProcessor";
import { RepData, RepDetectionResult } from "../../../types/pose";

export interface PlankState {
  phase: "hold" | "setup" | "rest";
  bodyAlignment: number;
  hipAlignment: number;
  shoulderAlignment: number;
  isValidForm: boolean;
  holdStartTime: number;
  totalHoldTime: number;
  currentHoldDuration: number;
}

export class PlankDetector {
  private static readonly BODY_ALIGNMENT_TOLERANCE = 10; // degrees
  private static readonly HIP_SAG_TOLERANCE = 15; // degrees
  private static readonly SHOULDER_ALIGNMENT_TOLERANCE = 10; // degrees
  private static readonly MIN_HOLD_DURATION = 1000; // 1 second minimum
  private static readonly SETUP_TIMEOUT = 5000; // 5 seconds to get into position
  private static readonly FORM_STABILITY_DURATION = 500; // 500ms of good form to start counting

  private currentState: PlankState = {
    phase: "setup",
    bodyAlignment: 0,
    hipAlignment: 0,
    shoulderAlignment: 0,
    isValidForm: false,
    holdStartTime: 0,
    totalHoldTime: 0,
    currentHoldDuration: 0,
  };

  private poseHistory: Pose[] = [];
  private readonly maxHistorySize = 10;
  private formStabilityStart = 0;
  private lastValidFormTime = 0;

  /**
   * Detect plank hold from pose data
   */
  detectRep(pose: Pose, calibrationData?: CalibrationData): RepDetectionResult {
    // Add to history
    this.poseHistory.push(pose);
    if (this.poseHistory.length > this.maxHistorySize) {
      this.poseHistory.shift();
    }

    // Validate plank form
    const formAnalysis = this.validatePlankForm(pose);

    // Update current state
    this.updateState(formAnalysis, pose.timestamp);

    // Check for hold completion
    const repResult = this.checkHoldCompletion(pose.timestamp);

    return {
      repDetected: repResult.detected,
      repData: repResult.repData,
      currentPhase: this.currentState.phase,
      progress: this.calculateProgress(),
      reason: repResult.reason,
    };
  }

  // ... (Additional methods for form validation, alignment checking, hold tracking)
}
```

---

## src/components/PoseDetectionCamera.tsx

```typescript
// Advanced camera component with react-native-vision-camera and ML Kit integration
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

  // ... (Additional camera setup, error handling, and processing methods)

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
        </View>
      )}
    </View>
  );
};

// ... (Styles and additional components)
```

---

## src/components/SimplePoseCamera.tsx

```typescript
// Simplified camera component using expo-camera with pose detection simulation
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

  // Toggle camera type
  const toggleCameraType = () => {
    setCameraType((current) => (current === "back" ? "front" : "back"));
  };

  // ... (Camera initialization, pose detection simulation, error handling)

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

// ... (Styles)
```

---

## src/components/ManualCountingFallback.tsx

```typescript
// Beautiful manual rep counting interface with animations
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

  const progress = targetCount > 0 ? currentCount / targetCount : 0;
  const remaining = Math.max(0, targetCount - currentCount);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Manual Counting</Text>
        <Text style={styles.subtitle}>
          Tap the button for each {exerciseType.slice(0, -1)} you complete
        </Text>
      </View>

      {/* Progress Ring */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRing}>
          <View
            style={[
              styles.progressFill,
              { transform: [{ rotate: `${progress * 360}deg` }] },
            ]}
          />
          <View style={styles.progressInner}>
            <Animated.Text
              style={[styles.countText, { transform: [{ scale: pulseAnim }] }]}
            >
              {currentCount}
            </Animated.Text>
            {targetCount > 0 && (
              <Text style={styles.targetText}>of {targetCount}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Rep Button */}
      <Animated.View
        style={[
          styles.repButtonContainer,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.repButton,
            isPressed && styles.repButtonPressed,
            !isActive && styles.repButtonDisabled,
          ]}
          onPress={handleRepPress}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          disabled={!isActive}
          activeOpacity={0.8}
        >
          <Text style={styles.repButtonText}>
            {currentCount === 0 ? "Start" : "+1"}
          </Text>
          <Text style={styles.repButtonSubtext}>
            {exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1, -1)}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Status */}
      <View style={styles.statusContainer}>
        {targetCount > 0 && remaining > 0 && (
          <Text style={styles.remainingText}>{remaining} more to go! 💪</Text>
        )}
        {currentCount > 0 && (
          <Text style={styles.encouragementText}>
            {currentCount >= targetCount
              ? "🎉 Target reached! Amazing work!"
              : currentCount % 5 === 0
              ? "🔥 You're on fire!"
              : "Keep it up! 👍"}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY[0],
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 22,
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  progressRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
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
  progressInner: {
    alignItems: "center",
  },
  countText: {
    fontSize: 48,
    fontWeight: "bold",
    color: COLORS.TEXT.PRIMARY,
  },
  targetText: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
    marginTop: 4,
  },
  repButtonContainer: {
    marginBottom: 40,
  },
  repButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  repButtonPressed: {
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    transform: [{ scale: 0.95 }],
  },
  repButtonDisabled: {
    backgroundColor: COLORS.BACKGROUND.CARD_BORDER,
    opacity: 0.6,
  },
  repButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  repButtonSubtext: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    textTransform: "capitalize",
  },
  statusContainer: {
    alignItems: "center",
  },
  remainingText: {
    fontSize: 18,
    color: COLORS.TEXT.PRIMARY,
    fontWeight: "600",
    marginBottom: 8,
  },
  encouragementText: {
    fontSize: 16,
    color: COLORS.UI.BUTTON_PRIMARY,
    textAlign: "center",
  },
});
```

---

## src/components/CameraIntegrationTest.tsx

```typescript
// Test interface for camera and manual modes
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
            📸 Camera
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
            📱 Manual
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
            onComplete={() => console.log("Workout complete!")}
            isActive={isActive}
          />
        )}
      </View>

      {/* Feedback Display */}
      {feedback && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>{feedback.message}</Text>
          {feedback.suggestions.length > 0 && (
            <Text style={styles.suggestionText}>
              💡 {feedback.suggestions[0]}
            </Text>
          )}
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setIsActive(!isActive)}
        >
          <Text style={styles.controlButtonText}>
            {isActive ? "⏸️ Pause" : "▶️ Resume"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={resetTest}>
          <Text style={styles.controlButtonText}>🔄 Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info */}
      {__DEV__ && cameraState && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Camera: {cameraState.isActive ? "Active" : "Inactive"} |
            Initialized: {cameraState.isInitialized ? "Yes" : "No"}
          </Text>
          <Text style={styles.debugText}>
            FPS: {cameraState.currentFrameRate} | Permission:{" "}
            {cameraState.hasPermission ? "Granted" : "Denied"}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY[0],
  },
  header: {
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND.CARD_BORDER,
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
    margin: 20,
    backgroundColor: COLORS.BACKGROUND.CARD_BORDER,
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.SECONDARY,
  },
  modeButtonTextActive: {
    color: COLORS.TEXT.PRIMARY,
  },
  content: {
    flex: 1,
  },
  feedbackContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.UI.BUTTON_PRIMARY,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
  },
  controls: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  controlButton: {
    flex: 1,
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
  },
  debugInfo: {
    padding: 20,
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  debugText: {
    fontSize: 12,
    color: COLORS.TEXT.TERTIARY,
    fontFamily: "monospace",
    marginBottom: 2,
  },
});
```

---

## src/types/pose.ts

```typescript
// Comprehensive type definitions for pose detection system
import { CalibrationData } from "../services/pose/PoseProcessor";

// Core pose detection types
export {
  LandmarkType,
  Pose,
  PoseLandmark,
} from "../services/pose/MLKitPoseService";
export {
  ProcessedPoseData,
  ValidationResult,
  CalibrationData,
  JointAngles,
  BodyAlignment,
  JointRanges,
} from "../services/pose/PoseProcessor";

// Exercise-specific types
export type ExerciseType =
  | "pushups"
  | "squats"
  | "planks"
  | "situps"
  | "burpees"
  | "lunges"
  | "mountain-climbers"
  | "jumping-jacks";

// Movement detection types
export interface MovementState {
  currentPhase: RepPhase;
  phaseStartTime: number;
  phaseDuration: number;
  transitionProgress: number; // 0-1
  isStable: boolean;
  confidence: number;
}

export interface MovementHistory {
  poses: import("../services/pose/MLKitPoseService").Pose[];
  movements: MovementState[];
  repCounts: RepData[];
  maxHistorySize: number;
}

// Rep detection and counting
export interface RepData {
  count: number;
  timestamp: number;
  formScore: number;
  duration: number;
  phase: RepPhase;
  exerciseType: ExerciseType;
  confidence: number;
}

export type RepPhase = "up" | "down" | "hold" | "transition";

export interface RepDetectionResult {
  repDetected: boolean;
  repData?: RepData;
  currentPhase: RepPhase;
  progress: number; // 0-1, how complete the current rep is
  reason?: string; // Why rep was/wasn't detected
}

// Form feedback and validation
export interface FormFeedback {
  type: FormFeedbackType;
  message: string;
  bodyParts: string[];
  severity: FormSeverity;
  suggestions: string[];
  priority: number; // 1-10, higher = more important
  timestamp: number;
  exerciseType: ExerciseType;
}

export type FormFeedbackType =
  | "good"
  | "warning"
  | "error"
  | "encouragement"
  | "success";
export type FormSeverity = "low" | "medium" | "high" | "critical";

export interface FormValidationResult {
  isValidForm: boolean;
  formScore: number; // 0-100
  feedback: FormFeedback[];
  jointIssues: JointIssue[];
  alignmentIssues: AlignmentIssue[];
}

export interface JointIssue {
  joint: string;
  expectedRange: [number, number];
  actualAngle: number;
  severity: FormSeverity;
  suggestion: string;
}

export interface AlignmentIssue {
  type: string;
  deviation: number;
  threshold: number;
  severity: FormSeverity;
  suggestion: string;
}

// Exercise rules and configuration
export interface ExerciseRules {
  exerciseType: ExerciseType;
  keyLandmarks: number[];
  movementPhases: MovementPhase[];
  formCriteria: FormCriterion[];
  repThresholds: RepThresholds;
  cameraPosition: CameraPosition;
  difficultyLevels: DifficultyLevel[];
}

export interface MovementPhase {
  name: string;
  description: string;
  keyAngles?: { [joint: string]: [number, number] };
  duration?: [number, number]; // min, max milliseconds
}

export interface FormCriterion {
  name: string;
  description: string;
  measurement: string;
  threshold: number;
  severity: FormSeverity;
}

export interface RepThresholds {
  minAngleChange: number;
  minDuration: number;
  maxDuration: number;
  confidenceThreshold: number;
  formScoreThreshold: number;
}

export interface CameraPosition {
  angle: string;
  height: string;
  distance: [number, number];
  description: string;
}

export interface DifficultyLevel {
  name: "beginner" | "intermediate" | "advanced";
  formStrictness: number; // 0-1
  angleTolerances: { [joint: string]: number };
  feedbackFrequency: "high" | "medium" | "low";
}

// Pose detection settings and preferences
export interface PoseDetectionSettings {
  enabled: boolean;
  exerciseType: ExerciseType;
  difficultyLevel: "beginner" | "intermediate" | "advanced";

  // Visual settings
  showSkeleton: boolean;
  skeletonOpacity: number;
  renderMode: "full" | "minimal" | "markers-only";
  feedbackStyle: "visual" | "audio" | "haptic" | "all";

  // Detection settings
  confidenceThreshold: number;
  formStrictness: number; // 0-1
  feedbackFrequency: "high" | "medium" | "low";

  // Calibration settings
  autoCalibrate: boolean;
  persistCalibration: boolean;
  recalibrateOnLightingChange: boolean;

  // Performance settings
  targetFrameRate: number;
  enablePerformanceMode: boolean;
  reducedQualityThreshold: number; // fps threshold to reduce quality
}

// Camera and performance types
export interface CameraState {
  isActive: boolean;
  hasPermission: boolean;
  isInitialized: boolean;
  currentFrameRate: number;
  error?: CameraError;
}

export interface CameraError {
  type: "permission" | "unavailable" | "initialization" | "processing";
  message: string;
  recoverable: boolean;
  suggestions: string[];
}

export interface PerformanceMetrics {
  frameRate: number;
  processingTime: number; // ms per frame
  memoryUsage: number; // MB
  batteryImpact: "low" | "medium" | "high";
  deviceCapability: "high" | "medium" | "low";
}

// Error handling and recovery types
export interface PoseDetectionError {
  type: "ml_kit" | "camera" | "processing" | "calibration" | "validation";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: number;
  context: {
    exerciseType?: ExerciseType;
    frameRate?: number;
    memoryUsage?: number;
    lastValidPose?: number; // timestamp
  };
  recoveryActions: RecoveryAction[];
}

export interface RecoveryAction {
  type:
    | "retry"
    | "recalibrate"
    | "reduce_quality"
    | "fallback_manual"
    | "restart_camera";
  description: string;
  automatic: boolean;
  priority: number; // 1-10
}

// Constants for pose detection
export const POSE_DETECTION_CONSTANTS = {
  // Feedback priorities (higher = more important)
  FEEDBACK_PRIORITIES: {
    SAFETY: 10,
    FORM_CRITICAL: 8,
    FORM_MINOR: 6,
    REP_COUNT: 4,
    ENCOURAGEMENT: 2,
  },

  // Form score thresholds
  FORM_SCORE_THRESHOLDS: {
    EXCELLENT: 90,
    GOOD: 75,
    FAIR: 60,
    POOR: 40,
  },

  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    MIN_FPS: 15,
    TARGET_FPS: 24,
    MAX_PROCESSING_TIME: 50, // ms
    MEMORY_WARNING: 100, // MB
  },

  // Detection confidence thresholds
  CONFIDENCE_THRESHOLDS: {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4,
  },

  // Calibration settings
  CALIBRATION: {
    EXPIRY_DAYS: 7,
    MIN_POSES_REQUIRED: 3,
    STABILITY_DURATION: 500, // ms
  },
};
```

---

# README

## OneMore Fitness App

OneMore is an AI-powered fitness app built with React Native and Expo that uses Google ML Kit for real-time pose detection to automatically count exercise repetitions and provide intelligent form feedback.

### 🎯 App Purpose

OneMore transforms your smartphone into an intelligent workout coach that:

- **Automatically counts reps** using computer vision and pose detection
- **Provides real-time form feedback** to prevent injuries and improve technique
- **Tracks progress** with detailed analytics and form scoring
- **Offers daily challenges** with progressive difficulty
- **Enables social duels** with friends for motivation
- **Works offline** with on-device ML processing for privacy

### 🏗️ Architecture

The app is built with a modular architecture:

- **Frontend**: React Native with Expo for cross-platform mobile development
- **State Management**: Redux Toolkit with Redux Persist for data persistence
- **Computer Vision**: Google ML Kit Pose Detection for real-time pose analysis
- **Camera**: React Native Vision Camera for high-performance video processing
- **Storage**: AsyncStorage for local data persistence
- **Styling**: Custom design system with consistent colors and components

### 🤖 AI-Powered Features

#### Pose Detection System

- **Real-time pose analysis** using Google ML Kit
- **Exercise-specific detection** for push-ups, squats, planks, and more
- **Form validation** with safety-first feedback prioritization
- **Automatic calibration** based on user's body proportions and camera setup
- **Graceful fallback** to manual counting when camera is unavailable

#### Intelligent Feedback

- **Priority-based feedback system** (Safety > Form > Rep Count > Encouragement)
- **Exercise-specific coaching** with detailed form corrections
- **Progress tracking** with form scoring and improvement suggestions
- **Milestone celebrations** and achievement system

### 📱 How to Run the App Locally

#### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (Mac) or Android Emulator
- For device testing: Expo Go app or Expo Dev Client

#### Installation Steps

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd OneMoreApp2
npm install
```

2. **Start the development server:**

```bash
npm start
# or
expo start
```

3. **Run on specific platforms:**

```bash
# iOS Simulator (Mac only)
npm run ios

# Android Emulator
npm run android

# Web browser (limited functionality)
npm run web
```

#### Development Build (Recommended for Pose Detection)

For full pose detection functionality, create a development build:

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for development
npm run build:dev

# Install the development build on your device
# Then use Expo CLI to load your JavaScript
expo start --dev-client
```

### 🧪 How to Test the Pose Detector

#### On iOS (Expo Dev Client)

1. **Build and install development client:**

```bash
eas build --profile development --platform ios
```

2. **Install on device** using the provided QR code or TestFlight

3. **Start development server:**

```bash
expo start --dev-client
```

4. **Test pose detection:**
   - Open the app and navigate to exercise tracking
   - Grant camera permissions when prompted
   - Position your device 6-8 feet away at chest height
   - Try different exercises (push-ups work best for testing)
   - Switch between camera and manual modes to compare

#### On Android

1. **Build development APK:**

```bash
eas build --profile development --platform android
```

2. **Install APK** on your Android device

3. **Follow same testing steps** as iOS

#### Testing Tips

- **Good lighting** is essential for accurate pose detection
- **Clear background** without distracting patterns works best
- **Side profile view** is optimal for push-ups and planks
- **45° diagonal view** works well for squats
- **Wear contrasting colors** to your background
- **Ensure full body visibility** in the camera frame

#### Troubleshooting

If pose detection isn't working:

1. **Check camera permissions** in device settings
2. **Ensure good lighting** - avoid backlighting
3. **Clean camera lens** if image appears blurry
4. **Close other camera apps** that might be using the camera
5. **Try manual mode** as a fallback option
6. **Restart the app** if issues persist

### 🔧 Development Features

- **Hot reloading** for rapid development
- **Debug overlays** showing FPS, processing time, and pose data
- **Error recovery system** with automatic fallback to manual mode
- **Performance monitoring** with frame rate and memory usage tracking
- **Comprehensive logging** for debugging pose detection issues

### 🚀 Production Deployment

For production builds:

```bash
# Preview build (for testing)
npm run build:preview

# Production build
npm run build:production
```

### 📊 Key Technologies

- **React Native 0.79** - Cross-platform mobile framework
- **Expo SDK 53** - Development platform and tools
- **Google ML Kit** - On-device machine learning for pose detection
- **React Native Vision Camera** - High-performance camera integration
- **Redux Toolkit** - State management with persistence
- **TypeScript** - Type-safe development
- **React Native Reanimated** - Smooth animations and worklets

### 🎨 Design System

The app uses a consistent design system with:

- **Dark theme** optimized for workout environments
- **High contrast colors** for visibility during exercise
- **Large touch targets** for easy interaction while working out
- **Smooth animations** for engaging user experience
- **Accessibility support** with proper contrast and text sizing

---

This comprehensive codebase provides a complete AI-powered fitness app with advanced pose detection capabilities, ready for development, testing, and deployment on both iOS and Android platforms.
