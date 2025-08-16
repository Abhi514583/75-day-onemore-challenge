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

  /**
   * Calculate elbow and shoulder angles for push-up
   */
  private calculateJointAngles(pose: Pose): {
    leftElbow: number;
    rightElbow: number;
    avgElbow: number;
  } | null {
    const leftShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_SHOULDER
    );
    const leftElbow = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_ELBOW
    );
    const leftWrist = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_WRIST
    );
    const rightShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_SHOULDER
    );
    const rightElbow = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_ELBOW
    );
    const rightWrist = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_WRIST
    );

    if (
      !leftShoulder ||
      !leftElbow ||
      !leftWrist ||
      !rightShoulder ||
      !rightElbow ||
      !rightWrist
    ) {
      return null;
    }

    // Check landmark visibility
    const minVisibility = 0.5;
    const landmarks = [
      leftShoulder,
      leftElbow,
      leftWrist,
      rightShoulder,
      rightElbow,
      rightWrist,
    ];
    if (landmarks.some((l) => l.visibility < minVisibility)) {
      return null;
    }

    const leftElbowAngle = this.calculateAngle(
      leftShoulder,
      leftElbow,
      leftWrist
    );
    const rightElbowAngle = this.calculateAngle(
      rightShoulder,
      rightElbow,
      rightWrist
    );
    const avgElbow = (leftElbowAngle + rightElbowAngle) / 2;

    return {
      leftElbow: leftElbowAngle,
      rightElbow: rightElbowAngle,
      avgElbow,
    };
  }

  /**
   * Calculate angle between three points
   */
  private calculateAngle(p1: any, p2: any, p3: any): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cos = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
  }

  /**
   * Validate body alignment for proper plank position
   */
  private validateBodyAlignment(pose: Pose): {
    isValid: boolean;
    deviation: number;
    score: number;
  } {
    const nose = pose.landmarks.find((l) => l.type === LandmarkType.NOSE);
    const leftShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_SHOULDER
    );
    const rightShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_SHOULDER
    );
    const leftHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_HIP
    );
    const rightHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_HIP
    );
    const leftAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_ANKLE
    );
    const rightAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_ANKLE
    );

    if (
      !nose ||
      !leftShoulder ||
      !rightShoulder ||
      !leftHip ||
      !rightHip ||
      !leftAnkle ||
      !rightAnkle
    ) {
      return { isValid: false, deviation: 0, score: 0 };
    }

    // Calculate body line from shoulders to ankles
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };

    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };

    const ankleCenter = {
      x: (leftAnkle.x + rightAnkle.x) / 2,
      y: (leftAnkle.y + rightAnkle.y) / 2,
    };

    // Calculate deviation from straight line
    const shoulderToAnkle = {
      x: ankleCenter.x - shoulderCenter.x,
      y: ankleCenter.y - shoulderCenter.y,
    };

    const shoulderToHip = {
      x: hipCenter.x - shoulderCenter.x,
      y: hipCenter.y - shoulderCenter.y,
    };

    // Calculate angle deviation
    const dot =
      shoulderToAnkle.x * shoulderToHip.x + shoulderToAnkle.y * shoulderToHip.y;
    const magAnkle = Math.sqrt(shoulderToAnkle.x ** 2 + shoulderToAnkle.y ** 2);
    const magHip = Math.sqrt(shoulderToHip.x ** 2 + shoulderToHip.y ** 2);

    if (magAnkle === 0 || magHip === 0) {
      return { isValid: false, deviation: 0, score: 0 };
    }

    const cos = dot / (magAnkle * magHip);
    const angle = Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
    const deviation = Math.abs(180 - angle); // Deviation from straight line

    const isValid = deviation <= this.BODY_ALIGNMENT_TOLERANCE;
    const score = Math.max(
      0,
      100 - (deviation / this.BODY_ALIGNMENT_TOLERANCE) * 100
    );

    return { isValid, deviation, score };
  }

  /**
   * Update current push-up state
   */
  private updateState(
    jointAngles: { avgElbow: number },
    bodyAlignment: { isValid: boolean; score: number },
    timestamp: number
  ): void {
    const prevPhase = this.currentState.phase;
    const elbowAngle = jointAngles.avgElbow;

    // Determine current phase based on elbow angle
    let newPhase: "up" | "down" | "transition" = this.currentState.phase;

    if (
      this.currentState.phase === "up" &&
      elbowAngle <= this.ELBOW_DOWN_THRESHOLD
    ) {
      newPhase = "down";
    } else if (
      this.currentState.phase === "down" &&
      elbowAngle >= this.ELBOW_UP_THRESHOLD
    ) {
      newPhase = "up";
    } else if (
      elbowAngle > this.ELBOW_DOWN_THRESHOLD &&
      elbowAngle < this.ELBOW_UP_THRESHOLD
    ) {
      newPhase = "transition";
    }

    // Update state
    this.currentState = {
      ...this.currentState,
      phase: newPhase,
      elbowAngle,
      bodyAlignment: bodyAlignment.score,
      isValidForm: bodyAlignment.isValid && elbowAngle > 45, // Minimum elbow bend
    };

    // Track phase changes
    if (prevPhase !== newPhase) {
      this.currentState.lastPhaseChange = timestamp;
    }
  }

  /**
   * Check if a complete rep has been performed
   */
  private checkRepCompletion(timestamp: number): {
    detected: boolean;
    repData?: RepData;
    reason?: string;
  } {
    // Must complete down -> up cycle
    if (this.currentState.phase !== "up") {
      return { detected: false, reason: "Rep not complete - still in motion" };
    }

    // Check if we've been in up position long enough
    const timeSincePhaseChange = timestamp - this.currentState.lastPhaseChange;
    if (timeSincePhaseChange < 200) {
      // 200ms stability
      return { detected: false, reason: "Position not stable" };
    }

    // Check rep duration
    const repDuration = timestamp - this.currentState.repStartTime;
    if (repDuration < this.MIN_REP_DURATION) {
      return { detected: false, reason: "Rep too fast" };
    }

    if (repDuration > this.MAX_REP_DURATION) {
      // Reset rep timer for very slow reps
      this.currentState.repStartTime = timestamp;
      return { detected: false, reason: "Rep too slow - timer reset" };
    }

    // Check form quality
    if (!this.currentState.isValidForm) {
      return {
        detected: false,
        reason: "Invalid form - maintain plank position",
      };
    }

    // Rep detected! Create rep data
    this.repCount++;
    const formScore = Math.min(
      100,
      this.currentState.bodyAlignment +
        (this.currentState.elbowAngle > 150 ? 20 : 0)
    ); // Bonus for full extension

    const repData: RepData = {
      count: this.repCount,
      timestamp,
      formScore,
      duration: repDuration,
      phase: "up",
      exerciseType: "pushups",
      confidence: this.calculateConfidence(),
    };

    // Reset for next rep
    this.currentState.repStartTime = timestamp;

    return { detected: true, repData };
  }

  /**
   * Calculate progress through current rep (0-1)
   */
  private calculateProgress(): number {
    const elbowAngle = this.currentState.elbowAngle;

    if (this.currentState.phase === "down") {
      // Progress from up (160°) to down (90°)
      const range = this.ELBOW_UP_THRESHOLD - this.ELBOW_DOWN_THRESHOLD;
      const progress = (this.ELBOW_UP_THRESHOLD - elbowAngle) / range;
      return Math.max(0, Math.min(0.5, progress * 0.5)); // 0 to 0.5
    } else if (this.currentState.phase === "up") {
      // Progress from down (90°) to up (160°)
      const range = this.ELBOW_UP_THRESHOLD - this.ELBOW_DOWN_THRESHOLD;
      const progress = (elbowAngle - this.ELBOW_DOWN_THRESHOLD) / range;
      return Math.max(0.5, Math.min(1, 0.5 + progress * 0.5)); // 0.5 to 1
    }

    return 0.25; // Transition phase
  }

  /**
   * Calculate overall confidence in detection
   */
  private calculateConfidence(): number {
    if (this.poseHistory.length === 0) return 0;

    const avgPoseConfidence =
      this.poseHistory.reduce((sum, pose) => sum + pose.confidence, 0) /
      this.poseHistory.length;
    const formQuality = this.currentState.bodyAlignment / 100;
    const stabilityBonus = this.poseHistory.length >= 5 ? 0.1 : 0;

    return Math.min(
      1,
      avgPoseConfidence * 0.6 + formQuality * 0.3 + stabilityBonus
    );
  }

  /**
   * Get current rep count
   */
  getRepCount(): number {
    return this.repCount;
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.currentState = {
      phase: "up",
      elbowAngle: 180,
      bodyAlignment: 0,
      isValidForm: true,
      repStartTime: Date.now(),
      lastPhaseChange: Date.now(),
    };
    this.repCount = 0;
    this.poseHistory = [];
  }

  /**
   * Get current state for debugging
   */
  getCurrentState(): PushUpState {
    return { ...this.currentState };
  }
}
