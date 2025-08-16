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

  /**
   * Validate plank form and body alignment
   */
  private validatePlankForm(pose: Pose): {
    isValidForm: boolean;
    bodyAlignment: number;
    hipAlignment: number;
    shoulderAlignment: number;
    overallScore: number;
    issues: string[];
  } {
    const nose = pose.landmarks.find((l) => l.type === LandmarkType.NOSE);
    const leftShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_SHOULDER
    );
    const rightShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_SHOULDER
    );
    const leftElbow = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_ELBOW
    );
    const rightElbow = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_ELBOW
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

    const issues: string[] = [];

    if (
      !nose ||
      !leftShoulder ||
      !rightShoulder ||
      !leftElbow ||
      !rightElbow ||
      !leftHip ||
      !rightHip ||
      !leftAnkle ||
      !rightAnkle
    ) {
      return {
        isValidForm: false,
        bodyAlignment: 0,
        hipAlignment: 0,
        shoulderAlignment: 0,
        overallScore: 0,
        issues: ["Cannot detect all required body parts"],
      };
    }

    // Check landmark visibility
    const minVisibility = 0.6;
    const landmarks = [
      nose,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftHip,
      rightHip,
      leftAnkle,
      rightAnkle,
    ];
    if (landmarks.some((l) => l.visibility < minVisibility)) {
      issues.push("Some body parts not clearly visible");
    }

    // Calculate body centers
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

    // 1. Body Alignment (shoulder-hip-ankle line)
    const bodyAlignment = this.calculateBodyLineAlignment(
      shoulderCenter,
      hipCenter,
      ankleCenter
    );
    if (bodyAlignment > this.BODY_ALIGNMENT_TOLERANCE) {
      issues.push("Keep body in straight line");
    }

    // 2. Hip Alignment (no sagging or piking)
    const hipAlignment = this.calculateHipAlignment(
      shoulderCenter,
      hipCenter,
      ankleCenter
    );
    if (hipAlignment > this.HIP_SAG_TOLERANCE) {
      if (hipCenter.y > shoulderCenter.y + 20) {
        issues.push("Lift your hips - no sagging");
      } else {
        issues.push("Lower your hips - don't pike up");
      }
    }

    // 3. Shoulder Alignment (over elbows/wrists)
    const shoulderAlignment = this.calculateShoulderAlignment(
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow
    );
    if (shoulderAlignment > this.SHOULDER_ALIGNMENT_TOLERANCE) {
      issues.push("Align shoulders over elbows");
    }

    // 4. Check if in plank position (not standing or lying down)
    const isInPlankPosition = this.isInPlankPosition(
      shoulderCenter,
      hipCenter,
      ankleCenter
    );
    if (!isInPlankPosition) {
      issues.push("Get into plank position");
    }

    // Calculate scores
    const bodyScore = Math.max(
      0,
      100 - (bodyAlignment / this.BODY_ALIGNMENT_TOLERANCE) * 100
    );
    const hipScore = Math.max(
      0,
      100 - (hipAlignment / this.HIP_SAG_TOLERANCE) * 100
    );
    const shoulderScore = Math.max(
      0,
      100 - (shoulderAlignment / this.SHOULDER_ALIGNMENT_TOLERANCE) * 100
    );
    const positionScore = isInPlankPosition ? 100 : 0;

    const overallScore =
      (bodyScore + hipScore + shoulderScore + positionScore) / 4;
    const isValidForm = issues.length === 0 && overallScore >= 75;

    return {
      isValidForm,
      bodyAlignment,
      hipAlignment,
      shoulderAlignment,
      overallScore,
      issues,
    };
  }

  /**
   * Calculate body line alignment deviation
   */
  private calculateBodyLineAlignment(
    shoulder: any,
    hip: any,
    ankle: any
  ): number {
    // Calculate vectors
    const shoulderToHip = { x: hip.x - shoulder.x, y: hip.y - shoulder.y };
    const hipToAnkle = { x: ankle.x - hip.x, y: ankle.y - hip.y };

    // Calculate angle between vectors
    const dot = shoulderToHip.x * hipToAnkle.x + shoulderToHip.y * hipToAnkle.y;
    const mag1 = Math.sqrt(shoulderToHip.x ** 2 + shoulderToHip.y ** 2);
    const mag2 = Math.sqrt(hipToAnkle.x ** 2 + hipToAnkle.y ** 2);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cos = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);

    // Return deviation from straight line (180°)
    return Math.abs(180 - angle);
  }

  /**
   * Calculate hip alignment (detect sagging or piking)
   */
  private calculateHipAlignment(shoulder: any, hip: any, ankle: any): number {
    // Calculate the expected hip position on the straight line
    const shoulderToAnkle = {
      x: ankle.x - shoulder.x,
      y: ankle.y - shoulder.y,
    };
    const shoulderToHip = { x: hip.x - shoulder.x, y: hip.y - shoulder.y };

    // Project hip onto shoulder-ankle line
    const dot =
      shoulderToHip.x * shoulderToAnkle.x + shoulderToHip.y * shoulderToAnkle.y;
    const magSqr = shoulderToAnkle.x ** 2 + shoulderToAnkle.y ** 2;

    if (magSqr === 0) return 0;

    const t = dot / magSqr;
    const projection = {
      x: shoulder.x + t * shoulderToAnkle.x,
      y: shoulder.y + t * shoulderToAnkle.y,
    };

    // Calculate perpendicular distance from hip to line
    const distance = Math.sqrt(
      (hip.x - projection.x) ** 2 + (hip.y - projection.y) ** 2
    );

    // Convert to angle deviation
    const lineLength = Math.sqrt(magSqr);
    return Math.atan(distance / lineLength) * (180 / Math.PI);
  }

  /**
   * Calculate shoulder alignment over elbows
   */
  private calculateShoulderAlignment(
    leftShoulder: any,
    rightShoulder: any,
    leftElbow: any,
    rightElbow: any
  ): number {
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };

    const elbowCenter = {
      x: (leftElbow.x + rightElbow.x) / 2,
      y: (leftElbow.y + rightElbow.y) / 2,
    };

    // Calculate horizontal distance between shoulder and elbow centers
    const horizontalDistance = Math.abs(shoulderCenter.x - elbowCenter.x);

    // Convert to approximate angle (assuming typical plank proportions)
    return Math.atan(horizontalDistance / 100) * (180 / Math.PI);
  }

  /**
   * Check if person is in plank position (not standing or lying)
   */
  private isInPlankPosition(shoulder: any, hip: any, ankle: any): boolean {
    // Check if body is roughly horizontal (plank-like)
    const shoulderToAnkle = {
      x: ankle.x - shoulder.x,
      y: ankle.y - shoulder.y,
    };
    const bodyAngle =
      Math.atan2(Math.abs(shoulderToAnkle.y), Math.abs(shoulderToAnkle.x)) *
      (180 / Math.PI);

    // Plank should be roughly horizontal (0-30 degrees from horizontal)
    const isHorizontal = bodyAngle <= 30;

    // Check if shoulders are above hips (not lying flat)
    const shouldersAboveHips = shoulder.y < hip.y + 50; // Some tolerance

    // Check if person is not standing (hips should be relatively close to shoulder level)
    const notStanding = Math.abs(shoulder.y - hip.y) < 200;

    return isHorizontal && shouldersAboveHips && notStanding;
  }

  /**
   * Update current plank state
   */
  private updateState(
    formAnalysis: {
      isValidForm: boolean;
      bodyAlignment: number;
      hipAlignment: number;
      shoulderAlignment: number;
      overallScore: number;
    },
    timestamp: number
  ): void {
    const prevPhase = this.currentState.phase;

    // Update form metrics
    this.currentState.bodyAlignment = formAnalysis.overallScore;
    this.currentState.hipAlignment = formAnalysis.hipAlignment;
    this.currentState.shoulderAlignment = formAnalysis.shoulderAlignment;
    this.currentState.isValidForm = formAnalysis.isValidForm;

    // Handle phase transitions
    if (formAnalysis.isValidForm) {
      this.lastValidFormTime = timestamp;

      if (this.currentState.phase === "setup") {
        // Start form stability timer
        if (this.formStabilityStart === 0) {
          this.formStabilityStart = timestamp;
        } else if (
          timestamp - this.formStabilityStart >=
          this.FORM_STABILITY_DURATION
        ) {
          // Good form maintained for required duration, start hold
          this.currentState.phase = "hold";
          this.currentState.holdStartTime = timestamp;
          this.formStabilityStart = 0;
        }
      } else if (this.currentState.phase === "hold") {
        // Continue holding
        this.currentState.currentHoldDuration =
          timestamp - this.currentState.holdStartTime;
      } else if (this.currentState.phase === "rest") {
        // Return to setup if good form detected
        this.currentState.phase = "setup";
        this.formStabilityStart = timestamp;
      }
    } else {
      // Invalid form
      this.formStabilityStart = 0;

      if (this.currentState.phase === "hold") {
        // Lost form during hold, go to rest
        if (this.currentState.currentHoldDuration >= this.MIN_HOLD_DURATION) {
          this.currentState.totalHoldTime +=
            this.currentState.currentHoldDuration;
        }
        this.currentState.phase = "rest";
        this.currentState.currentHoldDuration = 0;
      } else if (this.currentState.phase === "setup") {
        // Still in setup, keep trying
        // Check for setup timeout
        if (timestamp - this.lastValidFormTime > this.SETUP_TIMEOUT) {
          this.currentState.phase = "rest";
        }
      }
    }
  }

  /**
   * Check if hold is complete (for timed planks)
   */
  private checkHoldCompletion(timestamp: number): {
    detected: boolean;
    repData?: RepData;
    reason?: string;
  } {
    // For planks, we don't detect "reps" in the traditional sense
    // Instead, we track hold duration

    if (this.currentState.phase === "hold") {
      return {
        detected: false,
        reason: `Holding: ${Math.round(
          this.currentState.currentHoldDuration / 1000
        )}s`,
      };
    }

    if (
      this.currentState.phase === "rest" &&
      this.currentState.totalHoldTime > 0
    ) {
      // Just finished a hold, report it as a "rep"
      const repData: RepData = {
        count: 1, // Planks are typically counted as single holds
        timestamp,
        formScore: this.currentState.bodyAlignment,
        duration: this.currentState.totalHoldTime,
        phase: "hold",
        exerciseType: "planks",
        confidence: this.calculateConfidence(),
      };

      // Reset for next hold
      this.currentState.totalHoldTime = 0;

      return { detected: true, repData };
    }

    if (this.currentState.phase === "setup") {
      return { detected: false, reason: "Get into plank position" };
    }

    return { detected: false, reason: "Rest between holds" };
  }

  /**
   * Calculate progress (for planks, this is hold duration progress)
   */
  private calculateProgress(): number {
    if (this.currentState.phase === "hold") {
      // Progress based on current hold duration (assuming 30s target)
      const targetDuration = 30000; // 30 seconds
      return Math.min(
        1,
        this.currentState.currentHoldDuration / targetDuration
      );
    }

    if (this.currentState.phase === "setup") {
      // Progress based on form stability
      if (this.formStabilityStart > 0) {
        const stabilityProgress =
          (Date.now() - this.formStabilityStart) / this.FORM_STABILITY_DURATION;
        return Math.min(0.2, stabilityProgress * 0.2); // 0-20% for setup
      }
    }

    return 0;
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
    const stabilityBonus = this.poseHistory.length >= 8 ? 0.1 : 0;

    return Math.min(
      1,
      avgPoseConfidence * 0.6 + formQuality * 0.3 + stabilityBonus
    );
  }

  /**
   * Get current hold duration in seconds
   */
  getCurrentHoldDuration(): number {
    return Math.round(this.currentState.currentHoldDuration / 1000);
  }

  /**
   * Get total hold time in seconds
   */
  getTotalHoldTime(): number {
    return Math.round(
      (this.currentState.totalHoldTime +
        this.currentState.currentHoldDuration) /
        1000
    );
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.currentState = {
      phase: "setup",
      bodyAlignment: 0,
      hipAlignment: 0,
      shoulderAlignment: 0,
      isValidForm: false,
      holdStartTime: 0,
      totalHoldTime: 0,
      currentHoldDuration: 0,
    };
    this.poseHistory = [];
    this.formStabilityStart = 0;
    this.lastValidFormTime = Date.now();
  }

  /**
   * Get current state for debugging
   */
  getCurrentState(): PlankState {
    return { ...this.currentState };
  }
}
