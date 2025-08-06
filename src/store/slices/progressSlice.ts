import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ExerciseStats {
  totalReps: number;
  averageReps: number;
  bestDay: number;
  improvementRate: number; // percentage
}

export interface WeeklyStats {
  week: number; // 1-11 (75 days = ~11 weeks)
  startDate: string;
  endDate: string;
  completedDays: number;
  totalExercises: number;
  averageCompletion: number; // percentage
}

export interface MilestoneAchievement {
  id: string;
  type: "streak" | "completion" | "exercise" | "special";
  title: string;
  description: string;
  unlockedDate: string;
  icon: string;
}

export interface ProgressState {
  exerciseStats: {
    pushups: ExerciseStats;
    squats: ExerciseStats;
    situps: ExerciseStats;
    planks: ExerciseStats;
  };
  weeklyStats: WeeklyStats[];
  milestones: MilestoneAchievement[];
  personalRecords: {
    longestStreak: number;
    mostRepsInDay: {
      pushups: number;
      squats: number;
      situps: number;
      planks: number;
    };
    fastestCompletion: number; // minutes
  };
  insights: {
    strongestExercise: keyof ExerciseStats | null;
    mostConsistentDay: string | null; // day of week
    averageCompletionTime: number; // minutes
  };
}

const initialExerciseStats: ExerciseStats = {
  totalReps: 0,
  averageReps: 0,
  bestDay: 0,
  improvementRate: 0,
};

const initialState: ProgressState = {
  exerciseStats: {
    pushups: { ...initialExerciseStats },
    squats: { ...initialExerciseStats },
    situps: { ...initialExerciseStats },
    planks: { ...initialExerciseStats },
  },
  weeklyStats: [],
  milestones: [],
  personalRecords: {
    longestStreak: 0,
    mostRepsInDay: {
      pushups: 0,
      squats: 0,
      situps: 0,
      planks: 0,
    },
    fastestCompletion: 0,
  },
  insights: {
    strongestExercise: null,
    mostConsistentDay: null,
    averageCompletionTime: 0,
  },
};

const progressSlice = createSlice({
  name: "progress",
  initialState,
  reducers: {
    updateExerciseStats: (
      state,
      action: PayloadAction<{
        exercise: keyof ProgressState["exerciseStats"];
        reps: number;
        day: number;
      }>
    ) => {
      const { exercise, reps, day } = action.payload;
      const stats = state.exerciseStats[exercise];

      stats.totalReps += reps;
      stats.bestDay = Math.max(stats.bestDay, reps);

      // Update personal records
      if (exercise === "planks") {
        state.personalRecords.mostRepsInDay[exercise] = Math.max(
          state.personalRecords.mostRepsInDay[exercise],
          reps
        );
      } else {
        state.personalRecords.mostRepsInDay[exercise] = Math.max(
          state.personalRecords.mostRepsInDay[exercise],
          reps
        );
      }
    },

    addMilestone: (state, action: PayloadAction<MilestoneAchievement>) => {
      const milestone = action.payload;
      if (!state.milestones.find((m) => m.id === milestone.id)) {
        state.milestones.push(milestone);
      }
    },

    updateWeeklyStats: (state, action: PayloadAction<WeeklyStats>) => {
      const weekStats = action.payload;
      const existingIndex = state.weeklyStats.findIndex(
        (w) => w.week === weekStats.week
      );

      if (existingIndex >= 0) {
        state.weeklyStats[existingIndex] = weekStats;
      } else {
        state.weeklyStats.push(weekStats);
      }
    },

    updatePersonalRecord: (
      state,
      action: PayloadAction<{
        type: "streak" | "completion";
        value: number;
      }>
    ) => {
      const { type, value } = action.payload;

      if (type === "streak") {
        state.personalRecords.longestStreak = Math.max(
          state.personalRecords.longestStreak,
          value
        );
      } else if (type === "completion") {
        if (state.personalRecords.fastestCompletion === 0) {
          state.personalRecords.fastestCompletion = value;
        } else {
          state.personalRecords.fastestCompletion = Math.min(
            state.personalRecords.fastestCompletion,
            value
          );
        }
      }
    },

    calculateInsights: (state) => {
      // Find strongest exercise (highest average)
      let strongestExercise: keyof ProgressState["exerciseStats"] | null = null;
      let highestAverage = 0;

      Object.entries(state.exerciseStats).forEach(([exercise, stats]) => {
        if (stats.averageReps > highestAverage) {
          highestAverage = stats.averageReps;
          strongestExercise = exercise as keyof ProgressState["exerciseStats"];
        }
      });

      state.insights.strongestExercise = strongestExercise;

      // Calculate average completion time from weekly stats
      if (state.weeklyStats.length > 0) {
        const totalTime = state.weeklyStats.reduce(
          (sum, week) => sum + week.averageCompletion * 30,
          0
        );
        state.insights.averageCompletionTime =
          totalTime / state.weeklyStats.length;
      }
    },

    resetProgress: (state) => {
      return { ...initialState };
    },
  },
});

export const {
  updateExerciseStats,
  addMilestone,
  updateWeeklyStats,
  updatePersonalRecord,
  calculateInsights,
  resetProgress,
} = progressSlice.actions;

export default progressSlice.reducer;
