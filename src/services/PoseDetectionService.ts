import * as tf from "@tensorflow/tfjs";

// Simplified pose detection for exercises
// In a real implementation, you'd use MediaPipe or PoseNet
export interface PoseKeypoint {
  x: number;
  y: number;
  confidence: number;
}

export interface PoseDetection {
  keypoints: {
    nose: PoseKeypoint;
    leftShoulder: PoseKeypoint;
    rightShoulder: PoseKeypoint;
    leftElbow: PoseKeypoint;
    rightElbow: PoseKeypoint;
    leftWrist: PoseKeypoint;
    rightWrist: PoseKeypoint;
    leftHip: PoseKeypoint;
    rightHip: PoseKeypoint;
    leftKnee: PoseKeypoint;
    rightKnee: PoseKeypoint;
    leftAnkle: PoseKeypoint;
    rightAnkle: PoseKeypoint;
  };
  confidence: number;
}

export type ExerciseType = "pushups" | "squats" | "situps" | "planks";

export interface ExerciseState {
  repCount: number;
  currentPhase: "up" | "down" | "neutral";
  lastPhaseChange: number;
  isValid: boolean;
}

class PoseDetectionService {
  private exerciseStates: Map<ExerciseType, ExerciseState> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize TensorFlow.js
      await tf.ready();
      console.log("TensorFlow.js initialized");
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize TensorFlow.js:", error);
      throw error;
    }
  }

  startExercise(exerciseType: ExerciseType): void {
    this.exerciseStates.set(exerciseType, {
      repCount: 0,
      currentPhase: "neutral",
      lastPhaseChange: Date.now(),
      isValid: false,
    });
  }

  stopExercise(exerciseType: ExerciseType): void {
    this.exerciseStates.delete(exerciseType);
  }

  // Simulate pose detection with realistic exercise movements
  simulatePoseDetection(): PoseDetection {
    const time = Date.now();
    const cycleTime = 3000; // 3 second cycle for exercise movement
    const progress = (time % cycleTime) / cycleTime; // 0 to 1

    // Simulate exercise movement cycle
    const isDownPhase = progress < 0.5;
    const movementIntensity = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;

    const generateKeypoint = (
      baseX: number,
      baseY: number,
      movementX = 0,
      movementY = 0
    ): PoseKeypoint => ({
      x: baseX + movementX * movementIntensity + (Math.random() - 0.5) * 10,
      y: baseY + movementY * movementIntensity + (Math.random() - 0.5) * 10,
      confidence: 0.8 + Math.random() * 0.2,
    });

    // Simulate different poses based on exercise phase
    const armMovement = isDownPhase ? 40 : -20; // Arms move down/up
    const legMovement = isDownPhase ? 30 : -15; // Legs bend/extend
    const torsoMovement = isDownPhase ? 20 : -10; // Torso movement

    return {
      keypoints: {
        nose: generateKeypoint(160, 100, 0, torsoMovement * 0.3),
        leftShoulder: generateKeypoint(
          120,
          150,
          -armMovement * 0.5,
          torsoMovement
        ),
        rightShoulder: generateKeypoint(
          200,
          150,
          armMovement * 0.5,
          torsoMovement
        ),
        leftElbow: generateKeypoint(100, 200, -armMovement, armMovement * 0.8),
        rightElbow: generateKeypoint(220, 200, armMovement, armMovement * 0.8),
        leftWrist: generateKeypoint(80, 250, -armMovement * 1.2, armMovement),
        rightWrist: generateKeypoint(240, 250, armMovement * 1.2, armMovement),
        leftHip: generateKeypoint(130, 300, 0, legMovement * 0.3),
        rightHip: generateKeypoint(190, 300, 0, legMovement * 0.3),
        leftKnee: generateKeypoint(125, 400, -legMovement * 0.5, legMovement),
        rightKnee: generateKeypoint(195, 400, legMovement * 0.5, legMovement),
        leftAnkle: generateKeypoint(120, 500, 0, legMovement * 0.2),
        rightAnkle: generateKeypoint(200, 500, 0, legMovement * 0.2),
      },
      confidence: 0.85,
    };
  }

  // Process pose detection for specific exercise
  processExercise(
    exerciseType: ExerciseType,
    pose: PoseDetection
  ): ExerciseState {
    const state = this.exerciseStates.get(exerciseType);
    if (!state) {
      throw new Error(`Exercise ${exerciseType} not started`);
    }

    switch (exerciseType) {
      case "pushups":
        return this.processPushups(pose, state);
      case "squats":
        return this.processSquats(pose, state);
      case "situps":
        return this.processSitups(pose, state);
      case "planks":
        return this.processPlanks(pose, state);
      default:
        return state;
    }
  }

  private processPushups(
    pose: PoseDetection,
    state: ExerciseState
  ): ExerciseState {
    const {
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
    } = pose.keypoints;

    // Calculate arm angles (simplified)
    const leftArmAngle = this.calculateAngle(
      leftShoulder,
      leftElbow,
      leftWrist
    );
    const rightArmAngle = this.calculateAngle(
      rightShoulder,
      rightElbow,
      rightWrist
    );
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;

    // Determine phase based on arm angle
    const now = Date.now();
    const timeSinceLastChange = now - state.lastPhaseChange;

    // Prevent rapid phase changes (debounce) - reduced for more responsive detection
    if (timeSinceLastChange < 800) {
      return state;
    }

    let newPhase = state.currentPhase;
    let newRepCount = state.repCount;

    console.log(
      `Push-up detection - Arm angle: ${avgArmAngle.toFixed(
        1
      )}°, Current phase: ${state.currentPhase}`
    );

    // Push-up detection logic - more sensitive thresholds
    if (avgArmAngle < 120 && state.currentPhase !== "down") {
      // Arms bent - down position
      newPhase = "down";
      state.lastPhaseChange = now;
      console.log("Push-up: DOWN phase detected");
    } else if (avgArmAngle > 140 && state.currentPhase === "down") {
      // Arms extended - up position, count rep
      newPhase = "up";
      newRepCount += 1;
      state.lastPhaseChange = now;
      console.log(`🎉 Push-up rep counted! Total: ${newRepCount}`);
    }

    return {
      ...state,
      repCount: newRepCount,
      currentPhase: newPhase,
      isValid: pose.confidence > 0.7,
    };
  }

  private processSquats(
    pose: PoseDetection,
    state: ExerciseState
  ): ExerciseState {
    const { leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle } =
      pose.keypoints;

    // Calculate knee angles
    const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    const now = Date.now();
    const timeSinceLastChange = now - state.lastPhaseChange;

    if (timeSinceLastChange < 600) {
      return state;
    }

    let newPhase = state.currentPhase;
    let newRepCount = state.repCount;

    // Squat detection logic
    if (avgKneeAngle < 100 && state.currentPhase !== "down") {
      // Knees bent - down position
      newPhase = "down";
      state.lastPhaseChange = now;
    } else if (avgKneeAngle > 160 && state.currentPhase === "down") {
      // Knees extended - up position, count rep
      newPhase = "up";
      newRepCount += 1;
      state.lastPhaseChange = now;
      console.log(`Squat rep counted! Total: ${newRepCount}`);
    }

    return {
      ...state,
      repCount: newRepCount,
      currentPhase: newPhase,
      isValid: pose.confidence > 0.7,
    };
  }

  private processSitups(
    pose: PoseDetection,
    state: ExerciseState
  ): ExerciseState {
    const { nose, leftShoulder, rightShoulder, leftHip, rightHip } =
      pose.keypoints;

    // Calculate torso angle (simplified)
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };

    // Calculate angle between torso and vertical
    const torsoAngle = Math.abs(
      (Math.atan2(
        shoulderMidpoint.x - hipMidpoint.x,
        shoulderMidpoint.y - hipMidpoint.y
      ) *
        180) /
        Math.PI
    );

    const now = Date.now();
    const timeSinceLastChange = now - state.lastPhaseChange;

    if (timeSinceLastChange < 700) {
      return state;
    }

    let newPhase = state.currentPhase;
    let newRepCount = state.repCount;

    // Sit-up detection logic
    if (torsoAngle > 45 && state.currentPhase !== "up") {
      // Torso raised - up position
      newPhase = "up";
      state.lastPhaseChange = now;
    } else if (torsoAngle < 20 && state.currentPhase === "up") {
      // Torso lowered - down position, count rep
      newPhase = "down";
      newRepCount += 1;
      state.lastPhaseChange = now;
      console.log(`Sit-up rep counted! Total: ${newRepCount}`);
    }

    return {
      ...state,
      repCount: newRepCount,
      currentPhase: newPhase,
      isValid: pose.confidence > 0.7,
    };
  }

  private processPlanks(
    pose: PoseDetection,
    state: ExerciseState
  ): ExerciseState {
    const {
      leftShoulder,
      rightShoulder,
      leftHip,
      rightHip,
      leftAnkle,
      rightAnkle,
    } = pose.keypoints;

    // Check if body is in plank position (straight line)
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    const ankleY = (leftAnkle.y + rightAnkle.y) / 2;

    // Calculate body alignment
    const bodyAlignment = Math.abs(shoulderY - hipY) + Math.abs(hipY - ankleY);
    const isGoodForm = bodyAlignment < 50; // Threshold for good plank form

    return {
      ...state,
      isValid: isGoodForm && pose.confidence > 0.7,
    };
  }

  // Helper function to calculate angle between three points
  private calculateAngle(
    point1: PoseKeypoint,
    point2: PoseKeypoint,
    point3: PoseKeypoint
  ): number {
    const vector1 = { x: point1.x - point2.x, y: point1.y - point2.y };
    const vector2 = { x: point3.x - point2.x, y: point3.y - point2.y };

    const dot = vector1.x * vector2.x + vector1.y * vector2.y;
    const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

    const angle = (Math.acos(dot / (mag1 * mag2)) * 180) / Math.PI;
    return isNaN(angle) ? 0 : angle;
  }

  // Get current state for an exercise
  getExerciseState(exerciseType: ExerciseType): ExerciseState | null {
    return this.exerciseStates.get(exerciseType) || null;
  }
}

export default new PoseDetectionService();
