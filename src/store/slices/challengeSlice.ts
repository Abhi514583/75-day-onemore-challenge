import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import NotificationService from "../../services/NotificationService";
import AchievementService from "../../services/AchievementService";
import {
  CHALLENGE_CONFIG,
  isChallengeMilestone,
  isChallengeComplete,
} from "../../config/challenge";
import {
  getCurrentLocalDateString,
  calculateCurrentChallengeDay,
  isYesterday,
  isChallengeCompleted,
  logTimezoneInfo,
} from "../../utils/dateUtils";

export interface ExerciseBaseline {
  pushups: number;
  squats: number;
  situps: number;
  planks: number; // in seconds
}

export interface DailyProgress {
  date: string; // YYYY-MM-DD format
  day: number; // 1+ (no upper limit for lifelong challenge)
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
  currentDay: number; // 1+ (no upper limit for lifelong challenge)
  baselines: ExerciseBaseline;
  currentStreak: number;
  bestStreak: number;
  totalDaysCompleted: number;
  dailyProgress: Record<string, DailyProgress>; // date -> progress
  lastCompletedDate: string | null;
  challengeCompleted: boolean; // Always false for lifelong challenge
  freezeTokensRemaining: number;
  lastFreezeTokenDate: string | null;
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
  freezeTokensRemaining: 1,
  lastFreezeTokenDate: null,
};

const challengeSlice = createSlice({
  name: "challenge",
  initialState,
  reducers: {
    startChallenge: (state, action: PayloadAction<ExerciseBaseline>) => {
      const today = getCurrentLocalDateString();

      console.log("🚀 Starting challenge on:", today);
      logTimezoneInfo();

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
      const today = getCurrentLocalDateString();
      const { exerciseType, actualCount } = action.payload;

      // Sync current day first to ensure we're working with the correct day
      if (state.startDate) {
        const correctCurrentDay = calculateCurrentChallengeDay(state.startDate);
        if (correctCurrentDay !== state.currentDay) {
          console.log(
            `📅 Syncing current day from ${state.currentDay} to ${correctCurrentDay}`
          );
          state.currentDay = correctCurrentDay;
        }
      }

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

        // Update streak using timezone-safe yesterday check
        if (
          (state.lastCompletedDate && isYesterday(state.lastCompletedDate)) ||
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

        // Trigger milestone notifications for significant days
        if (isChallengeMilestone(state.currentDay)) {
          NotificationService.scheduleMilestoneCelebration(state.currentDay);
        }

        // Check and unlock achievements
        const todayExercises = {
          pushups: todayProgress.exercises.pushups.actualReps,
          squats: todayProgress.exercises.squats.actualReps,
          situps: todayProgress.exercises.situps.actualReps,
          planks: todayProgress.exercises.planks.actualSeconds,
        };

        AchievementService.checkAchievements({
          currentDay: state.currentDay,
          currentStreak: state.currentStreak,
          bestStreak: state.bestStreak,
          totalDaysCompleted: state.totalDaysCompleted,
          lastWorkoutTime: new Date().toISOString(),
          todayExercises,
        });

        // Special milestone celebrations
        if (
          state.currentDay === CHALLENGE_CONFIG.ACHIEVEMENTS.WARRIOR_THRESHOLD
        ) {
          NotificationService.scheduleAchievementUnlock({
            title: "Fitness Warrior",
            description: `Completed ${CHALLENGE_CONFIG.ACHIEVEMENTS.WARRIOR_THRESHOLD} days of the OneMore challenge!`,
            icon: "🏆",
          });
        }

        if (
          state.currentDay === CHALLENGE_CONFIG.ACHIEVEMENTS.CHAMPION_THRESHOLD
        ) {
          NotificationService.scheduleAchievementUnlock({
            title: "Challenge Champion",
            description: `Completed ${CHALLENGE_CONFIG.ACHIEVEMENTS.CHAMPION_THRESHOLD} days of the OneMore challenge!`,
            icon: "👑",
          });
        } else if (state.currentDay === 365) {
          NotificationService.scheduleAchievementUnlock({
            title: "One Year Strong",
            description: "Completed a full year of the OneMore challenge!",
            icon: "👑",
          });
        } else if (state.currentDay === 1000) {
          NotificationService.scheduleAchievementUnlock({
            title: "Legendary Dedication",
            description: "Completed 1000 days of the OneMore challenge!",
            icon: "🌟",
          });
        }
      }
    },

    advanceDay: (state) => {
      // This action is now deprecated in favor of automatic day sync
      // But kept for backward compatibility
      console.warn("⚠️ advanceDay is deprecated. Use syncCurrentDay instead.");

      if (state.startDate) {
        const correctCurrentDay = calculateCurrentChallengeDay(state.startDate);
        state.currentDay = correctCurrentDay;

        const today = getCurrentLocalDateString();
        if (!state.dailyProgress[today]) {
          state.dailyProgress[today] = createDailyProgress(
            today,
            state.currentDay,
            state.baselines
          );
        }
      }
    },

    resetChallenge: (state) => {
      return { ...initialState };
    },

    updateBaselines: (state, action: PayloadAction<ExerciseBaseline>) => {
      state.baselines = action.payload;

      // Recalculate current day's targets if challenge is active
      if (state.isActive && state.startDate) {
        // Sync current day first
        state.currentDay = calculateCurrentChallengeDay(state.startDate);

        const today = getCurrentLocalDateString();
        if (state.dailyProgress[today]) {
          state.dailyProgress[today] = createDailyProgress(
            today,
            state.currentDay,
            state.baselines
          );
        }
      }
    },

    useFreezeToken: (state) => {
      if (state.freezeTokensRemaining > 0) {
        state.freezeTokensRemaining -= 1;
        state.lastFreezeTokenDate = new Date().toISOString();
        // Preserve streak without completing exercises
        const today = new Date().toISOString().split("T")[0];
        state.lastCompletedDate = today;
        console.log("❄️ Freeze token used. Streak preserved for today.");
      }
    },

    // Timezone-safe day sync - handles DST and timezone changes
    syncCurrentDay: (state) => {
      if (!state.startDate || !state.isActive) {
        console.log("⚠️ Cannot sync day: no start date or inactive challenge");
        return;
      }

      const oldCurrentDay = state.currentDay;
      const newCurrentDay = calculateCurrentChallengeDay(state.startDate);

      console.log("📅 Syncing current day...");
      console.log(`- Start date: ${state.startDate}`);
      console.log(`- Old current day: ${oldCurrentDay}`);
      console.log(`- New current day: ${newCurrentDay}`);

      logTimezoneInfo();

      state.currentDay = newCurrentDay;

      // Initialize today's progress if it doesn't exist
      const today = getCurrentLocalDateString();
      if (!state.dailyProgress[today]) {
        console.log(
          `📝 Creating progress entry for ${today} (day ${newCurrentDay})`
        );
        state.dailyProgress[today] = createDailyProgress(
          today,
          state.currentDay,
          state.baselines
        );
      }

      // Lifelong challenge never completes - always stays active

      if (oldCurrentDay !== newCurrentDay) {
        console.log(`✅ Day synced from ${oldCurrentDay} to ${newCurrentDay}`);
      } else {
        console.log("✅ Day already in sync");
      }
    },

    // Auto-sync current day (called on app focus/resume)
    autoSyncCurrentDay: (state) => {
      if (!state.startDate || !state.isActive) return;

      const correctCurrentDay = calculateCurrentChallengeDay(state.startDate);

      // Only log if there's a change to avoid spam
      if (correctCurrentDay !== state.currentDay) {
        console.log(
          `🔄 Auto-syncing day from ${state.currentDay} to ${correctCurrentDay}`
        );
        state.currentDay = correctCurrentDay;

        // Initialize today's progress if needed
        const today = getCurrentLocalDateString();
        if (!state.dailyProgress[today]) {
          state.dailyProgress[today] = createDailyProgress(
            today,
            state.currentDay,
            state.baselines
          );
        }

        // Lifelong challenge never completes - always stays active
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
  useFreezeToken,
  syncCurrentDay,
  autoSyncCurrentDay,
} = challengeSlice.actions;

export default challengeSlice.reducer;
