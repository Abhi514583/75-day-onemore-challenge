import { Pose, LandmarkType } from "../MLKitPoseService";
import { CalibrationData, JointAngles } from "../PoseProcessor";
import {
  RepDetectionResult,
  MovementState,
  RepPhase,
} from "../../../types/pose";

export interface BurpeePhase {
  name: "standing" | "squat-down" | "plank" | "push-up" | "squat-up" | "jump";
  minDuration: number; // milliseconds
  maxDuration: number; // milliseconds
  requiredAngles: { [joint: string]: [number, number] }; // [min, max] angles
  transitionTo: BurpeePhase["name"][];
}

export interface BurpeeState {
  currentPhase: BurpeePhase["name"];
  phaseStartTime: number;
  phaseDuration: number;
  completedPhases: BurpeePhase["name"][];
  isValidTransition: boolean;
  confidence: number;
}

export class BurpeeDetector {
  private static readonly PHASES: {
    [key in BurpeePhase["name"]]: BurpeePhase;
  } = {
    standing: {
      name: "standing",
      minDuration: 200,
      maxDuration: 2000,
      requiredAngles: {
        leftKnee: [160, 180],
        rightKnee: [160, 180],
        leftHip: [160, 180],
        rightHip: [160, 180],
      },
      transitionTo: ["squat-down"],
    },
    "squat-down": {
      name: "squat-down",
      minDuration: 300,
      maxDuration: 1500,
      requiredAngles: {
        leftKnee: [70, 120],
        rightKnee: [70, 120],
        leftHip: [70, 120],
        rightHip: [70, 120],
      },
      transitionTo: ["plank"],
    },
    plank: {
      name: "plank",
      minDuration: 200,
      maxDuration: 1000,
      requiredAngles: {
        leftElbow: [160, 180],
        rightElbow: [160, 180],
        leftKnee: [160, 180],
        rightKnee: [160, 180],
      },
      transitionTo: ["push-up", "squat-up"],
    },
    "push-up": {
      name: "push-up",
      minDuration: 400,
      maxDuration: 2000,
      requiredAngles: {
        leftElbow: [60, 120], // Down position
        rightElbow: [60, 120],
      },
      transitionTo: ["plank"],
    },
    "squat-up": {
      name: "squat-up",
      minDuration: 300,
      maxDuration: 1500,
      requiredAngles: {
        leftKnee: [70, 120],
        rightKnee: [70, 120],
        leftHip: [70, 120],
        rightHip: [70, 120],
      },
      transitionTo: ["jump", "standing"],
    },
    jump: {
      name: "jump",
      minDuration: 200,
      maxDuration: 800,
      requiredAngles: {
        leftKnee: [140, 180],
        rightKnee: [140, 180],
        leftHip: [140, 180],
        rightHip: [140, 180],
      },
      transitionTo: ["standing"],
    },
  };

  private static readonly REQUIRED_PHASE_SEQUENCE: BurpeePhase["name"][] = [
    "standing",
    "squat-down",
    "plank",
    "squat-up",
    "standing",
  ];

  private static readonly OPTIONAL_PUSH_UP_SEQUENCE: BurpeePhase["name"][] = [
    "standing",
    "squat-down",
    "plank",
    "push-up",
    "plank",
    "squat-up",
    "standing",
  ];

  private currentState: BurpeeState;
  private phaseHistory: {
    phase: BurpeePhase["name"];
    timestamp: number;
    duration: number;
  }[] = [];
  private readonly MAX_HISTORY = 20;

  constructor() {
    this.currentState = {
      currentPhase: "standing",
      phaseStartTime: Date.now(),
      phaseDuration: 0,
      completedPhases: [],
      isValidTransition: true,
      confidence: 1.0,
    };
  }

  /**
   * Detect burpee rep from pose data
   */
  detectRep(
    pose: Pose,
    jointAngles: JointAngles,
    calibration?: CalibrationData
  ): RepDetectionResult {
    const now = Date.now();
    this.currentState.phaseDuration = now - this.currentState.phaseStartTime;

    // Detect current phase based on pose
    const detectedPhase = this.detectCurrentPhase(pose, jointAngles);

    // Check for phase transition
    const transitionResult = this.checkPhaseTransition(detectedPhase, now);

    // Update state if transition occurred
    if (transitionResult.transitioned) {
      this.updatePhaseState(detectedPhase, now);
    }

    // Check for completed burpee
    const repResult = this.checkForCompletedBurpee();

    return {
      repDetected: repResult.detected,
      repData: repResult.repData,
      currentPhase: this.mapPhaseToRepPhase(this.currentState.currentPhase),
      progress: this.calculateProgress(),
      reason: repResult.reason,
    };
  }

  /**
   * Detect current phase based on pose angles
   */
  private detectCurrentPhase(
    pose: Pose,
    jointAngles: JointAngles
  ): BurpeePhase["name"] {
    const phaseScores: { [phase: string]: number } = {};

    // Calculate how well the current pose matches each phase
    Object.entries(BurpeeDetector.PHASES).forEach(
      ([phaseName, phaseConfig]) => {
        let score = 0;
        let totalChecks = 0;

        Object.entries(phaseConfig.requiredAngles).forEach(
          ([joint, [minAngle, maxAngle]]) => {
            const currentAngle = (jointAngles as any)[joint];
            if (currentAngle !== undefined) {
              totalChecks++;
              if (currentAngle >= minAngle && currentAngle <= maxAngle) {
                score++;
              }
            }
          }
        );

        phaseScores[phaseName] = totalChecks > 0 ? score / totalChecks : 0;
      }
    );

    // Add context-based scoring (prefer logical transitions)
    const currentPhase = this.currentState.currentPhase;
    const possibleTransitions =
      BurpeeDetector.PHASES[currentPhase].transitionTo;

    possibleTransitions.forEach((phase) => {
      phaseScores[phase] *= 1.2; // Boost score for valid transitions
    });

    // Special case: detect jump by vertical movement
    const jumpScore = this.detectJumpMovement(pose, jointAngles);
    if (jumpScore > 0.7) {
      phaseScores["jump"] = Math.max(phaseScores["jump"] || 0, jumpScore);
    }

    // Find phase with highest score
    const bestPhase = Object.entries(phaseScores).sort(
      ([, a], [, b]) => b - a
    )[0];

    return (
      (bestPhase?.[0] as BurpeePhase["name"]) || this.currentState.currentPhase
    );
  }

  /**
   * Detect jump movement based on body position changes
   */
  private detectJumpMovement(pose: Pose, jointAngles: JointAngles): number {
    // Check if person is in extended position (arms up, legs straight)
    const armsExtended =
      jointAngles.leftElbow > 160 && jointAngles.rightElbow > 160;
    const legsExtended =
      jointAngles.leftKnee > 160 && jointAngles.rightKnee > 160;
    const hipsExtended =
      jointAngles.leftHip > 160 && jointAngles.rightHip > 160;

    // Check for upward body position
    const nose = pose.landmarks.find((l) => l.type === LandmarkType.NOSE);
    const leftHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_HIP
    );
    const rightHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_HIP
    );

    if (!nose || !leftHip || !rightHip) return 0;

    const hipCenter = {
      y: (leftHip.y + rightHip.y) / 2,
    };

    // If head is significantly above hips, likely jumping
    const headAboveHips = nose.y < hipCenter.y - 50; // Adjust threshold as needed

    let score = 0;
    if (armsExtended) score += 0.3;
    if (legsExtended) score += 0.3;
    if (hipsExtended) score += 0.2;
    if (headAboveHips) score += 0.2;

    return Math.min(1.0, score);
  }

  /**
   * Check for phase transition
   */
  private checkPhaseTransition(
    detectedPhase: BurpeePhase["name"],
    timestamp: number
  ): { transitioned: boolean; reason?: string } {
    const currentPhase = this.currentState.currentPhase;
    const currentDuration = this.currentState.phaseDuration;
    const phaseConfig = BurpeeDetector.PHASES[currentPhase];

    // Check if we've been in current phase long enough
    if (currentDuration < phaseConfig.minDuration) {
      return { transitioned: false, reason: "Phase duration too short" };
    }

    // Check if detected phase is different from current
    if (detectedPhase === currentPhase) {
      // Check if we've been in phase too long
      if (currentDuration > phaseConfig.maxDuration) {
        // Force transition to most likely next phase
        const nextPhase = phaseConfig.transitionTo[0];
        return {
          transitioned: true,
          reason: "Phase duration exceeded, forcing transition",
        };
      }
      return { transitioned: false, reason: "Same phase detected" };
    }

    // Check if transition is valid
    if (!phaseConfig.transitionTo.includes(detectedPhase)) {
      return { transitioned: false, reason: "Invalid phase transition" };
    }

    return { transitioned: true, reason: "Valid phase transition detected" };
  }

  /**
   * Update phase state
   */
  private updatePhaseState(
    newPhase: BurpeePhase["name"],
    timestamp: number
  ): void {
    // Add current phase to history
    this.phaseHistory.push({
      phase: this.currentState.currentPhase,
      timestamp: this.currentState.phaseStartTime,
      duration: this.currentState.phaseDuration,
    });

    // Keep history manageable
    if (this.phaseHistory.length > this.MAX_HISTORY) {
      this.phaseHistory.shift();
    }

    // Add to completed phases
    this.currentState.completedPhases.push(this.currentState.currentPhase);

    // Update current state
    this.currentState.currentPhase = newPhase;
    this.currentState.phaseStartTime = timestamp;
    this.currentState.phaseDuration = 0;

    console.log(
      `Burpee phase transition: ${this.currentState.currentPhase} -> ${newPhase}`
    );
  }

  /**
   * Check for completed burpee
   */
  private checkForCompletedBurpee(): {
    detected: boolean;
    repData?: any;
    reason?: string;
  } {
    const completedPhases = this.currentState.completedPhases;

    // Check if we have a valid burpee sequence
    const hasRequiredSequence = this.hasValidSequence(
      completedPhases,
      BurpeeDetector.REQUIRED_PHASE_SEQUENCE
    );

    const hasOptionalSequence = this.hasValidSequence(
      completedPhases,
      BurpeeDetector.OPTIONAL_PUSH_UP_SEQUENCE
    );

    if (hasRequiredSequence || hasOptionalSequence) {
      // Calculate rep quality
      const formScore = this.calculateFormScore();
      const duration = this.calculateTotalDuration();
      const hasPushUp = completedPhases.includes("push-up");

      const repData = {
        count: 1,
        timestamp: Date.now(),
        formScore,
        duration,
        phase: "up" as const,
        exerciseType: "burpees" as const,
        confidence: this.currentState.confidence,
        metadata: {
          includedPushUp: hasPushUp,
          phaseCount: completedPhases.length,
          totalDuration: duration,
        },
      };

      // Reset state for next rep
      this.resetForNextRep();

      return {
        detected: true,
        repData,
        reason: hasPushUp ? "Complete burpee with push-up" : "Complete burpee",
      };
    }

    return {
      detected: false,
      reason: `Incomplete sequence. Completed: ${completedPhases.join(" -> ")}`,
    };
  }

  /**
   * Check if completed phases contain a valid sequence
   */
  private hasValidSequence(
    completedPhases: BurpeePhase["name"][],
    requiredSequence: BurpeePhase["name"][]
  ): boolean {
    if (completedPhases.length < requiredSequence.length) {
      return false;
    }

    // Look for the sequence in the completed phases
    for (
      let i = 0;
      i <= completedPhases.length - requiredSequence.length;
      i++
    ) {
      let matches = 0;
      for (let j = 0; j < requiredSequence.length; j++) {
        if (completedPhases[i + j] === requiredSequence[j]) {
          matches++;
        } else {
          break;
        }
      }

      if (matches === requiredSequence.length) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate form score based on phase execution
   */
  private calculateFormScore(): number {
    let totalScore = 0;
    let phaseCount = 0;

    this.phaseHistory.forEach((phaseRecord) => {
      const phaseConfig = BurpeeDetector.PHASES[phaseRecord.phase];
      let phaseScore = 100;

      // Deduct points for phases that were too short or too long
      if (phaseRecord.duration < phaseConfig.minDuration) {
        phaseScore -= 20;
      } else if (phaseRecord.duration > phaseConfig.maxDuration) {
        phaseScore -= 10;
      }

      totalScore += Math.max(0, phaseScore);
      phaseCount++;
    });

    return phaseCount > 0 ? Math.round(totalScore / phaseCount) : 0;
  }

  /**
   * Calculate total duration of the burpee
   */
  private calculateTotalDuration(): number {
    if (this.phaseHistory.length === 0) return 0;

    const firstPhase = this.phaseHistory[0];
    const lastPhase = this.phaseHistory[this.phaseHistory.length - 1];

    return lastPhase.timestamp + lastPhase.duration - firstPhase.timestamp;
  }

  /**
   * Calculate progress through burpee (0-1)
   */
  private calculateProgress(): number {
    const requiredPhases = BurpeeDetector.REQUIRED_PHASE_SEQUENCE.length;
    const completedCount = this.currentState.completedPhases.length;

    return Math.min(1.0, completedCount / requiredPhases);
  }

  /**
   * Map burpee phase to generic rep phase
   */
  private mapPhaseToRepPhase(burpeePhase: BurpeePhase["name"]): RepPhase {
    switch (burpeePhase) {
      case "standing":
        return "up";
      case "squat-down":
      case "plank":
      case "push-up":
        return "down";
      case "squat-up":
      case "jump":
        return "up";
      default:
        return "transition";
    }
  }

  /**
   * Reset state for next rep
   */
  private resetForNextRep(): void {
    this.currentState = {
      currentPhase: "standing",
      phaseStartTime: Date.now(),
      phaseDuration: 0,
      completedPhases: [],
      isValidTransition: true,
      confidence: 1.0,
    };

    // Keep some history for context but clear most of it
    this.phaseHistory = this.phaseHistory.slice(-5);
  }

  /**
   * Get current state for debugging
   */
  getCurrentState(): BurpeeState {
    return { ...this.currentState };
  }

  /**
   * Get phase history for analysis
   */
  getPhaseHistory(): typeof BurpeeDetector.prototype.phaseHistory {
    return [...this.phaseHistory];
  }
}
