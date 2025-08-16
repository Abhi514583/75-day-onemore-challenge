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

  /**
   * Create mock result for unimplemented exercises
   */
  private createMockResult(
    exerciseType: ExerciseType,
    timestamp: number
  ): RepDetectionResult {
    return {
      repDetected: false,
      currentPhase: "up",
      progress: Math.random() * 0.5, // Random progress for demo
      reason: `${exerciseType} detection coming soon`,
    };
  }

  /**
   * Update session with new rep data
   */
  private updateSession(repData: RepData): void {
    if (!this.currentSession) return;

    this.currentSession.totalReps++;
    this.currentSession.repHistory.push(repData);

    // Classify rep as valid or invalid based on form score
    const minFormScore = POSE_DETECTION_CONSTANTS.FORM_SCORE_THRESHOLDS.POOR;
    if (repData.formScore >= minFormScore) {
      this.currentSession.validReps++;
    } else {
      this.currentSession.invalidReps++;
    }

    // Update average form score
    const totalFormScore = this.currentSession.repHistory.reduce(
      (sum, rep) => sum + rep.formScore,
      0
    );
    this.currentSession.averageFormScore =
      totalFormScore / this.currentSession.repHistory.length;

    console.log(
      `✅ Rep ${
        this.currentSession.totalReps
      } detected - Form: ${repData.formScore.toFixed(1)}`
    );
  }

  /**
   * End the current exercise session
   */
  endSession(): ExerciseSession | null {
    if (!this.currentSession) return null;

    this.currentSession.endTime = Date.now();
    this.currentSession.totalDuration =
      this.currentSession.endTime - this.currentSession.startTime;

    const session = { ...this.currentSession };

    console.log(
      `🏁 Session ended: ${session.validReps}/${
        session.totalReps
      } valid reps, avg form: ${session.averageFormScore.toFixed(1)}`
    );

    // Reset state
    this.currentExercise = null;
    this.currentSession = null;
    this.calibrationData = null;

    return session;
  }

  /**
   * Get current session data
   */
  getCurrentSession(): ExerciseSession | null {
    if (!this.currentSession) return null;

    return {
      ...this.currentSession,
      totalDuration: Date.now() - this.currentSession.startTime,
    };
  }

  /**
   * Get current rep count for active exercise
   */
  getCurrentRepCount(): number {
    if (!this.currentExercise) return 0;

    switch (this.currentExercise) {
      case "pushups":
        return this.pushUpDetector.getRepCount();
      case "squats":
        return this.squatDetector.getRepCount();
      case "planks":
        return this.plankDetector.getTotalHoldTime(); // For planks, return hold time
      default:
        return this.currentSession?.totalReps || 0;
    }
  }

  /**
   * Get exercise rules for a specific exercise type
   */
  getExerciseRules(exerciseType: ExerciseType): ExerciseRules {
    // This would return exercise-specific rules and thresholds
    // For now, return a basic structure
    const baseRules: ExerciseRules = {
      exerciseType,
      keyLandmarks: this.getKeyLandmarks(exerciseType),
      movementPhases: this.getMovementPhases(exerciseType),
      formCriteria: [],
      repThresholds: {
        minAngleChange: 45,
        minDuration: 800,
        maxDuration: 5000,
        confidenceThreshold: 0.7,
        formScoreThreshold: 60,
      },
      cameraPosition: this.getCameraPosition(exerciseType),
      difficultyLevels: [
        {
          name: "beginner",
          formStrictness: 0.6,
          angleTolerances: { elbow: 15, knee: 15, hip: 10 },
          feedbackFrequency: "high",
        },
        {
          name: "intermediate",
          formStrictness: 0.8,
          angleTolerances: { elbow: 10, knee: 10, hip: 8 },
          feedbackFrequency: "medium",
        },
        {
          name: "advanced",
          formStrictness: 1.0,
          angleTolerances: { elbow: 5, knee: 5, hip: 5 },
          feedbackFrequency: "low",
        },
      ],
    };

    return baseRules;
  }

  /**
   * Get key landmarks for an exercise
   */
  private getKeyLandmarks(exerciseType: ExerciseType): any[] {
    const landmarkSets = {
      pushups: [11, 12, 13, 14, 15, 16, 23, 24, 27, 28], // Shoulders, elbows, wrists, hips, ankles
      squats: [11, 12, 23, 24, 25, 26, 27, 28], // Shoulders, hips, knees, ankles
      planks: [0, 11, 12, 13, 14, 23, 24, 27, 28], // Nose, shoulders, elbows, hips, ankles
      situps: [0, 11, 12, 23, 24, 25, 26], // Nose, shoulders, hips, knees
      burpees: [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28], // Full body
      lunges: [11, 12, 23, 24, 25, 26, 27, 28], // Shoulders, hips, knees, ankles
      "mountain-climbers": [11, 12, 13, 14, 23, 24, 25, 26], // Shoulders, elbows, hips, knees
      "jumping-jacks": [11, 12, 13, 14, 15, 16, 23, 24, 27, 28], // Shoulders, elbows, wrists, hips, ankles
    };

    return landmarkSets[exerciseType] || [];
  }

  /**
   * Get movement phases for an exercise
   */
  private getMovementPhases(exerciseType: ExerciseType): any[] {
    const phases = {
      pushups: [
        { name: "up", description: "Arms extended, body straight" },
        { name: "down", description: "Arms bent, chest near ground" },
      ],
      squats: [
        { name: "up", description: "Standing position" },
        { name: "down", description: "Squatting position" },
      ],
      planks: [{ name: "hold", description: "Holding plank position" }],
    };

    return (
      phases[exerciseType as keyof typeof phases] || [
        { name: "up", description: "Starting position" },
        { name: "down", description: "Movement position" },
      ]
    );
  }

  /**
   * Get camera position requirements for an exercise
   */
  private getCameraPosition(exerciseType: ExerciseType): any {
    const positions = {
      pushups: {
        angle: "side",
        height: "chest",
        distance: [6, 8],
        description: "Side profile view",
      },
      squats: {
        angle: "diagonal-front",
        height: "chest",
        distance: [6, 8],
        description: "45° diagonal front view",
      },
      planks: {
        angle: "side",
        height: "chest",
        distance: [6, 8],
        description: "Side profile view",
      },
      situps: {
        angle: "side",
        height: "chest",
        distance: [6, 8],
        description: "Side profile view",
      },
      burpees: {
        angle: "diagonal-side",
        height: "chest",
        distance: [8, 10],
        description: "45° diagonal side view",
      },
      lunges: {
        angle: "side",
        height: "chest",
        distance: [6, 8],
        description: "Side profile view",
      },
      "mountain-climbers": {
        angle: "diagonal-side",
        height: "chest",
        distance: [6, 8],
        description: "45° diagonal side view",
      },
      "jumping-jacks": {
        angle: "front",
        height: "chest",
        distance: [6, 8],
        description: "Front view",
      },
    };

    return (
      positions[exerciseType] || {
        angle: "front",
        height: "chest",
        distance: [6, 8],
        description: "Front view",
      }
    );
  }

  /**
   * Reset the appropriate detector for an exercise
   */
  private resetDetector(exerciseType: ExerciseType): void {
    switch (exerciseType) {
      case "pushups":
        this.pushUpDetector.reset();
        break;
      case "squats":
        this.squatDetector.reset();
        break;
      case "planks":
        this.plankDetector.reset();
        break;
      // Add other detectors as they're implemented
    }
  }

  /**
   * Get current exercise state for debugging
   */
  getCurrentExerciseState(): any {
    if (!this.currentExercise) return null;

    switch (this.currentExercise) {
      case "pushups":
        return {
          exercise: "pushups",
          state: this.pushUpDetector.getCurrentState(),
          repCount: this.pushUpDetector.getRepCount(),
        };
      case "squats":
        return {
          exercise: "squats",
          state: this.squatDetector.getCurrentState(),
          repCount: this.squatDetector.getRepCount(),
        };
      case "planks":
        return {
          exercise: "planks",
          state: this.plankDetector.getCurrentState(),
          holdTime: this.plankDetector.getCurrentHoldDuration(),
        };
      default:
        return { exercise: this.currentExercise, state: "not implemented" };
    }
  }

  /**
   * Check if an exercise type is supported
   */
  isExerciseSupported(exerciseType: ExerciseType): boolean {
    return ["pushups", "squats", "planks"].includes(exerciseType);
  }

  /**
   * Get list of supported exercises
   */
  getSupportedExercises(): ExerciseType[] {
    return ["pushups", "squats", "planks"];
  }

  /**
   * Get list of exercises coming soon
   */
  getComingSoonExercises(): ExerciseType[] {
    return [
      "situps",
      "burpees",
      "lunges",
      "mountain-climbers",
      "jumping-jacks",
    ];
  }
}
