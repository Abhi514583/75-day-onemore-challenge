import {
  FormFeedback,
  ExerciseType,
  FormSeverity,
  POSE_DETECTION_CONSTANTS,
} from "../../types/pose";

export interface FeedbackQueue {
  safety: FormFeedback[];
  formCritical: FormFeedback[];
  formMinor: FormFeedback[];
  repCount: FormFeedback[];
  encouragement: FormFeedback[];
}

export interface FeedbackDisplayState {
  currentFeedback: FormFeedback[];
  queuedFeedback: FormFeedback[];
  lastDisplayTime: number;
  suppressUntil: number;
}

export class FeedbackManager {
  private feedbackQueue: FeedbackQueue;
  private displayState: FeedbackDisplayState;
  private readonly maxDisplayItems = 3;
  private readonly minDisplayDuration = 2000; // 2 seconds
  private readonly suppressDuration = 1000; // 1 second between similar feedback

  constructor() {
    this.feedbackQueue = {
      safety: [],
      formCritical: [],
      formMinor: [],
      repCount: [],
      encouragement: [],
    };

    this.displayState = {
      currentFeedback: [],
      queuedFeedback: [],
      lastDisplayTime: 0,
      suppressUntil: 0,
    };
  }

  /**
   * Add feedback to the appropriate priority queue
   */
  addFeedback(feedback: FormFeedback): void {
    // Check if we should suppress similar feedback
    if (this.shouldSuppressFeedback(feedback)) {
      return;
    }

    // Add to appropriate queue based on priority
    const queueType = this.getQueueType(feedback.priority);
    this.feedbackQueue[queueType].push(feedback);

    // Clean old feedback from queues
    this.cleanOldFeedback();

    // Update display
    this.updateDisplay();
  }

  /**
   * Add multiple feedback items at once
   */
  addMultipleFeedback(feedbackList: FormFeedback[]): void {
    feedbackList.forEach((feedback) => this.addFeedback(feedback));
  }

  /**
   * Get current feedback to display
   */
  getCurrentFeedback(): FormFeedback[] {
    return this.displayState.currentFeedback;
  }

  /**
   * Clear all feedback
   */
  clearAllFeedback(): void {
    this.feedbackQueue = {
      safety: [],
      formCritical: [],
      formMinor: [],
      repCount: [],
      encouragement: [],
    };

    this.displayState.currentFeedback = [];
    this.displayState.queuedFeedback = [];
  }

  /**
   * Clear feedback for specific exercise type
   */
  clearExerciseFeedback(exerciseType: ExerciseType): void {
    Object.keys(this.feedbackQueue).forEach((key) => {
      const queueKey = key as keyof FeedbackQueue;
      this.feedbackQueue[queueKey] = this.feedbackQueue[queueKey].filter(
        (feedback) => feedback.exerciseType !== exerciseType
      );
    });

    this.displayState.currentFeedback =
      this.displayState.currentFeedback.filter(
        (feedback) => feedback.exerciseType !== exerciseType
      );

    this.updateDisplay();
  }

  /**
   * Update display based on priority system
   */
  private updateDisplay(): void {
    const now = Date.now();

    // Don't update if we're in suppression period
    if (now < this.displayState.suppressUntil) {
      return;
    }

    // Get prioritized feedback
    const prioritizedFeedback = this.getPrioritizedFeedback();

    // Update current display
    this.displayState.currentFeedback = prioritizedFeedback.slice(
      0,
      this.maxDisplayItems
    );
    this.displayState.queuedFeedback = prioritizedFeedback.slice(
      this.maxDisplayItems
    );
    this.displayState.lastDisplayTime = now;
  }

  /**
   * Get feedback in priority order
   */
  private getPrioritizedFeedback(): FormFeedback[] {
    const allFeedback: FormFeedback[] = [];

    // Add in priority order: Safety > Form Critical > Form Minor > Rep Count > Encouragement
    allFeedback.push(...this.feedbackQueue.safety);
    allFeedback.push(...this.feedbackQueue.formCritical);
    allFeedback.push(...this.feedbackQueue.formMinor);
    allFeedback.push(...this.feedbackQueue.repCount);
    allFeedback.push(...this.feedbackQueue.encouragement);

    // Sort by priority within each category, then by timestamp (newest first)
    return allFeedback.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return b.timestamp - a.timestamp; // Newer first
    });
  }

  /**
   * Determine which queue to use based on priority
   */
  private getQueueType(priority: number): keyof FeedbackQueue {
    if (priority >= POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.SAFETY) {
      return "safety";
    } else if (
      priority >= POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.FORM_CRITICAL
    ) {
      return "formCritical";
    } else if (
      priority >= POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.FORM_MINOR
    ) {
      return "formMinor";
    } else if (
      priority >= POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.REP_COUNT
    ) {
      return "repCount";
    } else {
      return "encouragement";
    }
  }

  /**
   * Check if similar feedback should be suppressed
   */
  private shouldSuppressFeedback(newFeedback: FormFeedback): boolean {
    const now = Date.now();

    // Check all current feedback for similar messages
    const allCurrentFeedback = [
      ...this.displayState.currentFeedback,
      ...this.displayState.queuedFeedback,
    ];

    return allCurrentFeedback.some((existing) => {
      // Same message type and body parts
      const sameType = existing.type === newFeedback.type;
      const sameBodyParts = this.arraysEqual(
        existing.bodyParts,
        newFeedback.bodyParts
      );
      const recentlyShown = now - existing.timestamp < this.suppressDuration;

      return sameType && sameBodyParts && recentlyShown;
    });
  }

  /**
   * Clean old feedback from all queues
   */
  private cleanOldFeedback(): void {
    const now = Date.now();
    const maxAge = 10000; // 10 seconds

    Object.keys(this.feedbackQueue).forEach((key) => {
      const queueKey = key as keyof FeedbackQueue;
      this.feedbackQueue[queueKey] = this.feedbackQueue[queueKey].filter(
        (feedback) => now - feedback.timestamp < maxAge
      );
    });
  }

  /**
   * Helper to compare arrays
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  /**
   * Create safety feedback with highest priority
   */
  static createSafetyFeedback(
    exerciseType: ExerciseType,
    message: string,
    bodyParts: string[],
    suggestions: string[] = []
  ): FormFeedback {
    return {
      type: "error",
      message: `⚠️ ${message}`,
      bodyParts,
      severity: "critical",
      suggestions: [
        "Stop and adjust your form",
        "Focus on proper technique",
        ...suggestions,
      ],
      priority: POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.SAFETY,
      timestamp: Date.now(),
      exerciseType,
    };
  }

  /**
   * Create form correction feedback
   */
  static createFormFeedback(
    exerciseType: ExerciseType,
    message: string,
    bodyParts: string[],
    severity: FormSeverity,
    suggestions: string[] = []
  ): FormFeedback {
    const priority =
      severity === "critical" || severity === "high"
        ? POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.FORM_CRITICAL
        : POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.FORM_MINOR;

    return {
      type: severity === "critical" ? "error" : "warning",
      message,
      bodyParts,
      severity,
      suggestions,
      priority,
      timestamp: Date.now(),
      exerciseType,
    };
  }

  /**
   * Create rep count feedback
   */
  static createRepCountFeedback(
    exerciseType: ExerciseType,
    repCount: number,
    isValid: boolean = true
  ): FormFeedback {
    const message = isValid
      ? `${repCount} ${repCount === 1 ? "rep" : "reps"} ✓`
      : `Rep not counted - check form`;

    return {
      type: isValid ? "success" : "warning",
      message,
      bodyParts: [],
      severity: "low",
      suggestions: isValid
        ? []
        : ["Focus on proper form", "Complete full range of motion"],
      priority: POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.REP_COUNT,
      timestamp: Date.now(),
      exerciseType,
    };
  }

  /**
   * Create encouragement feedback
   */
  static createEncouragementFeedback(
    exerciseType: ExerciseType,
    formScore: number
  ): FormFeedback {
    const messages = {
      excellent: [
        "Perfect form! 🔥",
        "Incredible technique!",
        "You're crushing it!",
        "Flawless execution!",
        "Amazing control!",
      ],
      good: [
        "Great form!",
        "Keep it up!",
        "Looking strong!",
        "Nice technique!",
        "Solid work!",
      ],
      fair: [
        "Good effort!",
        "Focus on form",
        "You're improving!",
        "Keep pushing!",
        "Stay consistent!",
      ],
    };

    let messageType: keyof typeof messages = "fair";
    if (formScore >= POSE_DETECTION_CONSTANTS.FORM_SCORE_THRESHOLDS.EXCELLENT) {
      messageType = "excellent";
    } else if (
      formScore >= POSE_DETECTION_CONSTANTS.FORM_SCORE_THRESHOLDS.GOOD
    ) {
      messageType = "good";
    }

    const randomMessage =
      messages[messageType][
        Math.floor(Math.random() * messages[messageType].length)
      ];

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
   * Create milestone feedback for achievements
   */
  static createMilestoneFeedback(
    exerciseType: ExerciseType,
    milestone: string,
    achievement: string
  ): FormFeedback {
    return {
      type: "success",
      message: `🎉 ${milestone}`,
      bodyParts: [],
      severity: "low",
      suggestions: [achievement],
      priority: POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.REP_COUNT,
      timestamp: Date.now(),
      exerciseType,
    };
  }

  /**
   * Get feedback statistics for debugging
   */
  getFeedbackStats(): {
    queueSizes: { [key: string]: number };
    currentDisplayCount: number;
    queuedCount: number;
    totalProcessed: number;
  } {
    const queueSizes: { [key: string]: number } = {};
    let totalProcessed = 0;

    Object.keys(this.feedbackQueue).forEach((key) => {
      const queueKey = key as keyof FeedbackQueue;
      const size = this.feedbackQueue[queueKey].length;
      queueSizes[key] = size;
      totalProcessed += size;
    });

    return {
      queueSizes,
      currentDisplayCount: this.displayState.currentFeedback.length,
      queuedCount: this.displayState.queuedFeedback.length,
      totalProcessed,
    };
  }
}
