import AsyncStorage from "@react-native-async-storage/async-storage";
import { FormSession } from "./pose/FormScoring";
import { ExerciseType } from "../types/pose";

export interface WorkoutExercise {
  type: ExerciseType | string;
  targetCount: number;
  actualCount: number;
  duration: number; // seconds
  completed: boolean;
  timestamp: number;

  // Enhanced with pose detection data
  poseDetectionUsed?: boolean;
  formData?: FormSession;
  formScore?: number;
  formGrade?: string;
  repAccuracy?: number; // percentage of valid reps
  consistencyScore?: number;
  improvementAreas?: string[];
}

export interface WorkoutSession {
  id: string;
  date: string; // YYYY-MM-DD format
  type: "challenge" | "duel" | "personal" | "custom";
  exercises: WorkoutExercise[];
  totalDuration: number;
  completed: boolean;

  // Enhanced analytics
  overallFormScore?: number;
  poseDetectionUsage?: number; // percentage of exercises using pose detection
  achievements?: string[];
  notes?: string;
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalExercises: number;
  totalDuration: number; // total seconds
  averageFormScore: number;
  poseDetectionUsage: number; // percentage

  // Exercise-specific stats
  exerciseStats: {
    [exerciseType: string]: {
      totalSessions: number;
      averageReps: number;
      averageFormScore: number;
      bestFormScore: number;
      improvementTrend: number; // -1 to 1
      lastPerformed: string;
    };
  };

  // Weekly progress
  weeklyProgress: {
    week: string;
    workouts: number;
    averageFormScore: number;
    totalDuration: number;
  }[];

  // Achievements and milestones
  achievements: {
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
    category: "form" | "consistency" | "volume" | "streak";
  }[];
}

export class WorkoutDataService {
  private static readonly STORAGE_KEYS = {
    SESSIONS: "workout_sessions",
    STATS: "workout_stats",
    CURRENT_SESSION: "current_workout_session",
  };

  /**
   * Save a completed workout session
   */
  static async saveWorkoutSession(session: WorkoutSession): Promise<void> {
    try {
      // Get existing sessions
      const existingSessions = await this.getWorkoutSessions();

      // Add new session
      const updatedSessions = [...existingSessions, session];

      // Keep only last 100 sessions to manage storage
      const recentSessions = updatedSessions.slice(-100);

      // Save sessions
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.SESSIONS,
        JSON.stringify(recentSessions)
      );

      // Update stats
      await this.updateWorkoutStats(session);
    } catch (error) {
      console.error("Error saving workout session:", error);
      throw error;
    }
  }

  /**
   * Get all workout sessions
   */
  static async getWorkoutSessions(): Promise<WorkoutSession[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error loading workout sessions:", error);
      return [];
    }
  }

  /**
   * Get workout sessions for a specific date range
   */
  static async getWorkoutSessionsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<WorkoutSession[]> {
    try {
      const allSessions = await this.getWorkoutSessions();
      return allSessions.filter(
        (session) => session.date >= startDate && session.date <= endDate
      );
    } catch (error) {
      console.error("Error loading sessions by date range:", error);
      return [];
    }
  }

  /**
   * Get workout sessions for a specific exercise type
   */
  static async getWorkoutSessionsByExercise(
    exerciseType: ExerciseType | string
  ): Promise<WorkoutSession[]> {
    try {
      const allSessions = await this.getWorkoutSessions();
      return allSessions.filter((session) =>
        session.exercises.some((exercise) => exercise.type === exerciseType)
      );
    } catch (error) {
      console.error("Error loading sessions by exercise:", error);
      return [];
    }
  }

  /**
   * Update workout statistics
   */
  private static async updateWorkoutStats(
    newSession: WorkoutSession
  ): Promise<void> {
    try {
      const existingStats = await this.getWorkoutStats();
      const allSessions = await this.getWorkoutSessions();

      // Calculate updated stats
      const updatedStats = this.calculateWorkoutStats(allSessions);

      // Save updated stats
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.STATS,
        JSON.stringify(updatedStats)
      );
    } catch (error) {
      console.error("Error updating workout stats:", error);
    }
  }

  /**
   * Get workout statistics
   */
  static async getWorkoutStats(): Promise<WorkoutStats> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.STATS);
      if (data) {
        return JSON.parse(data);
      }

      // If no stats exist, calculate from sessions
      const sessions = await this.getWorkoutSessions();
      return this.calculateWorkoutStats(sessions);
    } catch (error) {
      console.error("Error loading workout stats:", error);
      return this.getEmptyStats();
    }
  }

  /**
   * Calculate workout statistics from sessions
   */
  private static calculateWorkoutStats(
    sessions: WorkoutSession[]
  ): WorkoutStats {
    if (sessions.length === 0) {
      return this.getEmptyStats();
    }

    const totalWorkouts = sessions.length;
    const totalExercises = sessions.reduce(
      (sum, session) => sum + session.exercises.length,
      0
    );
    const totalDuration = sessions.reduce(
      (sum, session) => sum + session.totalDuration,
      0
    );

    // Calculate form scores
    const formScores = sessions
      .flatMap((session) => session.exercises)
      .filter((exercise) => exercise.formScore !== undefined)
      .map((exercise) => exercise.formScore!);

    const averageFormScore =
      formScores.length > 0
        ? formScores.reduce((sum, score) => sum + score, 0) / formScores.length
        : 0;

    // Calculate pose detection usage
    const exercisesWithPoseDetection = sessions
      .flatMap((session) => session.exercises)
      .filter((exercise) => exercise.poseDetectionUsed).length;

    const poseDetectionUsage =
      totalExercises > 0
        ? (exercisesWithPoseDetection / totalExercises) * 100
        : 0;

    // Calculate exercise-specific stats
    const exerciseStats: WorkoutStats["exerciseStats"] = {};
    const exerciseGroups = this.groupExercisesByType(sessions);

    Object.entries(exerciseGroups).forEach(([exerciseType, exercises]) => {
      const formScores = exercises
        .filter((ex) => ex.formScore !== undefined)
        .map((ex) => ex.formScore!);

      const averageReps =
        exercises.reduce((sum, ex) => sum + ex.actualCount, 0) /
        exercises.length;

      const averageFormScore =
        formScores.length > 0
          ? formScores.reduce((sum, score) => sum + score, 0) /
            formScores.length
          : 0;

      const bestFormScore = formScores.length > 0 ? Math.max(...formScores) : 0;

      const improvementTrend = this.calculateImprovementTrend(formScores);

      const lastPerformed = exercises.sort(
        (a, b) => b.timestamp - a.timestamp
      )[0]?.timestamp
        ? new Date(exercises[0].timestamp).toISOString().split("T")[0]
        : "";

      exerciseStats[exerciseType] = {
        totalSessions: exercises.length,
        averageReps: Math.round(averageReps),
        averageFormScore: Math.round(averageFormScore),
        bestFormScore: Math.round(bestFormScore),
        improvementTrend,
        lastPerformed,
      };
    });

    // Calculate weekly progress
    const weeklyProgress = this.calculateWeeklyProgress(sessions);

    // Get achievements (placeholder - would be calculated based on actual achievements)
    const achievements: WorkoutStats["achievements"] = [];

    return {
      totalWorkouts,
      totalExercises,
      totalDuration,
      averageFormScore: Math.round(averageFormScore),
      poseDetectionUsage: Math.round(poseDetectionUsage),
      exerciseStats,
      weeklyProgress,
      achievements,
    };
  }

  /**
   * Group exercises by type
   */
  private static groupExercisesByType(sessions: WorkoutSession[]): {
    [exerciseType: string]: WorkoutExercise[];
  } {
    const groups: { [exerciseType: string]: WorkoutExercise[] } = {};

    sessions.forEach((session) => {
      session.exercises.forEach((exercise) => {
        if (!groups[exercise.type]) {
          groups[exercise.type] = [];
        }
        groups[exercise.type].push(exercise);
      });
    });

    return groups;
  }

  /**
   * Calculate improvement trend for an array of scores
   */
  private static calculateImprovementTrend(scores: number[]): number {
    if (scores.length < 2) return 0;

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;

    return Math.max(-1, Math.min(1, (secondAvg - firstAvg) / 100));
  }

  /**
   * Calculate weekly progress
   */
  private static calculateWeeklyProgress(
    sessions: WorkoutSession[]
  ): WorkoutStats["weeklyProgress"] {
    const weeklyData: {
      [week: string]: {
        workouts: number;
        formScores: number[];
        totalDuration: number;
      };
    } = {};

    sessions.forEach((session) => {
      const date = new Date(session.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          workouts: 0,
          formScores: [],
          totalDuration: 0,
        };
      }

      weeklyData[weekKey].workouts++;
      weeklyData[weekKey].totalDuration += session.totalDuration;

      // Collect form scores from exercises
      session.exercises.forEach((exercise) => {
        if (exercise.formScore !== undefined) {
          weeklyData[weekKey].formScores.push(exercise.formScore);
        }
      });
    });

    return Object.entries(weeklyData)
      .map(([week, data]) => ({
        week,
        workouts: data.workouts,
        averageFormScore:
          data.formScores.length > 0
            ? Math.round(
                data.formScores.reduce((sum, score) => sum + score, 0) /
                  data.formScores.length
              )
            : 0,
        totalDuration: data.totalDuration,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  /**
   * Get empty stats structure
   */
  private static getEmptyStats(): WorkoutStats {
    return {
      totalWorkouts: 0,
      totalExercises: 0,
      totalDuration: 0,
      averageFormScore: 0,
      poseDetectionUsage: 0,
      exerciseStats: {},
      weeklyProgress: [],
      achievements: [],
    };
  }

  /**
   * Save current workout session (for in-progress workouts)
   */
  static async saveCurrentSession(
    session: Partial<WorkoutSession>
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.CURRENT_SESSION,
        JSON.stringify(session)
      );
    } catch (error) {
      console.error("Error saving current session:", error);
    }
  }

  /**
   * Get current workout session
   */
  static async getCurrentSession(): Promise<Partial<WorkoutSession> | null> {
    try {
      const data = await AsyncStorage.getItem(
        this.STORAGE_KEYS.CURRENT_SESSION
      );
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error loading current session:", error);
      return null;
    }
  }

  /**
   * Clear current workout session
   */
  static async clearCurrentSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEYS.CURRENT_SESSION);
    } catch (error) {
      console.error("Error clearing current session:", error);
    }
  }

  /**
   * Export workout data for backup or analysis
   */
  static async exportWorkoutData(): Promise<{
    sessions: WorkoutSession[];
    stats: WorkoutStats;
    exportDate: string;
  }> {
    try {
      const sessions = await this.getWorkoutSessions();
      const stats = await this.getWorkoutStats();

      return {
        sessions,
        stats,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error exporting workout data:", error);
      throw error;
    }
  }

  /**
   * Import workout data from backup
   */
  static async importWorkoutData(data: {
    sessions: WorkoutSession[];
    stats: WorkoutStats;
  }): Promise<void> {
    try {
      // Validate data structure
      if (!Array.isArray(data.sessions) || !data.stats) {
        throw new Error("Invalid data structure");
      }

      // Save sessions
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.SESSIONS,
        JSON.stringify(data.sessions)
      );

      // Save stats
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.STATS,
        JSON.stringify(data.stats)
      );
    } catch (error) {
      console.error("Error importing workout data:", error);
      throw error;
    }
  }

  /**
   * Clear all workout data
   */
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.SESSIONS,
        this.STORAGE_KEYS.STATS,
        this.STORAGE_KEYS.CURRENT_SESSION,
      ]);
    } catch (error) {
      console.error("Error clearing workout data:", error);
      throw error;
    }
  }

  /**
   * Get workout insights and recommendations
   */
  static async getWorkoutInsights(): Promise<{
    insights: string[];
    recommendations: string[];
    trends: {
      formImprovement: number;
      consistencyTrend: number;
      volumeTrend: number;
    };
  }> {
    try {
      const stats = await this.getWorkoutStats();
      const sessions = await this.getWorkoutSessions();

      const insights: string[] = [];
      const recommendations: string[] = [];

      // Form score insights
      if (stats.averageFormScore >= 90) {
        insights.push("🎯 Excellent form consistency across workouts!");
      } else if (stats.averageFormScore >= 75) {
        insights.push("💪 Good form quality with room for improvement");
        recommendations.push("Focus on the exercises with lower form scores");
      } else {
        insights.push("📈 Form improvement opportunity identified");
        recommendations.push("Consider slowing down movements for better form");
        recommendations.push("Review exercise technique videos");
      }

      // Pose detection usage
      if (stats.poseDetectionUsage >= 80) {
        insights.push("🤖 Great use of AI pose detection for form tracking!");
      } else if (stats.poseDetectionUsage >= 50) {
        insights.push("📱 Moderate use of pose detection features");
        recommendations.push("Try using pose detection for more exercises");
      } else {
        insights.push("🔍 Low pose detection usage detected");
        recommendations.push(
          "Enable AI pose detection for better form feedback"
        );
      }

      // Consistency insights
      const recentSessions = sessions.slice(-7); // Last 7 sessions
      if (recentSessions.length >= 5) {
        insights.push("🔥 Great workout consistency this week!");
      } else if (recentSessions.length >= 3) {
        insights.push("📅 Good workout frequency");
        recommendations.push("Try to maintain 5+ workouts per week");
      } else {
        insights.push("⏰ Opportunity to increase workout frequency");
        recommendations.push("Aim for at least 3 workouts per week");
      }

      // Calculate trends
      const trends = {
        formImprovement: this.calculateOverallFormTrend(sessions),
        consistencyTrend: this.calculateConsistencyTrend(sessions),
        volumeTrend: this.calculateVolumeTrend(sessions),
      };

      return { insights, recommendations, trends };
    } catch (error) {
      console.error("Error generating workout insights:", error);
      return {
        insights: [],
        recommendations: [],
        trends: { formImprovement: 0, consistencyTrend: 0, volumeTrend: 0 },
      };
    }
  }

  /**
   * Calculate overall form improvement trend
   */
  private static calculateOverallFormTrend(sessions: WorkoutSession[]): number {
    const formScores = sessions
      .flatMap((session) => session.exercises)
      .filter((exercise) => exercise.formScore !== undefined)
      .map((exercise) => exercise.formScore!);

    return this.calculateImprovementTrend(formScores);
  }

  /**
   * Calculate workout consistency trend
   */
  private static calculateConsistencyTrend(sessions: WorkoutSession[]): number {
    if (sessions.length < 4) return 0;

    // Group sessions by week
    const weeklyWorkouts: { [week: string]: number } = {};
    sessions.forEach((session) => {
      const date = new Date(session.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      weeklyWorkouts[weekKey] = (weeklyWorkouts[weekKey] || 0) + 1;
    });

    const weeklyCounts = Object.values(weeklyWorkouts);
    return this.calculateImprovementTrend(weeklyCounts);
  }

  /**
   * Calculate workout volume trend
   */
  private static calculateVolumeTrend(sessions: WorkoutSession[]): number {
    if (sessions.length < 4) return 0;

    const weeklyVolumes: { [week: string]: number } = {};
    sessions.forEach((session) => {
      const date = new Date(session.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      const sessionVolume = session.exercises.reduce(
        (sum, exercise) => sum + exercise.actualCount,
        0
      );

      weeklyVolumes[weekKey] = (weeklyVolumes[weekKey] || 0) + sessionVolume;
    });

    const volumeCounts = Object.values(weeklyVolumes);
    return this.calculateImprovementTrend(volumeCounts);
  }
}
