import { Pose, LandmarkType } from "../MLKitPoseService";
import { CalibrationData, JointAngles } from "../PoseProcessor";
import {
  RepDetectionResult,
  MovementState,
  RepPhase,
} from "../../../types/pose";

export interface SitUpState {
  currentPhase: "down" | "up" | "transition";
  phaseStartTime: number;
  torsoAngle: number;
  previousTorsoAngle: number;
  movementDirection: "up" | "down" | "stationary";
  repStartTime: number;
  confidence: number;
  isValidPosition: boolean;
}

export class SitUpDetector {
  // Angle thresholds for sit-up detection
  private static readonly ANGLE_THRESHOLDS = {
    DOWN_POSITION: 15, // Nearly flat
    UP_POSITION: 60, // Sitting up position
    TRANSITION_BUFFER: 5, // Buffer to prevent oscillation
    MIN_RANGE: 35, // Minimum range of motion for valid rep
  };

  // Timing thresholds
  private static readonly TIMING = {
    MIN_REP_DURATION: 800, // Minimum time for complete rep (ms)
    MAX_REP_DURATION: 8000, // Maximum time for complete rep (ms)
    MIN_PHASE_DURATION: 200, // Minimum time in each phase (ms)
    STATIONARY_THRESHOLD: 100, // Time to consider movement stopped (ms)
  };

  private currentState: SitUpState;
  private angleHistory: { angle: number; timestamp: number }[] = [];
  private repHistory: {
    startAngle: number;
    endAngle: number;
    duration: number;
    formScore: number;
  }[] = [];
  private readonly MAX_HISTORY = 30;

  constructor() {
    this.currentState = {
      currentPhase: "down",
      phaseStartTime: Date.now(),
      torsoAngle: 0,
      previousTorsoAngle: 0,
      movementDirection: "stationary",
      repStartTime: Date.now(),
      confidence: 1.0,
      isValidPosition: true,
    };
  }

  /**
   * Detect sit-up rep from pose data
   */
  detectRep(
    pose: Pose,
    jointAngles: JointAngles,
    calibration?: CalibrationData
  ): RepDetectionResult {
    const now = Date.now();

    // Calculate torso angle
    const torsoAngle = this.calculateTorsoAngle(pose, jointAngles);

    // Update state
    this.updateState(torsoAngle, now);

    // Add to history
    this.addToHistory(torsoAngle, now);

    // Detect movement direction
    this.detectMovementDirection();

    // Check for rep completion
    const repResult = this.checkForCompletedRep(now);

    return {
      repDetected: repResult.detected,
      repData: repResult.repData,
      currentPhase: this.currentState.currentPhase,
      progress: this.calculateProgress(),
      reason: repResult.reason,
    };
  }

  /**
   * Calculate torso angle relative to ground
   */
  private calculateTorsoAngle(pose: Pose, jointAngles: JointAngles): number {
    // Method 1: Use shoulder to hip angle
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

    if (leftShoulder && rightShoulder && leftHip && rightHip) {
      // Calculate center points
      const shoulderCenter = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2,
      };
      const hipCenter = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2,
      };

      // Calculate angle from horizontal
      const deltaX = shoulderCenter.x - hipCenter.x;
      const deltaY = shoulderCenter.y - hipCenter.y;

      // Convert to angle from horizontal (0° = lying flat, 90° = sitting up)
      let angle = Math.atan2(-deltaY, Math.abs(deltaX)) * (180 / Math.PI);

      // Ensure angle is positive and represents upward movement
      angle = Math.max(0, Math.min(90, angle));

      return angle;
    }

    // Method 2: Fallback to joint angles if landmarks not available
    return Math.max(0, Math.min(90, jointAngles.torsoAngle || 0));
  }

  /**
   * Update current state based on torso angle
   */
  private updateState(torsoAngle: number, timestamp: number): void {
    this.currentState.previousTorsoAngle = this.currentState.torsoAngle;
    this.currentState.torsoAngle = torsoAngle;

    // Determine current phase based on angle
    const newPhase = this.determinePhase(torsoAngle);

    // Check for phase transition
    if (newPhase !== this.currentState.currentPhase) {
      this.currentState.currentPhase = newPhase;
      this.currentState.phaseStartTime = timestamp;
    }

    // Validate position
    this.currentState.isValidPosition = this.validatePosition(torsoAngle);

    // Update confidence based on position validity and movement smoothness
    this.updateConfidence();
  }

  /**
   * Determine phase based on torso angle
   */
  private determinePhase(torsoAngle: number): "down" | "up" | "transition" {
    const { DOWN_POSITION, UP_POSITION, TRANSITION_BUFFER } =
      SitUpDetector.ANGLE_THRESHOLDS;

    if (torsoAngle <= DOWN_POSITION + TRANSITION_BUFFER) {
      return "down";
    } else if (torsoAngle >= UP_POSITION - TRANSITION_BUFFER) {
      return "up";
    } else {
      return "transition";
    }
  }

  /**
   * Validate if current position is acceptable for sit-ups
   */
  private validatePosition(torsoAngle: number): boolean {
    // Check if angle is within reasonable range
    if (torsoAngle < 0 || torsoAngle > 90) {
      return false;
    }

    // Check for reasonable movement (not too fast or erratic)
    const angleDifference = Math.abs(
      torsoAngle - this.currentState.previousTorsoAngle
    );
    if (angleDifference > 30) {
      // More than 30° change in one frame is suspicious
      return false;
    }

    return true;
  }

  /**
   * Update confidence score
   */
  private updateConfidence(): void {
    let confidence = 1.0;

    // Reduce confidence for invalid positions
    if (!this.currentState.isValidPosition) {
      confidence *= 0.7;
    }

    // Reduce confidence for erratic movement
    const recentAngles = this.angleHistory.slice(-5).map((h) => h.angle);
    if (recentAngles.length >= 3) {
      const variance = this.calculateVariance(recentAngles);
      if (variance > 100) {
        // High variance indicates erratic movement
        confidence *= 0.8;
      }
    }

    // Reduce confidence if movement is too slow or too fast
    const movementSpeed = this.calculateMovementSpeed();
    if (movementSpeed < 5 || movementSpeed > 100) {
      // degrees per second
      confidence *= 0.9;
    }

    this.currentState.confidence = Math.max(0.3, confidence);
  }

  /**
   * Add angle measurement to history
   */
  private addToHistory(angle: number, timestamp: number): void {
    this.angleHistory.push({ angle, timestamp });

    // Keep history manageable
    if (this.angleHistory.length > this.MAX_HISTORY) {
      this.angleHistory.shift();
    }
  }

  /**
   * Detect movement direction
   */
  private detectMovementDirection(): void {
    if (this.angleHistory.length < 3) {
      this.currentState.movementDirection = "stationary";
      return;
    }

    const recent = this.angleHistory.slice(-3);
    const angleChange = recent[2].angle - recent[0].angle;
    const timeChange = recent[2].timestamp - recent[0].timestamp;

    if (Math.abs(angleChange) < 2 || timeChange < 100) {
      this.currentState.movementDirection = "stationary";
    } else if (angleChange > 0) {
      this.currentState.movementDirection = "up";
    } else {
      this.currentState.movementDirection = "down";
    }
  }

  /**
   * Check for completed rep
   */
  private checkForCompletedRep(timestamp: number): {
    detected: boolean;
    repData?: any;
    reason?: string;
  } {
    // Need to have gone from down to up and back to down
    const recentPhases = this.getRecentPhaseSequence();

    // Look for down -> up -> down sequence
    const hasValidSequence = this.hasDownUpDownSequence(recentPhases);

    if (!hasValidSequence) {
      return {
        detected: false,
        reason: `Incomplete sequence. Recent phases: ${recentPhases.join(
          " -> "
        )}`,
      };
    }

    // Check timing constraints
    const repDuration = timestamp - this.currentState.repStartTime;
    if (repDuration < SitUpDetector.TIMING.MIN_REP_DURATION) {
      return {
        detected: false,
        reason: `Rep too fast: ${repDuration}ms`,
      };
    }

    if (repDuration > SitUpDetector.TIMING.MAX_REP_DURATION) {
      return {
        detected: false,
        reason: `Rep too slow: ${repDuration}ms`,
      };
    }

    // Check range of motion
    const angleRange = this.calculateAngleRange();
    if (angleRange < SitUpDetector.ANGLE_THRESHOLDS.MIN_RANGE) {
      return {
        detected: false,
        reason: `Insufficient range of motion: ${angleRange}°`,
      };
    }

    // Calculate form score
    const formScore = this.calculateFormScore(repDuration, angleRange);

    const repData = {
      count: 1,
      timestamp,
      formScore,
      duration: repDuration,
      phase: "down" as const,
      exerciseType: "situps" as const,
      confidence: this.currentState.confidence,
      metadata: {
        angleRange,
        maxAngle: Math.max(...this.angleHistory.slice(-10).map((h) => h.angle)),
        minAngle: Math.min(...this.angleHistory.slice(-10).map((h) => h.angle)),
      },
    };

    // Add to rep history
    this.repHistory.push({
      startAngle: Math.min(...this.angleHistory.slice(-10).map((h) => h.angle)),
      endAngle: Math.max(...this.angleHistory.slice(-10).map((h) => h.angle)),
      duration: repDuration,
      formScore,
    });

    // Reset for next rep
    this.currentState.repStartTime = timestamp;

    return {
      detected: true,
      repData,
      reason: `Valid sit-up: ${angleRange}° range, ${repDuration}ms duration`,
    };
  }

  /**
   * Get recent phase sequence for analysis
   */
  private getRecentPhaseSequence(): string[] {
    // This is a simplified version - in a real implementation,
    // you'd track phase transitions more carefully
    const recentAngles = this.angleHistory.slice(-10);
    const phases: string[] = [];

    recentAngles.forEach(({ angle }) => {
      phases.push(this.determinePhase(angle));
    });

    // Remove consecutive duplicates
    return phases.filter(
      (phase, index) => index === 0 || phase !== phases[index - 1]
    );
  }

  /**
   * Check for down-up-down sequence
   */
  private hasDownUpDownSequence(phases: string[]): boolean {
    if (phases.length < 3) return false;

    for (let i = 0; i <= phases.length - 3; i++) {
      if (
        phases[i] === "down" &&
        phases[i + 1] === "up" &&
        phases[i + 2] === "down"
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate angle range for current rep
   */
  private calculateAngleRange(): number {
    const recentAngles = this.angleHistory.slice(-10).map((h) => h.angle);
    if (recentAngles.length === 0) return 0;

    const maxAngle = Math.max(...recentAngles);
    const minAngle = Math.min(...recentAngles);

    return maxAngle - minAngle;
  }

  /**
   * Calculate form score based on various factors
   */
  private calculateFormScore(duration: number, angleRange: number): number {
    let score = 100;

    // Deduct points for poor range of motion
    const idealRange = 50; // degrees
    if (angleRange < idealRange) {
      const rangePenalty = ((idealRange - angleRange) / idealRange) * 30;
      score -= rangePenalty;
    }

    // Deduct points for poor timing
    const idealDuration = 2000; // 2 seconds
    const durationDiff = Math.abs(duration - idealDuration);
    if (durationDiff > 1000) {
      const timingPenalty = Math.min(20, (durationDiff - 1000) / 100);
      score -= timingPenalty;
    }

    // Deduct points for low confidence
    const confidencePenalty = (1 - this.currentState.confidence) * 20;
    score -= confidencePenalty;

    // Deduct points for erratic movement
    const recentAngles = this.angleHistory.slice(-10).map((h) => h.angle);
    const smoothness = this.calculateSmoothness(recentAngles);
    if (smoothness < 0.8) {
      score -= (1 - smoothness) * 15;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Calculate progress through current rep (0-1)
   */
  private calculateProgress(): number {
    const { DOWN_POSITION, UP_POSITION } = SitUpDetector.ANGLE_THRESHOLDS;
    const currentAngle = this.currentState.torsoAngle;

    if (this.currentState.movementDirection === "up") {
      // Going from down to up
      return Math.min(
        1.0,
        (currentAngle - DOWN_POSITION) / (UP_POSITION - DOWN_POSITION)
      );
    } else if (this.currentState.movementDirection === "down") {
      // Going from up to down (second half of rep)
      const upProgress =
        (UP_POSITION - currentAngle) / (UP_POSITION - DOWN_POSITION);
      return Math.min(1.0, 0.5 + upProgress * 0.5);
    }

    return 0;
  }

  /**
   * Calculate movement speed in degrees per second
   */
  private calculateMovementSpeed(): number {
    if (this.angleHistory.length < 2) return 0;

    const recent = this.angleHistory.slice(-2);
    const angleChange = Math.abs(recent[1].angle - recent[0].angle);
    const timeChange = (recent[1].timestamp - recent[0].timestamp) / 1000; // Convert to seconds

    return timeChange > 0 ? angleChange / timeChange : 0;
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance =
      numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) /
      numbers.length;

    return variance;
  }

  /**
   * Calculate smoothness of movement (0-1, where 1 is perfectly smooth)
   */
  private calculateSmoothness(angles: number[]): number {
    if (angles.length < 3) return 1;

    let totalChange = 0;
    let directionChanges = 0;
    let previousDirection = 0;

    for (let i = 1; i < angles.length; i++) {
      const change = angles[i] - angles[i - 1];
      totalChange += Math.abs(change);

      const direction = change > 0 ? 1 : change < 0 ? -1 : 0;
      if (
        direction !== 0 &&
        previousDirection !== 0 &&
        direction !== previousDirection
      ) {
        directionChanges++;
      }
      previousDirection = direction;
    }

    // Smoothness is inversely related to direction changes
    const maxDirectionChanges = angles.length - 2;
    const smoothness =
      maxDirectionChanges > 0 ? 1 - directionChanges / maxDirectionChanges : 1;

    return Math.max(0, Math.min(1, smoothness));
  }

  /**
   * Get current state for debugging
   */
  getCurrentState(): SitUpState {
    return { ...this.currentState };
  }

  /**
   * Get angle history for analysis
   */
  getAngleHistory(): typeof SitUpDetector.prototype.angleHistory {
    return [...this.angleHistory];
  }

  /**
   * Get rep history for analysis
   */
  getRepHistory(): typeof SitUpDetector.prototype.repHistory {
    return [...this.repHistory];
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.currentState = {
      currentPhase: "down",
      phaseStartTime: Date.now(),
      torsoAngle: 0,
      previousTorsoAngle: 0,
      movementDirection: "stationary",
      repStartTime: Date.now(),
      confidence: 1.0,
      isValidPosition: true,
    };

    this.angleHistory = [];
    this.repHistory = [];
  }
}
