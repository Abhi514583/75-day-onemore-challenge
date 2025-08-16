import {
  ExerciseType,
  FormFeedback,
  POSE_DETECTION_CONSTANTS,
} from "../../types/pose";

export interface FormIssueTemplate {
  message: string;
  bodyParts: string[];
  suggestions: string[];
  severity: "critical" | "high" | "medium" | "low";
}

export class FormFeedbackMessages {
  // Push-up specific feedback messages
  static readonly PUSHUP_MESSAGES = {
    ELBOW_TOO_WIDE: {
      message: "Elbows too wide",
      bodyParts: ["arms", "elbows"],
      suggestions: [
        "Keep elbows closer to your body",
        "Aim for 45° angle from torso",
        "Think about squeezing your armpits",
      ],
      severity: "medium" as const,
    },
    GOING_TOO_LOW: {
      message: "Don't go too low",
      bodyParts: ["arms", "chest"],
      suggestions: [
        "Stop when elbows reach 90°",
        "Control your descent",
        "Focus on quality over depth",
      ],
      severity: "high" as const,
    },
    INCOMPLETE_RANGE: {
      message: "Complete the full range",
      bodyParts: ["arms"],
      suggestions: [
        "Push all the way up",
        "Fully extend your arms",
        "Don't stop halfway",
      ],
      severity: "medium" as const,
    },
    BODY_SAG: {
      message: "Keep body straight",
      bodyParts: ["core", "hips"],
      suggestions: [
        "Engage your core",
        "Don't let hips sag",
        "Maintain plank position",
      ],
      severity: "high" as const,
    },
    PIKE_UP: {
      message: "Don't pike up",
      bodyParts: ["hips", "core"],
      suggestions: [
        "Lower your hips",
        "Keep body in straight line",
        "Engage your core",
      ],
      severity: "medium" as const,
    },
    HEAD_POSITION: {
      message: "Keep head neutral",
      bodyParts: ["neck", "head"],
      suggestions: [
        "Look down at the floor",
        "Don't crane your neck up",
        "Maintain neutral spine",
      ],
      severity: "low" as const,
    },
  };

  // Squat specific feedback messages
  static readonly SQUAT_MESSAGES = {
    KNEE_CAVE: {
      message: "Knees caving inward",
      bodyParts: ["knees"],
      suggestions: [
        "Push knees out over toes",
        "Engage your glutes",
        "Think about spreading the floor",
      ],
      severity: "critical" as const,
    },
    KNEE_FORWARD: {
      message: "Knees too far forward",
      bodyParts: ["knees"],
      suggestions: [
        "Sit back more",
        "Keep knees behind toes",
        "Push hips back first",
      ],
      severity: "high" as const,
    },
    NOT_DEEP_ENOUGH: {
      message: "Go deeper",
      bodyParts: ["hips", "knees"],
      suggestions: [
        "Squat until thighs are parallel",
        "Sit back into the squat",
        "Increase your mobility",
      ],
      severity: "medium" as const,
    },
    FORWARD_LEAN: {
      message: "Keep chest up",
      bodyParts: ["chest", "back"],
      suggestions: [
        "Keep your chest proud",
        "Don't lean forward",
        "Maintain upright torso",
      ],
      severity: "medium" as const,
    },
    HEEL_LIFT: {
      message: "Keep heels down",
      bodyParts: ["feet", "ankles"],
      suggestions: [
        "Keep full foot on ground",
        "Work on ankle mobility",
        "Don't rise onto toes",
      ],
      severity: "high" as const,
    },
    UNEVEN_DEPTH: {
      message: "Keep hips level",
      bodyParts: ["hips"],
      suggestions: [
        "Squat evenly on both sides",
        "Check for imbalances",
        "Focus on symmetry",
      ],
      severity: "medium" as const,
    },
  };

  // Plank specific feedback messages
  static readonly PLANK_MESSAGES = {
    HIP_SAG: {
      message: "Hips are sagging",
      bodyParts: ["hips", "core"],
      suggestions: [
        "Lift your hips up",
        "Engage your core",
        "Create straight line from head to heels",
      ],
      severity: "high" as const,
    },
    HIP_TOO_HIGH: {
      message: "Hips too high",
      bodyParts: ["hips", "core"],
      suggestions: ["Lower your hips", "Don't pike up", "Keep body straight"],
      severity: "medium" as const,
    },
    SHOULDER_POSITION: {
      message: "Shoulders over wrists",
      bodyParts: ["shoulders", "arms"],
      suggestions: [
        "Move shoulders directly over wrists",
        "Don't lean forward or back",
        "Maintain proper alignment",
      ],
      severity: "medium" as const,
    },
    HEAD_DROP: {
      message: "Keep head neutral",
      bodyParts: ["neck", "head"],
      suggestions: [
        "Look down at the floor",
        "Don't let head drop",
        "Maintain neutral neck",
      ],
      severity: "low" as const,
    },
    ELBOW_FLARE: {
      message: "Keep elbows close",
      bodyParts: ["elbows", "arms"],
      suggestions: [
        "Don't let elbows flare out",
        "Keep arms close to body",
        "Engage your lats",
      ],
      severity: "low" as const,
    },
  };

  // General form messages that apply to multiple exercises
  static readonly GENERAL_MESSAGES = {
    BREATHING: {
      message: "Remember to breathe",
      bodyParts: [],
      suggestions: [
        "Don't hold your breath",
        "Breathe steadily throughout",
        "Exhale on exertion",
      ],
      severity: "low" as const,
    },
    TEMPO_TOO_FAST: {
      message: "Slow down",
      bodyParts: [],
      suggestions: [
        "Control the movement",
        "Focus on quality over speed",
        "Take your time",
      ],
      severity: "medium" as const,
    },
    INCONSISTENT_FORM: {
      message: "Keep form consistent",
      bodyParts: [],
      suggestions: [
        "Maintain same technique each rep",
        "Don't get sloppy as you fatigue",
        "Quality over quantity",
      ],
      severity: "medium" as const,
    },
    GOOD_FORM: {
      message: "Excellent form!",
      bodyParts: [],
      suggestions: ["Keep it up!", "You're doing great!"],
      severity: "low" as const,
    },
  };

  /**
   * Get specific feedback message for an exercise and issue type
   */
  static getFeedbackMessage(
    exerciseType: ExerciseType,
    issueType: string
  ): FormIssueTemplate | null {
    switch (exerciseType) {
      case "pushups":
        return (
          this.PUSHUP_MESSAGES[
            issueType as keyof typeof this.PUSHUP_MESSAGES
          ] || null
        );
      case "squats":
        return (
          this.SQUAT_MESSAGES[issueType as keyof typeof this.SQUAT_MESSAGES] ||
          null
        );
      case "planks":
        return (
          this.PLANK_MESSAGES[issueType as keyof typeof this.PLANK_MESSAGES] ||
          null
        );
      default:
        return (
          this.GENERAL_MESSAGES[
            issueType as keyof typeof this.GENERAL_MESSAGES
          ] || null
        );
    }
  }

  /**
   * Create FormFeedback from template
   */
  static createFeedbackFromTemplate(
    exerciseType: ExerciseType,
    template: FormIssueTemplate
  ): FormFeedback {
    const priority = this.getSeverityPriority(template.severity);
    const type = this.getSeverityType(template.severity);

    return {
      type,
      message: template.message,
      bodyParts: template.bodyParts,
      severity: template.severity,
      suggestions: template.suggestions,
      priority,
      timestamp: Date.now(),
      exerciseType,
    };
  }

  /**
   * Get priority value based on severity
   */
  private static getSeverityPriority(
    severity: "critical" | "high" | "medium" | "low"
  ): number {
    switch (severity) {
      case "critical":
        return POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.SAFETY;
      case "high":
        return POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.FORM_CRITICAL;
      case "medium":
        return POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.FORM_MINOR;
      case "low":
        return POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.ENCOURAGEMENT;
      default:
        return POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.FORM_MINOR;
    }
  }

  /**
   * Get feedback type based on severity
   */
  private static getSeverityType(
    severity: "critical" | "high" | "medium" | "low"
  ): "error" | "warning" | "success" | "encouragement" {
    switch (severity) {
      case "critical":
        return "error";
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "encouragement";
      default:
        return "warning";
    }
  }

  /**
   * Get all available message types for an exercise
   */
  static getAvailableMessageTypes(exerciseType: ExerciseType): string[] {
    switch (exerciseType) {
      case "pushups":
        return Object.keys(this.PUSHUP_MESSAGES);
      case "squats":
        return Object.keys(this.SQUAT_MESSAGES);
      case "planks":
        return Object.keys(this.PLANK_MESSAGES);
      default:
        return Object.keys(this.GENERAL_MESSAGES);
    }
  }

  /**
   * Get random encouragement message
   */
  static getRandomEncouragement(exerciseType: ExerciseType): FormFeedback {
    const encouragements = [
      "You're doing great!",
      "Keep it up!",
      "Strong work!",
      "Perfect form!",
      "Looking good!",
      "Nice technique!",
      "Keep pushing!",
      "Excellent control!",
    ];

    const randomMessage =
      encouragements[Math.floor(Math.random() * encouragements.length)];

    return {
      type: "encouragement",
      message: randomMessage,
      bodyParts: [],
      severity: "low",
      suggestions: [],
      priority: POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.ENCOURAGEMENT,
      timestamp: Date.now(),
      exerciseType,
    };
  }

  /**
   * Get contextual feedback based on rep count and form score
   */
  static getContextualFeedback(
    exerciseType: ExerciseType,
    repCount: number,
    formScore: number,
    isStruggling: boolean = false
  ): FormFeedback {
    // Milestone celebrations
    if (repCount > 0 && repCount % 10 === 0) {
      return {
        type: "success",
        message: `🎉 ${repCount} reps! Amazing!`,
        bodyParts: [],
        severity: "low",
        suggestions: ["You're crushing it!", "Keep the momentum going!"],
        priority: POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.REP_COUNT,
        timestamp: Date.now(),
        exerciseType,
      };
    }

    // Struggling encouragement
    if (isStruggling) {
      return {
        type: "encouragement",
        message: "Focus on form over speed",
        bodyParts: [],
        severity: "low",
        suggestions: [
          "Quality over quantity",
          "Take your time",
          "You've got this!",
        ],
        priority: POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.ENCOURAGEMENT,
        timestamp: Date.now(),
        exerciseType,
      };
    }

    // Form-based encouragement
    if (formScore >= POSE_DETECTION_CONSTANTS.FORM_SCORE_THRESHOLDS.EXCELLENT) {
      return this.getRandomEncouragement(exerciseType);
    }

    // Default motivational message
    return {
      type: "encouragement",
      message: "Keep going!",
      bodyParts: [],
      severity: "low",
      suggestions: ["You're doing well!", "Stay focused!"],
      priority: POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.ENCOURAGEMENT,
      timestamp: Date.now(),
      exerciseType,
    };
  }
}
