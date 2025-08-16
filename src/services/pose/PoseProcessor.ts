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
