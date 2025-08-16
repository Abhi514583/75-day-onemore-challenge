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

  /**
   * Calculate hip and knee angles for squat
   */
  private calculateJointAngles(pose: Pose): {
    leftHip: number;
    rightHip: number;
    leftKnee: number;
    rightKnee: number;
    avgHip: number;
    avgKnee: number;
  } | null {
    const leftShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_SHOULDER
    );
    const leftHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_HIP
    );
    const leftKnee = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_KNEE
    );
    const leftAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_ANKLE
    );

    const rightShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_SHOULDER
    );
    const rightHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_HIP
    );
    const rightKnee = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_KNEE
    );
    const rightAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_ANKLE
    );

    if (
      !leftShoulder ||
      !leftHip ||
      !leftKnee ||
      !leftAnkle ||
      !rightShoulder ||
      !rightHip ||
      !rightKnee ||
      !rightAnkle
    ) {
      return null;
    }

    // Check landmark visibility
    const minVisibility = 0.5;
    const landmarks = [
      leftShoulder,
      leftHip,
      leftKnee,
      leftAnkle,
      rightShoulder,
      rightHip,
      rightKnee,
      rightAnkle,
    ];
    if (landmarks.some((l) => l.visibility < minVisibility)) {
      return null;
    }

    // Calculate hip angles (shoulder-hip-knee)
    const leftHipAngle = this.calculateAngle(leftShoulder, leftHip, leftKnee);
    const rightHipAngle = this.calculateAngle(
      rightShoulder,
      rightHip,
      rightKnee
    );

    // Calculate knee angles (hip-knee-ankle)
    const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);

    return {
      leftHip: leftHipAngle,
      rightHip: rightHipAngle,
      leftKnee: leftKneeAngle,
      rightKnee: rightKneeAngle,
      avgHip: (leftHipAngle + rightHipAngle) / 2,
      avgKnee: (leftKneeAngle + rightKneeAngle) / 2,
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
   * Validate knee alignment to prevent injury
   */
  private validateKneeAlignment(pose: Pose): {
    isValid: boolean;
    deviation: number;
    score: number;
  } {
    const leftHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_HIP
    );
    const leftKnee = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_KNEE
    );
    const leftAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_ANKLE
    );

    const rightHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_HIP
    );
    const rightKnee = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_KNEE
    );
    const rightAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_ANKLE
    );

    if (
      !leftHip ||
      !leftKnee ||
      !leftAnkle ||
      !rightHip ||
      !rightKnee ||
      !rightAnkle
    ) {
      return { isValid: false, deviation: 0, score: 0 };
    }

    // Check if knees track over toes (not caving inward)
    const leftKneeAlignment = Math.abs(leftKnee.x - leftAnkle.x);
    const rightKneeAlignment = Math.abs(rightKnee.x - rightAnkle.x);
    const avgAlignment = (leftKneeAlignment + rightKneeAlignment) / 2;

    // Check knee width relative to hip width
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    const kneeWidth = Math.abs(leftKnee.x - rightKnee.x);
    const kneeWidthRatio = kneeWidth / hipWidth;

    // Good alignment: knees should be roughly same width as hips or slightly wider
    const isValidWidth = kneeWidthRatio >= 0.8 && kneeWidthRatio <= 1.3;
    const isValidAlignment = avgAlignment <= this.KNEE_ALIGNMENT_TOLERANCE;

    const isValid = isValidWidth && isValidAlignment;
    const score = isValid
      ? 100
      : Math.max(0, 100 - (avgAlignment / this.KNEE_ALIGNMENT_TOLERANCE) * 50);

    return {
      isValid,
      deviation: avgAlignment,
      score,
    };
  }

  /**
   * Calculate squat depth (0 = standing, 1 = full depth)
   */
  private calculateSquatDepth(jointAngles: {
    avgHip: number;
    avgKnee: number;
  }): number {
    // Use hip angle as primary depth indicator
    const hipRange = this.HIP_UP_THRESHOLD - this.HIP_DOWN_THRESHOLD;
    const hipDepth = Math.max(
      0,
      Math.min(1, (this.HIP_UP_THRESHOLD - jointAngles.avgHip) / hipRange)
    );

    // Use knee angle as secondary indicator
    const kneeRange = this.KNEE_UP_THRESHOLD - this.KNEE_DOWN_THRESHOLD;
    const kneeDepth = Math.max(
      0,
      Math.min(1, (this.KNEE_UP_THRESHOLD - jointAngles.avgKnee) / kneeRange)
    );

    // Weighted average (hip angle is more reliable for depth)
    return hipDepth * 0.7 + kneeDepth * 0.3;
  }

  /**
   * Update current squat state
   */
  private updateState(
    jointAngles: { avgHip: number; avgKnee: number },
    kneeAlignment: { isValid: boolean; score: number },
    depth: number,
    timestamp: number
  ): void {
    const prevPhase = this.currentState.phase;
    const hipAngle = jointAngles.avgHip;
    const kneeAngle = jointAngles.avgKnee;

    // Determine current phase based on joint angles and depth
    let newPhase: "up" | "down" | "transition" = this.currentState.phase;

    if (
      this.currentState.phase === "up" &&
      (hipAngle <= this.HIP_DOWN_THRESHOLD ||
        kneeAngle <= this.KNEE_DOWN_THRESHOLD)
    ) {
      newPhase = "down";
    } else if (
      this.currentState.phase === "down" &&
      hipAngle >= this.HIP_UP_THRESHOLD &&
      kneeAngle >= this.KNEE_UP_THRESHOLD
    ) {
      newPhase = "up";
    } else if (
      (hipAngle > this.HIP_DOWN_THRESHOLD &&
        hipAngle < this.HIP_UP_THRESHOLD) ||
      (kneeAngle > this.KNEE_DOWN_THRESHOLD &&
        kneeAngle < this.KNEE_UP_THRESHOLD)
    ) {
      newPhase = "transition";
    }

    // Update state
    this.currentState = {
      ...this.currentState,
      phase: newPhase,
      hipAngle,
      kneeAngle,
      kneeAlignment: kneeAlignment.score,
      isValidForm: kneeAlignment.isValid && depth >= this.MIN_DEPTH_THRESHOLD,
      depth,
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
    if (timeSincePhaseChange < 300) {
      // 300ms stability
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

    // Check form quality and depth
    if (!this.currentState.isValidForm) {
      return {
        detected: false,
        reason: "Invalid form - check knee alignment and depth",
      };
    }

    if (this.currentState.depth < this.MIN_DEPTH_THRESHOLD) {
      return {
        detected: false,
        reason: `Insufficient depth - go deeper (${Math.round(
          this.currentState.depth * 100
        )}%)`,
      };
    }

    // Rep detected! Create rep data
    this.repCount++;
    const formScore = Math.min(
      100,
      this.currentState.kneeAlignment * 0.4 +
        this.currentState.depth * 60 +
        (this.currentState.hipAngle > 150 ? 20 : 0) // Bonus for full extension
    );

    const repData: RepData = {
      count: this.repCount,
      timestamp,
      formScore,
      duration: repDuration,
      phase: "up",
      exerciseType: "squats",
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
    if (this.currentState.phase === "down") {
      // Progress based on depth (0 to 0.5)
      return this.currentState.depth * 0.5;
    } else if (this.currentState.phase === "up") {
      // Progress from max depth back to standing (0.5 to 1)
      return 0.5 + (1 - this.currentState.depth) * 0.5;
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
    const formQuality = this.currentState.kneeAlignment / 100;
    const depthQuality = this.currentState.depth;
    const stabilityBonus = this.poseHistory.length >= 5 ? 0.1 : 0;

    return Math.min(
      1,
      avgPoseConfidence * 0.5 +
        formQuality * 0.2 +
        depthQuality * 0.2 +
        stabilityBonus
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
      hipAngle: 180,
      kneeAngle: 180,
      kneeAlignment: 0,
      isValidForm: true,
      repStartTime: Date.now(),
      lastPhaseChange: Date.now(),
      depth: 0,
    };
    this.repCount = 0;
    this.poseHistory = [];
  }

  /**
   * Get current state for debugging
   */
  getCurrentState(): SquatState {
    return { ...this.currentState };
  }
}
