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

  /**
   * Validate poses are suitable for calibration
   */
  private static validateCalibrationPoses(poses: Pose[]): {
    isValid: boolean;
    reason?: string;
  } {
    if (!poses || poses.length === 0) {
      return { isValid: false, reason: "No poses provided" };
    }

    // Check minimum number of poses
    if (poses.length < 3) {
      return { isValid: false, reason: "Insufficient poses for calibration" };
    }

    // Check pose quality
    const lowQualityPoses = poses.filter((pose) => pose.confidence < 0.7);
    if (lowQualityPoses.length > poses.length * 0.5) {
      return { isValid: false, reason: "Too many low-quality poses" };
    }

    // Check pose consistency
    const landmarkCounts = poses.map((pose) => pose.landmarks.length);
    const avgLandmarks =
      landmarkCounts.reduce((a, b) => a + b, 0) / landmarkCounts.length;
    const inconsistentPoses = poses.filter(
      (pose) =>
        Math.abs(pose.landmarks.length - avgLandmarks) > avgLandmarks * 0.2
    );

    if (inconsistentPoses.length > poses.length * 0.3) {
      return { isValid: false, reason: "Inconsistent pose landmark detection" };
    }

    return { isValid: true };
  }

  /**
   * Store lighting conditions for future comparison
   */
  private static async storeLightingConditions(poses: Pose[]): Promise<void> {
    try {
      // Estimate lighting from pose confidence and visibility
      const avgConfidence =
        poses.reduce((sum, pose) => sum + pose.confidence, 0) / poses.length;
      const avgVisibility =
        poses.reduce((sum, pose) => {
          const visibilitySum = pose.landmarks.reduce(
            (vSum, landmark) => vSum + landmark.visibility,
            0
          );
          return sum + visibilitySum / pose.landmarks.length;
        }, 0) / poses.length;

      const lightingCondition: LightingCondition = {
        brightness: avgConfidence,
        contrast: avgVisibility,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        this.LIGHTING_STORAGE_KEY,
        JSON.stringify(lightingCondition)
      );

      console.log("💡 Lighting conditions stored:", lightingCondition);
    } catch (error) {
      console.error("❌ Failed to store lighting conditions:", error);
    }
  }

  /**
   * Check if lighting conditions have changed significantly
   */
  private static async checkLightingChange(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(this.LIGHTING_STORAGE_KEY);
      if (!stored) return false;

      const storedCondition: LightingCondition = JSON.parse(stored);

      // For now, we'll simulate current lighting check
      // In real implementation, this would analyze current camera feed
      const currentBrightness = 0.8; // Mock current brightness
      const currentContrast = 0.9; // Mock current contrast

      const brightnessChange = Math.abs(
        currentBrightness - storedCondition.brightness
      );
      const contrastChange = Math.abs(
        currentContrast - storedCondition.contrast
      );

      const significantChange =
        brightnessChange > this.LIGHTING_CHANGE_THRESHOLD ||
        contrastChange > this.LIGHTING_CHANGE_THRESHOLD;

      if (significantChange) {
        console.log("💡 Significant lighting change detected");
      }

      return significantChange;
    } catch (error) {
      console.error("❌ Error checking lighting change:", error);
      return false;
    }
  }

  /**
   * Clear calibration data for an exercise
   */
  static async clearCalibration(exerciseType: ExerciseType): Promise<void> {
    try {
      const key = `${this.STORAGE_PREFIX}${exerciseType}`;
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Calibration cleared for ${exerciseType}`);
    } catch (error) {
      console.error("❌ Failed to clear calibration:", error);
    }
  }

  /**
   * Clear all calibration data
   */
  static async clearAllCalibrations(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const calibrationKeys = keys.filter((key) =>
        key.startsWith(this.STORAGE_PREFIX)
      );

      await AsyncStorage.multiRemove([
        ...calibrationKeys,
        this.LIGHTING_STORAGE_KEY,
      ]);
      console.log("🗑️ All calibrations cleared");
    } catch (error) {
      console.error("❌ Failed to clear all calibrations:", error);
    }
  }

  /**
   * Get calibration summary for all exercises
   */
  static async getCalibrationSummary(): Promise<
    Record<ExerciseType, CalibrationStatus>
  > {
    const exercises: ExerciseType[] = [
      "pushups",
      "squats",
      "planks",
      "situps",
      "burpees",
      "lunges",
      "mountain-climbers",
      "jumping-jacks",
    ];

    const summary: Record<string, CalibrationStatus> = {};

    for (const exercise of exercises) {
      summary[exercise] = await this.getCalibrationStatus(exercise);
    }

    return summary as Record<ExerciseType, CalibrationStatus>;
  }

  /**
   * Auto-calibrate based on exercise type and current conditions
   */
  static async autoCalibrate(
    poses: Pose[],
    exerciseType: ExerciseType
  ): Promise<CalibrationData | null> {
    try {
      const status = await this.getCalibrationStatus(exerciseType);

      // Only auto-calibrate if needed
      if (status.isCalibrated && !status.needsRecalibration) {
        console.log(
          `⏭️ Skipping auto-calibration for ${exerciseType} - already calibrated`
        );
        return await PoseProcessor.loadCalibration(exerciseType);
      }

      console.log(`🤖 Auto-calibrating ${exerciseType}...`);
      return await this.performCalibration(poses, exerciseType, false);
    } catch (error) {
      console.error("❌ Auto-calibration failed:", error);
      return null;
    }
  }

  /**
   * Validate if current pose matches calibrated exercise
   */
  static async validatePoseForExercise(
    pose: Pose,
    exerciseType: ExerciseType
  ): Promise<{ isValid: boolean; confidence: number; suggestions: string[] }> {
    try {
      const calibrationData = await PoseProcessor.loadCalibration(exerciseType);
      if (!calibrationData) {
        return {
          isValid: false,
          confidence: 0,
          suggestions: ["Calibration required for this exercise"],
        };
      }

      // Validate pose against calibration
      const validation = PoseProcessor.validatePose(pose, calibrationData);

      const suggestions: string[] = [];
      if (!validation.isValid) {
        suggestions.push("Adjust your position to match calibrated setup");
        if (validation.missingLandmarks.length > 0) {
          suggestions.push("Ensure all body parts are visible to camera");
        }
      }

      return {
        isValid: validation.isValid,
        confidence: validation.confidence,
        suggestions,
      };
    } catch (error) {
      console.error("❌ Pose validation failed:", error);
      return {
        isValid: false,
        confidence: 0,
        suggestions: ["Error validating pose"],
      };
    }
  }
}
