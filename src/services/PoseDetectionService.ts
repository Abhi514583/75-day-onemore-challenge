import * as tf from "@tensorflow/tfjs";

export type ExerciseType = "pushups" | "squats" | "situps" | "planks";

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

export interface ExerciseState {
  repCount: number;
  currentPhase: "up" | "down" | "neutral";
  lastPhaseChange: number;
  isValid: boolean;
  formFeedback: string;
}

class PoseDetectionService {
  private exerciseStates: Map<ExerciseType, ExerciseState> = new Map();
  private isInitialized = false;
  private detectionInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await tf.ready();
    console.log("🤖 AI Pose Detection initialized");
    this.isInitialized = true;
  }

  startExercise(
    exerciseType: ExerciseType,
    onRepDetected: (count: number, feedback: string) => void
  ): void {
    console.log(`🏋️ Starting ${exerciseType} detection`);

    this.exerciseStates.set(exerciseType, {
      repCount: 0,
      currentPhase: "neutral",
      lastPhaseChange: Date.now(),
      isValid: false,
      formFeedback: "Position yourself and start exercising!",
    });

    // Start real-time pose detection
    this.detectionInterval = setInterval(() => {
      this.detectExercise(exerciseType, onRepDetected);
    }, 200); // Check every 200ms for responsive detection
  }

  stopExercise(exerciseType: ExerciseType): void {
    console.log(`🛑 Stopping ${exerciseType} detection`);
    this.exerciseStates.delete(exerciseType);
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }

  private detectExercise(
    exerciseType: ExerciseType,
    onRepDetected: (count: number, feedback: string) => void
  ): void {
    // Simulate getting pose data from camera
    const pose = this.simulateRealisticPose(exerciseType);
    const state = this.exerciseStates.get(exerciseType);

    if (!state) return;

    // Process the pose based on exercise type
    const updatedState = this.processExercisePose(exerciseType, pose, state);

    // Update state
    this.exerciseStates.set(exerciseType, updatedState);

    // Trigger callback if new rep detected
    if (updatedState.repCount > state.repCount) {
      console.log(`🎉 ${exerciseType} rep #${updatedState.repCount} detected!`);
      onRepDetected(updatedState.repCount, updatedState.formFeedback);
    }
  }

  private simulateRealisticPose(exerciseType: ExerciseType): PoseDetection {
    const time = Date.now();
    const state = this.exerciseStates.get(exerciseType);

    // Create realistic movement patterns based on exercise type
    let movementCycle = 0;
    let isDownPhase = false;

    switch (exerciseType) {
      case "pushups":
        // Push-up cycle: 3 seconds (1.5s down, 1.5s up)
        movementCycle = (time % 3000) / 3000;
        isDownPhase = movementCycle < 0.5;
        break;
      case "squats":
        // Squat cycle: 4 seconds (2s down, 2s up)
        movementCycle = (time % 4000) / 4000;
        isDownPhase = movementCycle < 0.5;
        break;
      case "situps":
        // Sit-up cycle: 3.5 seconds
        movementCycle = (time % 3500) / 3500;
        isDownPhase = movementCycle < 0.4;
        break;
      default:
        movementCycle = (time % 3000) / 3000;
        isDownPhase = movementCycle < 0.5;
    }

    // Generate pose keypoints based on exercise and phase
    return this.generateExercisePose(exerciseType, isDownPhase, movementCycle);
  }

  private generateExercisePose(
    exerciseType: ExerciseType,
    isDownPhase: boolean,
    cycle: number
  ): PoseDetection {
    const baseKeypoints = {
      nose: { x: 160, y: 100, confidence: 0.9 },
      leftShoulder: { x: 120, y: 150, confidence: 0.9 },
      rightShoulder: { x: 200, y: 150, confidence: 0.9 },
      leftElbow: { x: 100, y: 200, confidence: 0.9 },
      rightElbow: { x: 220, y: 200, confidence: 0.9 },
      leftWrist: { x: 80, y: 250, confidence: 0.9 },
      rightWrist: { x: 240, y: 250, confidence: 0.9 },
      leftHip: { x: 130, y: 300, confidence: 0.9 },
      rightHip: { x: 190, y: 300, confidence: 0.9 },
      leftKnee: { x: 125, y: 400, confidence: 0.9 },
      rightKnee: { x: 195, y: 400, confidence: 0.9 },
      leftAnkle: { x: 120, y: 500, confidence: 0.9 },
      rightAnkle: { x: 200, y: 500, confidence: 0.9 },
    };

    // Modify keypoints based on exercise type and phase
    switch (exerciseType) {
      case "pushups":
        if (isDownPhase) {
          // Arms bent, body lower
          baseKeypoints.leftElbow.y += 30;
          baseKeypoints.rightElbow.y += 30;
          baseKeypoints.leftWrist.y += 20;
          baseKeypoints.rightWrist.y += 20;
          baseKeypoints.nose.y += 15;
        }
        break;

      case "squats":
        if (isDownPhase) {
          // Knees bent, hips lower
          baseKeypoints.leftKnee.y -= 40;
          baseKeypoints.rightKnee.y -= 40;
          baseKeypoints.leftHip.y += 30;
          baseKeypoints.rightHip.y += 30;
          baseKeypoints.nose.y += 25;
        }
        break;

      case "situps":
        if (isDownPhase) {
          // Torso up
          baseKeypoints.nose.y -= 30;
          baseKeypoints.leftShoulder.y -= 25;
          baseKeypoints.rightShoulder.y -= 25;
        }
        break;
    }

    // Add some realistic noise
    Object.values(baseKeypoints).forEach((point) => {
      point.x += (Math.random() - 0.5) * 10;
      point.y += (Math.random() - 0.5) * 10;
      point.confidence += (Math.random() - 0.5) * 0.1;
    });

    return {
      keypoints: baseKeypoints,
      confidence: 0.85 + (Math.random() - 0.5) * 0.1,
    };
  }

  private processExercisePose(
    exerciseType: ExerciseType,
    pose: PoseDetection,
    state: ExerciseState
  ): ExerciseState {
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

    // Calculate arm angles
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

    const now = Date.now();
    const timeSinceLastChange = now - state.lastPhaseChange;

    // Prevent rapid phase changes (debounce)
    if (timeSinceLastChange < 800) {
      return state;
    }

    let newPhase = state.currentPhase;
    let newRepCount = state.repCount;
    let feedback = state.formFeedback;

    console.log(
      `💪 Push-up: Arm angle ${avgArmAngle.toFixed(1)}°, Phase: ${
        state.currentPhase
      }`
    );

    // Push-up detection logic
    if (avgArmAngle < 110 && state.currentPhase !== "down") {
      // Arms bent - down position
      newPhase = "down";
      state.lastPhaseChange = now;
      feedback = "Good! Now push up! 💪";
      console.log("📉 Push-up DOWN phase detected");
    } else if (avgArmAngle > 150 && state.currentPhase === "down") {
      // Arms extended - up position, count rep
      newPhase = "up";
      newRepCount += 1;
      state.lastPhaseChange = now;
      feedback = `Perfect push-up #${newRepCount}! 🔥`;
      console.log(`🎉 Push-up rep #${newRepCount} counted!`);
    }

    // Form validation
    const isValidForm =
      pose.confidence > 0.7 && avgArmAngle > 60 && avgArmAngle < 180;

    return {
      ...state,
      repCount: newRepCount,
      currentPhase: newPhase,
      isValid: isValidForm,
      formFeedback: feedback,
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

    if (timeSinceLastChange < 1000) {
      return state;
    }

    let newPhase = state.currentPhase;
    let newRepCount = state.repCount;
    let feedback = state.formFeedback;

    console.log(
      `🦵 Squat: Knee angle ${avgKneeAngle.toFixed(1)}°, Phase: ${
        state.currentPhase
      }`
    );

    // Squat detection logic
    if (avgKneeAngle < 120 && state.currentPhase !== "down") {
      // Knees bent - down position
      newPhase = "down";
      state.lastPhaseChange = now;
      feedback = "Great squat! Now stand up! 🦵";
      console.log("📉 Squat DOWN phase detected");
    } else if (avgKneeAngle > 160 && state.currentPhase === "down") {
      // Knees extended - up position, count rep
      newPhase = "up";
      newRepCount += 1;
      state.lastPhaseChange = now;
      feedback = `Excellent squat #${newRepCount}! 🚀`;
      console.log(`🎉 Squat rep #${newRepCount} counted!`);
    }

    const isValidForm =
      pose.confidence > 0.7 && avgKneeAngle > 80 && avgKneeAngle < 180;

    return {
      ...state,
      repCount: newRepCount,
      currentPhase: newPhase,
      isValid: isValidForm,
      formFeedback: feedback,
    };
  }

  private processSitups(
    pose: PoseDetection,
    state: ExerciseState
  ): ExerciseState {
    const { nose, leftShoulder, rightShoulder, leftHip, rightHip } =
      pose.keypoints;

    // Calculate torso angle
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };

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

    if (timeSinceLastChange < 900) {
      return state;
    }

    let newPhase = state.currentPhase;
    let newRepCount = state.repCount;
    let feedback = state.formFeedback;

    console.log(
      `🏋️ Sit-up: Torso angle ${torsoAngle.toFixed(1)}°, Phase: ${
        state.currentPhase
      }`
    );

    // Sit-up detection logic
    if (torsoAngle > 35 && state.currentPhase !== "up") {
      // Torso raised - up position
      newPhase = "up";
      state.lastPhaseChange = now;
      feedback = "Perfect! Now lower down slowly! 🏋️";
      console.log("📈 Sit-up UP phase detected");
    } else if (torsoAngle < 15 && state.currentPhase === "up") {
      // Torso lowered - down position, count rep
      newPhase = "down";
      newRepCount += 1;
      state.lastPhaseChange = now;
      feedback = `Amazing sit-up #${newRepCount}! ✨`;
      console.log(`🎉 Sit-up rep #${newRepCount} counted!`);
    }

    const isValidForm =
      pose.confidence > 0.7 && torsoAngle >= 0 && torsoAngle <= 90;

    return {
      ...state,
      repCount: newRepCount,
      currentPhase: newPhase,
      isValid: isValidForm,
      formFeedback: feedback,
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

    // Check body alignment for plank
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    const ankleY = (leftAnkle.y + rightAnkle.y) / 2;

    const bodyAlignment = Math.abs(shoulderY - hipY) + Math.abs(hipY - ankleY);
    const isGoodForm = bodyAlignment < 40;

    let feedback = isGoodForm
      ? "Perfect plank form! Hold it! 🔥"
      : "Keep your body straight!";

    return {
      ...state,
      isValid: isGoodForm && pose.confidence > 0.7,
      formFeedback: feedback,
    };
  }

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

  getExerciseState(exerciseType: ExerciseType): ExerciseState | null {
    return this.exerciseStates.get(exerciseType) || null;
  }
}

export default new PoseDetectionService();
