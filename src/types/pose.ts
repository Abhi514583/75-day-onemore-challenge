import { CalibrationData } from "../services/pose/PoseProcessor";

import { CalibrationData } from "../services/pose/PoseProcessor";

// Core pose detection types
export {
  LandmarkType,
  Pose,
  PoseLandmark,
} from "../services/pose/MLKitPoseService";
export {
  ProcessedPoseData,
  ValidationResult,
  CalibrationData,
  JointAngles,
  BodyAlignment,
  JointRanges,
} from "../services/pose/PoseProcessor";

// Exercise-specific types
export type ExerciseType =
  | "pushups"
  | "squats"
  | "planks"
  | "situps"
  | "burpees"
  | "lunges"
  | "mountain-climbers"
  | "jumping-jacks";

// Movement detection types
export interface MovementState {
  currentPhase: RepPhase;
  phaseStartTime: number;
  phaseDuration: number;
  transitionProgress: number; // 0-1
  isStable: boolean;
  confidence: number;
}

export interface MovementHistory {
  poses: import("../services/pose/MLKitPoseService").Pose[];
  movements: MovementState[];
  repCounts: RepData[];
  maxHistorySize: number;
}

// Rep detection and counting
export interface RepData {
  count: number;
  timestamp: number;
  formScore: number;
  duration: number;
  phase: RepPhase;
  exerciseType: ExerciseType;
  confidence: number;
}

export type RepPhase = "up" | "down" | "hold" | "transition";

export interface RepDetectionResult {
  repDetected: boolean;
  repData?: RepData;
  currentPhase: RepPhase;
  progress: number; // 0-1, how complete the current rep is
  reason?: string; // Why rep was/wasn't detected
}

// Form feedback and validation
export interface FormFeedback {
  type: FormFeedbackType;
  message: string;
  bodyParts: string[];
  severity: FormSeverity;
  suggestions: string[];
  priority: number; // 1-10, higher = more important
  timestamp: number;
  exerciseType: ExerciseType;
}

export type FormFeedbackType = "good" | "warning" | "error" | "encouragement";
export type FormSeverity = "low" | "medium" | "high" | "critical";

export interface FormValidationResult {
  isValidForm: boolean;
  formScore: number; // 0-100
  feedback: FormFeedback[];
  jointIssues: JointIssue[];
  alignmentIssues: AlignmentIssue[];
}

export interface JointIssue {
  joint: string;
  expectedRange: [number, number];
  actualAngle: number;
  severity: FormSeverity;
  suggestion: string;
}

export interface AlignmentIssue {
  type: "shoulder" | "hip" | "spine" | "knee";
  deviation: number;
  threshold: number;
  severity: FormSeverity;
  suggestion: string;
}

// Exercise rules and configuration
export interface ExerciseRules {
  exerciseType: ExerciseType;
  keyLandmarks: import("../services/pose/MLKitPoseService").LandmarkType[];
  movementPhases: MovementPhase[];
  formCriteria: FormCriteria[];
  repThresholds: RepThresholds;
  cameraPosition: CameraPosition;
  difficultyLevels: DifficultyLevel[];
}

export interface MovementPhase {
  name: RepPhase;
  description: string;
  keyAngles: KeyAngle[];
  duration?: [number, number]; // min, max duration in ms
  transitionTo?: RepPhase[];
}

export interface KeyAngle {
  joint: string;
  range: [number, number];
  tolerance: number;
  required: boolean;
}

export interface FormCriteria {
  name: string;
  description: string;
  validator: (
    pose: import("../services/pose/MLKitPoseService").Pose,
    calibration?: CalibrationData
  ) => boolean;
  severity: FormSeverity;
  feedback: string;
}

export interface RepThresholds {
  minAngleChange: number;
  minDuration: number; // milliseconds
  maxDuration: number; // milliseconds
  confidenceThreshold: number;
  formScoreThreshold: number;
}

export interface CameraPosition {
  angle: "front" | "side" | "diagonal-front" | "diagonal-side";
  height: "chest" | "waist" | "ground";
  distance: [number, number]; // min, max in feet
  description: string;
}

export interface DifficultyLevel {
  name: "beginner" | "intermediate" | "advanced";
  formStrictness: number; // 0-1
  angleTolerances: { [joint: string]: number };
  feedbackFrequency: "high" | "medium" | "low";
}

// Exercise-specific rule interfaces
export interface PushUpRules extends ExerciseRules {
  elbowAngleRange: [number, number];
  bodyAlignmentTolerance: number;
  minimumDepth: number;
  plankPositionRequired: boolean;
}

export interface SquatRules extends ExerciseRules {
  hipAngleRange: [number, number];
  kneeAngleRange: [number, number];
  minimumDepth: number;
  kneeAlignment: boolean;
  backStraight: boolean;
}

export interface PlankRules extends ExerciseRules {
  bodyLineDeviation: number;
  hipAlignment: number;
  shoulderAlignment: number;
  holdDuration: number;
  elbowPosition: "ground" | "extended";
}

export interface SitUpRules extends ExerciseRules {
  torsoAngleRange: [number, number];
  kneePosition: "bent" | "straight";
  handPosition: "chest" | "head" | "extended";
  fullRangeRequired: boolean;
}

export interface BurpeeRules extends ExerciseRules {
  phases: ("squat-down" | "plank" | "push-up" | "squat-up" | "jump")[];
  phaseTransitions: { [key: string]: number }; // max time between phases
  jumpHeight: number;
  pushUpRequired: boolean;
}

// Pose detection settings and preferences
export interface PoseDetectionSettings {
  enabled: boolean;
  exerciseType: ExerciseType;
  difficultyLevel: "beginner" | "intermediate" | "advanced";

  // Visual settings
  showSkeleton: boolean;
  skeletonOpacity: number;
  renderMode: "full" | "minimal" | "markers-only";
  feedbackStyle: "visual" | "audio" | "haptic" | "all";

  // Detection settings
  confidenceThreshold: number;
  formStrictness: number; // 0-1
  feedbackFrequency: "high" | "medium" | "low";

  // Calibration settings
  autoCalibrate: boolean;
  persistCalibration: boolean;
  recalibrateOnLightingChange: boolean;

  // Performance settings
  targetFrameRate: number;
  enablePerformanceMode: boolean;
  reducedQualityThreshold: number; // fps threshold to reduce quality
}

// Camera and performance types
export interface CameraState {
  isActive: boolean;
  hasPermission: boolean;
  isInitialized: boolean;
  currentFrameRate: number;
  error?: CameraError;
}

export interface CameraError {
  type: "permission" | "unavailable" | "initialization" | "processing";
  message: string;
  recoverable: boolean;
  suggestions: string[];
}

export interface PerformanceMetrics {
  frameRate: number;
  processingTime: number; // ms per frame
  memoryUsage: number; // MB
  batteryImpact: "low" | "medium" | "high";
  deviceCapability: "high" | "medium" | "low";
}

// Workout integration types
export interface PoseWorkoutSession {
  sessionId: string;
  exerciseType: ExerciseType;
  startTime: number;
  endTime?: number;

  // Rep data
  totalReps: number;
  validReps: number;
  invalidReps: number;
  repHistory: RepData[];

  // Form data
  averageFormScore: number;
  formFeedbackHistory: FormFeedback[];
  improvementAreas: string[];

  // Performance data
  sessionDuration: number;
  averageRepDuration: number;
  consistencyScore: number; // How consistent form was throughout

  // Technical data
  calibrationData?: CalibrationData;
  performanceMetrics: PerformanceMetrics;
  errorCount: number;
  fallbackModeUsed: boolean;
}

export interface PoseWorkoutStats {
  totalSessions: number;
  totalReps: number;
  averageFormScore: number;
  improvementTrend: number; // -1 to 1, negative = declining, positive = improving
  exerciseBreakdown: { [exercise: string]: PoseWorkoutSession[] };
  weeklyProgress: { week: string; averageScore: number; totalReps: number }[];
  achievements: PoseAchievement[];
}

export interface PoseAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
  exerciseType?: ExerciseType;
  criteria: {
    type: "form_score" | "consistency" | "reps" | "streak";
    threshold: number;
    duration?: number; // for streak-based achievements
  };
}

// Duel integration types
export interface DuelPoseData {
  participantId: string;
  currentReps: number;
  formScore: number;
  isValidForm: boolean;
  lastRepTimestamp: number;
  calibrationComplete: boolean;
}

export interface DuelPoseState {
  participants: DuelPoseData[];
  syncedCalibration: boolean;
  formValidationEnabled: boolean;
  realTimeSync: boolean;
  fairnessMode: boolean; // Ensures identical validation standards
}

// Error handling and recovery types
export interface PoseDetectionError {
  type: "ml_kit" | "camera" | "processing" | "calibration" | "validation";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: number;
  context: {
    exerciseType?: ExerciseType;
    frameRate?: number;
    memoryUsage?: number;
    lastValidPose?: number; // timestamp
  };
  recoveryActions: RecoveryAction[];
}

export interface RecoveryAction {
  type:
    | "retry"
    | "recalibrate"
    | "reduce_quality"
    | "fallback_manual"
    | "restart_camera";
  description: string;
  automatic: boolean;
  priority: number;
}

// Accessibility and customization types
export interface AccessibilitySettings {
  colorBlindFriendly: boolean;
  highContrast: boolean;
  largeText: boolean;
  hapticFeedback: boolean;
  audioFeedback: boolean;
  voicePrompts: boolean;
  reducedMotion: boolean;
  screenReaderSupport: boolean;
}

export interface FeedbackCustomization {
  visualFeedback: {
    colors: { good: string; warning: string; error: string };
    animations: boolean;
    intensity: "subtle" | "normal" | "prominent";
  };
  audioFeedback: {
    enabled: boolean;
    volume: number;
    voiceGender: "male" | "female" | "neutral";
    language: string;
  };
  hapticFeedback: {
    enabled: boolean;
    intensity: "light" | "medium" | "heavy";
    patterns: { [key: string]: number[] };
  };
}

// Export utility type for exercise rule mapping
export type ExerciseRuleMap = {
  pushups: PushUpRules;
  squats: SquatRules;
  planks: PlankRules;
  situps: SitUpRules;
  burpees: BurpeeRules;
  lunges: ExerciseRules;
  "mountain-climbers": ExerciseRules;
  "jumping-jacks": ExerciseRules;
};

// Constants for pose detection
export const POSE_DETECTION_CONSTANTS = {
  MIN_CONFIDENCE: 0.6,
  MIN_LANDMARK_VISIBILITY: 0.5,
  DEFAULT_FRAME_RATE: 24,
  CALIBRATION_EXPIRY_DAYS: 7,
  MAX_POSE_HISTORY: 30, // frames to keep in memory
  PERFORMANCE_CHECK_INTERVAL: 5000, // ms

  // Form validation thresholds
  FORM_SCORE_THRESHOLDS: {
    EXCELLENT: 90,
    GOOD: 75,
    FAIR: 60,
    POOR: 40,
  },

  // Feedback priorities
  FEEDBACK_PRIORITIES: {
    SAFETY: 10,
    FORM_CRITICAL: 8,
    FORM_MINOR: 6,
    REP_VALIDATION: 5,
    ENCOURAGEMENT: 3,
    INFO: 1,
  },

  // Camera positioning standards
  CAMERA_POSITIONS: {
    PUSHUPS: { angle: "side", height: "chest", distance: [6, 8] },
    SQUATS: { angle: "diagonal-front", height: "chest", distance: [6, 8] },
    PLANKS: { angle: "side", height: "chest", distance: [6, 8] },
    SITUPS: { angle: "side", height: "chest", distance: [6, 8] },
    BURPEES: { angle: "diagonal-side", height: "chest", distance: [8, 10] },
  },

  // Joint angle ranges for exercises
  JOINT_RANGES: {
    ELBOW: { MIN: 0, MAX: 180, PUSHUP_DOWN: 90, PUSHUP_UP: 160 },
    KNEE: { MIN: 0, MAX: 180, SQUAT_DOWN: 90, SQUAT_UP: 160 },
    HIP: { MIN: 0, MAX: 180, SQUAT_DOWN: 90, SQUAT_UP: 160 },
    TORSO: { MIN: 0, MAX: 90, SITUP_DOWN: 0, SITUP_UP: 45 },
  },
} as const;

// Type guards for runtime type checking
export const isValidExerciseType = (type: string): type is ExerciseType => {
  return [
    "pushups",
    "squats",
    "planks",
    "situps",
    "burpees",
    "lunges",
    "mountain-climbers",
    "jumping-jacks",
  ].includes(type);
};

export const isValidRepPhase = (phase: string): phase is RepPhase => {
  return ["up", "down", "hold", "transition"].includes(phase);
};

export const isValidFormFeedbackType = (
  type: string
): type is FormFeedbackType => {
  return ["good", "warning", "error", "encouragement"].includes(type);
};
