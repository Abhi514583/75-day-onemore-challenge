import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ExerciseBaseline {
  pushups: number;
  squats: number;
  situps: number;
  planks: number; // in seconds
}

export interface DailyProgress {
  date: string; // YYYY-MM-DD format
  day: number; // 1-75
  exercises: {
    pushups: { target: number; completed: boolean; actualReps?: number };
    squats: { target: number; completed: boolean; actualReps?: number };
    situps: { target: number; completed: boolean; actualReps?: number };
    planks: { target: number; completed: boolean; actualSeconds?: number };
  };
  allCompleted: boolean;
}

export interface ChallengeState {
  isActive: boolean;
  startDate: string | null; // YYYY-MM-DD format
  currentDay: number; // 1-75
  baselines: ExerciseBaseline;
  currentStreak: number;
  bestStreak: number;
  totalDaysCompleted: number;
  dailyProgress: Record<string, DailyProgress>; // date -> progress
  lastCompletedDate: string | null;
  challengeCompleted: boolean;
}

const initialState: ChallengeState = {
  isActive: false,
  startDate: null,
  currentDay: 1,
  baselines: {
    pushups: 10,
    squats: 15,
    situps: 10,
    planks: 30,
  },
  currentStreak: 0,
  bestStreak: 0,
  totalDaysCompleted: 0,
  dailyProgress: {},
  lastCompletedDate: null,
  challengeCompleted: false,
};

const challengeSlice = createSlice({
  name: "challenge",
  initialState,
  reducers: {
    startChallenge: (state, action: PayloadAction<ExerciseBaseline>) => {
      const today = new Date().toISOString().split("T")[0];
      state.isActive = true;
      state.startDate = today;
      state.currentDay = 1;
      state.baselines = action.payload;
      state.currentStreak = 0;
      state.bestStreak = 0;
      state.totalDaysCompleted = 0;
      state.dailyProgress = {};
      state.lastCompletedDate = null;
      state.challengeCompleted = false;

      // Initialize today's progress
      state.dailyProgress[today] = createDailyProgress(
        today,
        1,
        state.baselines
      );
    },

    completeExercise: (
      state,
      action: PayloadAction<{
        exerciseType: keyof ExerciseBaseline;
        actualCount: number;
      }>
    ) => {
      const today = new Date().toISOString().split("T")[0];
      const { exerciseType, actualCount } = action.payload;

      // Ensure today's progress exists
      if (!state.dailyProgress[today]) {
        state.dailyProgress[today] = createDailyProgress(
          today,
          state.currentDay,
          state.baselines
        );
      }

      const todayProgress = state.dailyProgress[today];

      // Mark exercise as completed
      if (exerciseType === "planks") {
        todayProgress.exercises[exerciseType].completed = true;
        todayProgress.exercises[exerciseType].actualSeconds = actualCount;
      } else {
        todayProgress.exercises[exerciseType].completed = true;
        todayProgress.exercises[exerciseType].actualReps = actualCount;
      }

      // Check if all exercises are completed
      const allCompleted = Object.values(todayProgress.exercises).every(
        (ex) => ex.completed
      );
      todayProgress.allCompleted = allCompleted;

      if (allCompleted && state.lastCompletedDate !== today) {
        // Day completed for the first time
        state.lastCompletedDate = today;
        state.totalDaysCompleted += 1;

        // Update streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (
          state.lastCompletedDate === yesterdayStr ||
          state.currentStreak === 0
        ) {
          state.currentStreak += 1;
        } else {
          state.currentStreak = 1; // Reset streak
        }

        // Update best streak
        if (state.currentStreak > state.bestStreak) {
          state.bestStreak = state.currentStreak;
        }

        // Check if challenge is completed
        if (state.currentDay >= 75) {
          state.challengeCompleted = true;
        }
      }
    },

    advanceDay: (state) => {
      if (state.currentDay < 75) {
        state.currentDay += 1;
        const today = new Date().toISOString().split("T")[0];

        // Initialize new day's progress
        state.dailyProgress[today] = createDailyProgress(
          today,
          state.currentDay,
          state.baselines
        );
      }
    },

    resetChallenge: (state) => {
      return { ...initialState };
    },

    updateBaselines: (state, action: PayloadAction<ExerciseBaseline>) => {
      state.baselines = action.payload;

      // Recalculate current day's targets if challenge is active
      if (state.isActive) {
        const today = new Date().toISOString().split("T")[0];
        if (state.dailyProgress[today]) {
          state.dailyProgress[today] = createDailyProgress(
            today,
            state.currentDay,
            state.baselines
          );
        }
      }
    },

    // Manual day sync for testing or corrections
    syncCurrentDay: (state) => {
      if (!state.startDate || !state.isActive) return;

      const startDate = new Date(state.startDate);
      const today = new Date();
      const diffTime = today.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

      state.currentDay = Math.min(diffDays, 75);

      const todayStr = today.toISOString().split("T")[0];
      if (!state.dailyProgress[todayStr]) {
        state.dailyProgress[todayStr] = createDailyProgress(
          todayStr,
          state.currentDay,
          state.baselines
        );
      }
    },
  },
});

// Helper function to create daily progress
function createDailyProgress(
  date: string,
  day: number,
  baselines: ExerciseBaseline
): DailyProgress {
  return {
    date,
    day,
    exercises: {
      pushups: {
        target: baselines.pushups + (day - 1),
        completed: false,
      },
      squats: {
        target: baselines.squats + (day - 1),
        completed: false,
      },
      situps: {
        target: baselines.situps + (day - 1),
        completed: false,
      },
      planks: {
        target: baselines.planks + (day - 1) * 5, // +5 seconds per day
        completed: false,
      },
    },
    allCompleted: false,
  };
}

export const {
  startChallenge,
  completeExercise,
  advanceDay,
  resetChallenge,
  updateBaselines,
  syncCurrentDay,
} = challengeSlice.actions;

export default challengeSlice.reducer;
