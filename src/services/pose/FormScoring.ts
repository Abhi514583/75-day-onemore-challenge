import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ExerciseType,
  FormValidationResult,
  FormFeedback,
  JointIssue,
  AlignmentIssue,
  POSE_DETECTION_CONSTANTS,
} from "../../types/pose";

export interface FormScore {
  overall: number; // 0-100
  breakdown: {
    alignment: number;
    jointAngles: number;
    consistency: number;
    safety: number;
  };
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
  improvements: string[];
}

export interface FormSession {
  sessionId: string;
  exerciseType: ExerciseType;
  startTime: number;
  endTime?: number;
  repScores: FormScore[];
  averageScore: FormScore;
  improvementTrend: number; // -1 to 1
  consistencyScore: number; // 0-100
  totalReps: number;
  validReps: number;
}

export interface FormHistory {
  exerciseType: ExerciseType;
  sessions: FormSession[];
  overallStats: {
    totalSessions: number;
    averageScore: number;
    bestScore: number;
    improvementRate: number; // % improvement per session
    consistencyTrend: number;
    weakAreas: string[];
    strongAreas: string[];
  };
  weeklyProgress: {
    week: string;
    averageScore: number;
    sessionCount: number;
    improvementFromPrevious: number;
  }[];
}

export class FormScoring {
  private static readonly STORAGE_KEY_PREFIX = "form_history_";
  private static readonly MAX_SESSIONS_STORED = 50;

  /**
   * Calculate comprehensive form score
   */
  static calculateFormScore(
    validationResult: FormValidationResult,
    exerciseType: ExerciseType,
    previousScores: FormScore[] = []
  ): FormScore {
    const alignmentScore = this.calculateAlignmentScore(
      validationResult.alignmentIssues
    );
    const jointScore = this.calculateJointScore(validationResult.jointIssues);
    const safetyScore = this.calculateSafetyScore(validationResult.feedback);
    const consistencyScore = this.calculateConsistencyScore(previousScores);

    // Weighted overall score
    const weights = {
      safety: 0.4, // Safety is most important
      alignment: 0.25, // Body alignment
      jointAngles: 0.25, // Joint positioning
      consistency: 0.1, // Consistency with previous reps
    };

    const overall = Math.round(
      safetyScore * weights.safety +
        alignmentScore * weights.alignment +
        jointScore * weights.jointAngles +
        consistencyScore * weights.consistency
    );

    const breakdown = {
      alignment: alignmentScore,
      jointAngles: jointScore,
      consistency: consistencyScore,
      safety: safetyScore,
    };

    const grade = this.calculateGrade(overall);
    const improvements = this.generateImprovements(validationResult, breakdown);

    return {
      overall: Math.max(0, Math.min(100, overall)),
      breakdown,
      grade,
      improvements,
    };
  }

  /**
   * Calculate alignment score based on body positioning
   */
  private static calculateAlignmentScore(
    alignmentIssues: AlignmentIssue[]
  ): number {
    let score = 100;

    alignmentIssues.forEach((issue) => {
      const deduction = this.getAlignmentDeduction(issue);
      score -= deduction;
    });

    return Math.max(0, score);
  }

  /**
   * Calculate joint score based on joint angles
   */
  private static calculateJointScore(jointIssues: JointIssue[]): number {
    let score = 100;

    jointIssues.forEach((issue) => {
      const deduction = this.getJointDeduction(issue);
      score -= deduction;
    });

    return Math.max(0, score);
  }

  /**
   * Calculate safety score based on dangerous positions
   */
  private static calculateSafetyScore(feedback: FormFeedback[]): number {
    let score = 100;

    const safetyIssues = feedback.filter(
      (f) => f.priority >= POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.SAFETY
    );

    safetyIssues.forEach((issue) => {
      const deduction = this.getSafetyDeduction(issue);
      score -= deduction;
    });

    return Math.max(0, score);
  }

  /**
   * Calculate consistency score based on previous reps
   */
  private static calculateConsistencyScore(
    previousScores: FormScore[]
  ): number {
    if (previousScores.length < 2) {
      return 100; // No previous data to compare
    }

    const recentScores = previousScores.slice(-5); // Last 5 reps
    const scores = recentScores.map((s) => s.overall);

    // Calculate standard deviation
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length;
    const stdDev = Math.sqrt(variance);

    // Convert to consistency score (lower std dev = higher consistency)
    const maxStdDev = 30; // Maximum expected standard deviation
    const consistencyScore = Math.max(0, 100 - (stdDev / maxStdDev) * 100);

    return Math.round(consistencyScore);
  }

  /**
   * Calculate letter grade from overall score
   */
  private static calculateGrade(
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

  /**
   * Generate improvement suggestions
   */
  private static generateImprovements(
    validationResult: FormValidationResult,
    breakdown: FormScore["breakdown"]
  ): string[] {
    const improvements: string[] = [];

    // Safety improvements (highest priority)
    const safetyIssues = validationResult.feedback.filter(
      (f) => f.priority >= POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.SAFETY
    );
    if (safetyIssues.length > 0) {
      improvements.push("Address safety concerns first");
    }

    // Specific area improvements
    if (breakdown.alignment < 80) {
      improvements.push("Focus on body alignment");
    }
    if (breakdown.jointAngles < 80) {
      improvements.push("Work on joint positioning");
    }
    if (breakdown.consistency < 80) {
      improvements.push("Maintain consistent form throughout");
    }

    // Joint-specific improvements
    validationResult.jointIssues.forEach((issue) => {
      improvements.push(`Improve ${issue.joint} positioning`);
    });

    // Alignment-specific improvements
    validationResult.alignmentIssues.forEach((issue) => {
      improvements.push(`Work on ${issue.type} alignment`);
    });

    return improvements.slice(0, 3); // Top 3 improvements
  }

  /**
   * Get deduction amount for alignment issues
   */
  private static getAlignmentDeduction(issue: AlignmentIssue): number {
    const baseDeduction = {
      critical: 30,
      high: 20,
      medium: 15,
      low: 5,
    };

    const severityDeduction = baseDeduction[issue.severity] || 10;

    // Additional deduction based on deviation magnitude
    const deviationMultiplier = Math.min(2, issue.deviation / issue.threshold);

    return Math.round(severityDeduction * deviationMultiplier);
  }

  /**
   * Get deduction amount for joint issues
   */
  private static getJointDeduction(issue: JointIssue): number {
    const baseDeduction = {
      critical: 25,
      high: 18,
      medium: 12,
      low: 4,
    };

    const severityDeduction = baseDeduction[issue.severity] || 8;

    // Calculate how far outside the expected range
    const [minRange, maxRange] = issue.expectedRange;
    let deviationFactor = 1;

    if (issue.actualAngle < minRange) {
      deviationFactor = (minRange - issue.actualAngle) / minRange;
    } else if (issue.actualAngle > maxRange) {
      deviationFactor = (issue.actualAngle - maxRange) / maxRange;
    }

    return Math.round(severityDeduction * Math.min(2, deviationFactor));
  }

  /**
   * Get deduction amount for safety issues
   */
  private static getSafetyDeduction(feedback: FormFeedback): number {
    const severityDeduction = {
      critical: 40,
      high: 25,
      medium: 10,
      low: 2,
    };

    return severityDeduction[feedback.severity] || 15;
  }

  /**
   * Save form session to storage
   */
  static async saveFormSession(session: FormSession): Promise<void> {
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${session.exerciseType}`;
      const existingData = await AsyncStorage.getItem(storageKey);

      let history: FormHistory;
      if (existingData) {
        history = JSON.parse(existingData);
      } else {
        history = {
          exerciseType: session.exerciseType,
          sessions: [],
          overallStats: {
            totalSessions: 0,
            averageScore: 0,
            bestScore: 0,
            improvementRate: 0,
            consistencyTrend: 0,
            weakAreas: [],
            strongAreas: [],
          },
          weeklyProgress: [],
        };
      }

      // Add new session
      history.sessions.push(session);

      // Keep only recent sessions
      if (history.sessions.length > this.MAX_SESSIONS_STORED) {
        history.sessions = history.sessions.slice(-this.MAX_SESSIONS_STORED);
      }

      // Update overall stats
      history.overallStats = this.calculateOverallStats(history.sessions);
      history.weeklyProgress = this.calculateWeeklyProgress(history.sessions);

      await AsyncStorage.setItem(storageKey, JSON.stringify(history));
    } catch (error) {
      console.error("Error saving form session:", error);
    }
  }

  /**
   * Load form history for exercise type
   */
  static async loadFormHistory(
    exerciseType: ExerciseType
  ): Promise<FormHistory | null> {
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${exerciseType}`;
      const data = await AsyncStorage.getItem(storageKey);

      if (data) {
        return JSON.parse(data);
      }

      return null;
    } catch (error) {
      console.error("Error loading form history:", error);
      return null;
    }
  }

  /**
   * Calculate overall statistics
   */
  private static calculateOverallStats(
    sessions: FormSession[]
  ): FormHistory["overallStats"] {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        averageScore: 0,
        bestScore: 0,
        improvementRate: 0,
        consistencyTrend: 0,
        weakAreas: [],
        strongAreas: [],
      };
    }

    const scores = sessions.map((s) => s.averageScore.overall);
    const totalSessions = sessions.length;
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / totalSessions;
    const bestScore = Math.max(...scores);

    // Calculate improvement rate
    const improvementRate = this.calculateImprovementRate(scores);

    // Calculate consistency trend
    const consistencyTrend = this.calculateConsistencyTrend(sessions);

    // Identify weak and strong areas
    const { weakAreas, strongAreas } = this.identifyFormAreas(sessions);

    return {
      totalSessions,
      averageScore: Math.round(averageScore),
      bestScore,
      improvementRate,
      consistencyTrend,
      weakAreas,
      strongAreas,
    };
  }

  /**
   * Calculate weekly progress
   */
  private static calculateWeeklyProgress(
    sessions: FormSession[]
  ): FormHistory["weeklyProgress"] {
    const weeklyData: { [week: string]: { scores: number[]; count: number } } =
      {};

    sessions.forEach((session) => {
      const date = new Date(session.startTime);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { scores: [], count: 0 };
      }

      weeklyData[weekKey].scores.push(session.averageScore.overall);
      weeklyData[weekKey].count++;
    });

    const weeklyProgress = Object.entries(weeklyData)
      .map(([week, data]) => ({
        week,
        averageScore: Math.round(
          data.scores.reduce((sum, score) => sum + score, 0) / data.count
        ),
        sessionCount: data.count,
        improvementFromPrevious: 0, // Will be calculated below
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Calculate improvement from previous week
    for (let i = 1; i < weeklyProgress.length; i++) {
      weeklyProgress[i].improvementFromPrevious =
        weeklyProgress[i].averageScore - weeklyProgress[i - 1].averageScore;
    }

    return weeklyProgress;
  }

  /**
   * Calculate improvement rate over time
   */
  private static calculateImprovementRate(scores: number[]): number {
    if (scores.length < 2) return 0;

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;

    return Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
  }

  /**
   * Calculate consistency trend
   */
  private static calculateConsistencyTrend(sessions: FormSession[]): number {
    if (sessions.length < 3) return 0;

    const consistencyScores = sessions.map((s) => s.consistencyScore);
    const recentConsistency =
      consistencyScores.slice(-5).reduce((sum, score) => sum + score, 0) /
      Math.min(5, consistencyScores.length);
    const overallConsistency =
      consistencyScores.reduce((sum, score) => sum + score, 0) /
      consistencyScores.length;

    return Math.round(recentConsistency - overallConsistency);
  }

  /**
   * Identify weak and strong areas
   */
  private static identifyFormAreas(sessions: FormSession[]): {
    weakAreas: string[];
    strongAreas: string[];
  } {
    const areaScores: { [area: string]: number[] } = {
      alignment: [],
      jointAngles: [],
      consistency: [],
      safety: [],
    };

    sessions.forEach((session) => {
      Object.entries(session.averageScore.breakdown).forEach(
        ([area, score]) => {
          areaScores[area].push(score);
        }
      );
    });

    const areaAverages = Object.entries(areaScores).map(([area, scores]) => ({
      area,
      average:
        scores.length > 0
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : 0,
    }));

    const weakAreas = areaAverages
      .filter((area) => area.average < 75)
      .sort((a, b) => a.average - b.average)
      .map((area) => area.area)
      .slice(0, 2);

    const strongAreas = areaAverages
      .filter((area) => area.average >= 85)
      .sort((a, b) => b.average - a.average)
      .map((area) => area.area)
      .slice(0, 2);

    return { weakAreas, strongAreas };
  }

  /**
   * Get form improvement suggestions based on history
   */
  static async getPersonalizedSuggestions(
    exerciseType: ExerciseType
  ): Promise<string[]> {
    const history = await this.loadFormHistory(exerciseType);

    if (!history || history.sessions.length === 0) {
      return [
        "Focus on maintaining proper form",
        "Start with slower, controlled movements",
        "Pay attention to body alignment",
      ];
    }

    const suggestions: string[] = [];
    const stats = history.overallStats;

    // Based on weak areas
    if (stats.weakAreas.includes("alignment")) {
      suggestions.push(
        "Work on body alignment - practice in front of a mirror"
      );
    }
    if (stats.weakAreas.includes("jointAngles")) {
      suggestions.push("Focus on proper joint positioning and range of motion");
    }
    if (stats.weakAreas.includes("consistency")) {
      suggestions.push("Maintain the same form quality throughout your set");
    }
    if (stats.weakAreas.includes("safety")) {
      suggestions.push("Prioritize safety - slow down and focus on technique");
    }

    // Based on improvement trend
    if (stats.improvementRate < 0) {
      suggestions.push("Take breaks between sets to maintain form quality");
    } else if (stats.improvementRate > 10) {
      suggestions.push("Great progress! Keep focusing on the fundamentals");
    }

    // Based on consistency trend
    if (stats.consistencyTrend < -5) {
      suggestions.push(
        "Try to maintain consistent form - quality over quantity"
      );
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Clear all form history (for testing or reset)
   */
  static async clearFormHistory(exerciseType?: ExerciseType): Promise<void> {
    try {
      if (exerciseType) {
        const storageKey = `${this.STORAGE_KEY_PREFIX}${exerciseType}`;
        await AsyncStorage.removeItem(storageKey);
      } else {
        // Clear all exercise types
        const keys = await AsyncStorage.getAllKeys();
        const formKeys = keys.filter((key) =>
          key.startsWith(this.STORAGE_KEY_PREFIX)
        );
        await AsyncStorage.multiRemove(formKeys);
      }
    } catch (error) {
      console.error("Error clearing form history:", error);
    }
  }
}
