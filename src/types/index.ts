// Main pose detection types export
export * from "./pose";

// Re-export commonly used types for convenience
export type {
  Pose,
  PoseLandmark,
  LandmarkType,
  ProcessedPoseData,
  CalibrationData,
  ExerciseType,
  RepData,
  FormFeedback,
  PoseDetectionSettings,
  ExerciseRules,
} from "./pose";

// Export constants
export { POSE_DETECTION_CONSTANTS } from "./pose";

// Export type guards
export {
  isValidExerciseType,
  isValidRepPhase,
  isValidFormFeedbackType,
} from "./pose";
