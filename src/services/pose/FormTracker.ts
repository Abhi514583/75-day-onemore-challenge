import { FormScoring, FormScore, FormSession } from "./FormScoring";
import { FormValidator } from "./FormValidator";
import { FeedbackManager } from "./FeedbackManager";
import {
  ExerciseType,
  FormValidationResult,
  FormFeedback,
  Pose,
  CalibrationData,
} from "../../types/pose";

export interface FormTrackingState {
  isTracking: boolean;
  currentSession: FormSession | null;
  currentRepScores: FormScore[];
  feedbackManager: FeedbackManager;
  lastValidationTime: number;
  sessionStats: {
    totalReps: number;
    validReps: number;
    averageScore: number;
    currentStreak: number; // consecutive good form reps
    bestStreak: number;
  };
}

export class FormTracker {
  private state: FormTrackingState;
  private readonly minValidationInterval = 100; // ms between validations

  constructor() {
    this.state = {
      isTracking: false,
      currentSession: null,
      currentRepScores: [],
      feedbackManager: new FeedbackManager(),
      lastValidationTime: 0,
      sessionStats: {
        totalReps: 0,
        validReps: 0,
        averageScore: 0,
        currentStreak: 0,
        bestStreak: 0,
      },
    };
  }

  /**
   * Start tracking form for a new session
   */
  startSession(exerciseType: ExerciseType): string {
    const sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    this.state.currentSession = {
      sessionId,
      exerciseType,
      startTime: Date.now(),
      repScores: [],
      averageScore: {
        overall: 0,
        breakdown: { alignment: 0, jointAngles: 0, consistency: 0, safety: 0 },
        grade: "F",
        improvements: [],
      },
      improvementTrend: 0,
      consistencyScore: 0,
      totalReps: 0,
      validReps: 0,
    };

    this.state.isTracking = true;
    this.state.currentRepScores = [];
    this.state.feedbackManager.clearAllFeedback();
    this.state.sessionStats = {
      totalReps: 0,
      validReps: 0,
      averageScore: 0,
      currentStreak: 0,
      bestStreak: 0,
    };

    return sessionId;
  }

  /**
   * Process pose data and update form tracking
   */
  processFrame(
    pose: Pose,
    exerciseType: ExerciseType,
    calibration?: CalibrationData
  ): {
    formScore: FormScore | null;
    feedback: FormFeedback[];
    shouldCountRep: boolean;
    sessionStats: FormTrackingState["sessionStats"];
  } {
    const now = Date.now();

    // Throttle validation to avoid overwhelming processing
    if (now - this.state.lastValidationTime < this.minValidationInterval) {
      return {
        formScore: null,
        feedback: this.state.feedbackManager.getCurrentFeedback(),
        shouldCountRep: false,
        sessionStats: this.state.sessionStats,
      };
    }

    this.state.lastValidationTime = now;

    // Validate form
    const validationResult = FormValidator.validateForm(
      pose,
      exerciseType,
      calibration
    );

    // Calculate form score
    const formScore = FormScoring.calculateFormScore(
      validationResult,
      exerciseType,
      this.state.currentRepScores.slice(-5) // Last 5 reps for consistency
    );

    // Add feedback to manager
    this.state.feedbackManager.addMultipleFeedback(validationResult.feedback);

    // Get current feedback
    const currentFeedback = this.state.feedbackManager.getCurrentFeedback();

    // Determine if this should count as a rep
    const shouldCountRep = this.shouldCountRep(formScore, validationResult);

    return {
      formScore,
      feedback: currentFeedback,
      shouldCountRep,
      sessionStats: this.state.sessionStats,
    };
  }

  /**
   * Record a completed repetition
   */
  recordRep(formScore: FormScore, isValid: boolean = true): void {
    if (!this.state.currentSession) {
      return;
    }

    // Add to rep scores
    this.state.currentRepScores.push(formScore);
    this.state.currentSession.repScores.push(formScore);

    // Update session stats
    this.state.sessionStats.totalReps++;

    if (isValid) {
      this.state.sessionStats.validReps++;

      // Update streak
      if (formScore.overall >= 75) {
        // Good form threshold
        this.state.sessionStats.currentStreak++;
        this.state.sessionStats.bestStreak = Math.max(
          this.state.sessionStats.bestStreak,
          this.state.sessionStats.currentStreak
        );
      } else {
        this.state.sessionStats.currentStreak = 0;
      }
    } else {
      this.state.sessionStats.currentStreak = 0;
    }

    // Update average score
    const validScores = this.state.currentRepScores.filter(
      (_, index) => index < this.state.sessionStats.validReps
    );

    if (validScores.length > 0) {
      this.state.sessionStats.averageScore = Math.round(
        validScores.reduce((sum, score) => sum + score.overall, 0) /
          validScores.length
      );
    }

    // Update session data
    this.updateSessionAverages();

    // Add rep count feedback
    const repFeedback = FeedbackManager.createRepCountFeedback(
      this.state.currentSession.exerciseType,
      this.state.sessionStats.validReps,
      isValid
    );
    this.state.feedbackManager.addFeedback(repFeedback);

    // Add milestone feedback
    this.checkMilestones();
  }

  /**
   * End the current tracking session
   */
  async endSession(): Promise<FormSession | null> {
    if (!this.state.currentSession) {
      return null;
    }

    // Finalize session data
    this.state.currentSession.endTime = Date.now();
    this.state.currentSession.totalReps = this.state.sessionStats.totalReps;
    this.state.currentSession.validReps = this.state.sessionStats.validReps;

    // Calculate final averages and trends
    this.updateSessionAverages();
    this.calculateImprovementTrend();
    this.calculateConsistencyScore();

    // Save session
    const session = { ...this.state.currentSession };
    await FormScoring.saveFormSession(session);

    // Reset state
    this.state.isTracking = false;
    this.state.currentSession = null;
    this.state.currentRepScores = [];
    this.state.feedbackManager.clearAllFeedback();

    return session;
  }

  /**
   * Get current session data
   */
  getCurrentSession(): FormSession | null {
    return this.state.currentSession;
  }

  /**
   * Get current feedback
   */
  getCurrentFeedback(): FormFeedback[] {
    return this.state.feedbackManager.getCurrentFeedback();
  }

  /**
   * Get session statistics
   */
  getSessionStats(): FormTrackingState["sessionStats"] {
    return { ...this.state.sessionStats };
  }

  /**
   * Check if tracking is active
   */
  isTracking(): boolean {
    return this.state.isTracking;
  }

  /**
   * Determine if a rep should be counted based on form score
   */
  private shouldCountRep(
    formScore: FormScore,
    validationResult: FormValidationResult
  ): boolean {
    // Don't count if there are safety issues
    const hasSafetyIssues = validationResult.feedback.some(
      (f) => f.severity === "critical" || f.type === "error"
    );

    if (hasSafetyIssues) {
      return false;
    }

    // Don't count if form score is too low
    if (formScore.overall < 50) {
      return false;
    }

    // Don't count if form is not valid
    if (!validationResult.isValidForm) {
      return false;
    }

    return true;
  }

  /**
   * Update session averages
   */
  private updateSessionAverages(): void {
    if (
      !this.state.currentSession ||
      this.state.currentRepScores.length === 0
    ) {
      return;
    }

    const scores = this.state.currentRepScores;
    const totalScores = scores.length;

    // Calculate average overall score
    const avgOverall =
      scores.reduce((sum, score) => sum + score.overall, 0) / totalScores;

    // Calculate average breakdown scores
    const avgAlignment =
      scores.reduce((sum, score) => sum + score.breakdown.alignment, 0) /
      totalScores;
    const avgJointAngles =
      scores.reduce((sum, score) => sum + score.breakdown.jointAngles, 0) /
      totalScores;
    const avgConsistency =
      scores.reduce((sum, score) => sum + score.breakdown.consistency, 0) /
      totalScores;
    const avgSafety =
      scores.reduce((sum, score) => sum + score.breakdown.safety, 0) /
      totalScores;

    // Update session average
    this.state.currentSession.averageScore = {
      overall: Math.round(avgOverall),
      breakdown: {
        alignment: Math.round(avgAlignment),
        jointAngles: Math.round(avgJointAngles),
        consistency: Math.round(avgConsistency),
        safety: Math.round(avgSafety),
      },
      grade: this.calculateGrade(avgOverall),
      improvements: this.getSessionImprovements(),
    };
  }

  /**
   * Calculate improvement trend for the session
   */
  private calculateImprovementTrend(): void {
    if (!this.state.currentSession || this.state.currentRepScores.length < 3) {
      this.state.currentSession!.improvementTrend = 0;
      return;
    }

    const scores = this.state.currentRepScores.map((s) => s.overall);
    const firstThird = scores.slice(0, Math.floor(scores.length / 3));
    const lastThird = scores.slice(-Math.floor(scores.length / 3));

    const firstAvg =
      firstThird.reduce((sum, score) => sum + score, 0) / firstThird.length;
    const lastAvg =
      lastThird.reduce((sum, score) => sum + score, 0) / lastThird.length;

    this.state.currentSession!.improvementTrend =
      (lastAvg - firstAvg) / firstAvg;
  }

  /**
   * Calculate consistency score for the session
   */
  private calculateConsistencyScore(): void {
    if (!this.state.currentSession || this.state.currentRepScores.length < 2) {
      this.state.currentSession!.consistencyScore = 100;
      return;
    }

    const scores = this.state.currentRepScores.map((s) => s.overall);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length;
    const stdDev = Math.sqrt(variance);

    // Convert to consistency score (lower std dev = higher consistency)
    const maxStdDev = 25;
    const consistencyScore = Math.max(0, 100 - (stdDev / maxStdDev) * 100);

    this.state.currentSession!.consistencyScore = Math.round(consistencyScore);
  }

  /**
   * Get session-specific improvements
   */
  private getSessionImprovements(): string[] {
    if (!this.state.currentSession) {
      return [];
    }

    const improvements: string[] = [];
    const avgScore = this.state.currentSession.averageScore;

    // Based on breakdown scores
    if (avgScore.breakdown.safety < 85) {
      improvements.push("Focus on safety and proper technique");
    }
    if (avgScore.breakdown.alignment < 75) {
      improvements.push("Work on body alignment");
    }
    if (avgScore.breakdown.jointAngles < 75) {
      improvements.push("Improve joint positioning");
    }
    if (avgScore.breakdown.consistency < 70) {
      improvements.push("Maintain consistent form throughout");
    }

    // Based on improvement trend
    if (this.state.currentSession.improvementTrend < -0.1) {
      improvements.push("Take breaks to maintain form quality");
    }

    return improvements.slice(0, 3);
  }

  /**
   * Check for milestones and add celebration feedback
   */
  private checkMilestones(): void {
    if (!this.state.currentSession) {
      return;
    }

    const stats = this.state.sessionStats;

    // Rep milestones
    if (stats.validReps > 0 && stats.validReps % 10 === 0) {
      const milestone = FeedbackManager.createMilestoneFeedback(
        this.state.currentSession.exerciseType,
        `${stats.validReps} perfect reps!`,
        "You're on fire! 🔥"
      );
      this.state.feedbackManager.addFeedback(milestone);
    }

    // Streak milestones
    if (stats.currentStreak === 5) {
      const milestone = FeedbackManager.createMilestoneFeedback(
        this.state.currentSession.exerciseType,
        "5 perfect reps in a row!",
        "Excellent consistency! 💪"
      );
      this.state.feedbackManager.addFeedback(milestone);
    }

    if (stats.currentStreak === 10) {
      const milestone = FeedbackManager.createMilestoneFeedback(
        this.state.currentSession.exerciseType,
        "10 perfect reps streak!",
        "You're a form master! 🏆"
      );
      this.state.feedbackManager.addFeedback(milestone);
    }

    // Form score milestones
    if (stats.averageScore >= 90 && stats.validReps >= 5) {
      const milestone = FeedbackManager.createMilestoneFeedback(
        this.state.currentSession.exerciseType,
        "90+ average form score!",
        "Outstanding technique! ⭐"
      );
      this.state.feedbackManager.addFeedback(milestone);
    }
  }

  /**
   * Force add feedback (for external systems)
   */
  addFeedback(feedback: FormFeedback): void {
    this.state.feedbackManager.addFeedback(feedback);
  }

  /**
   * Clear current feedback
   */
  clearFeedback(): void {
    this.state.feedbackManager.clearAllFeedback();
  }

  /**
   * Get feedback statistics for debugging
   */
  getFeedbackStats(): any {
    return this.state.feedbackManager.getFeedbackStats();
  }

  /**
   * Calculate letter grade from overall score
   */
  private calculateGrade(
    score: number
  ): "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F" {
    if (score >= 97) return "A+";
    if (score >= 93) return "A";
    if (score >= 87) return "B+";
    if (score >= 83) return "B";
    if (score >= 77) return "C+";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }
}
