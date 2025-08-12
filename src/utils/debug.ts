import {
  clearPersistedData,
  getPersistedData,
  hasPersistedData,
} from "../config/persist";
import { store } from "../store";
import {
  getCurrentLocalDateString,
  calculateCurrentChallengeDay,
  logTimezoneInfo,
  getTimeDifferenceDescription,
} from "./dateUtils";
import {
  syncCurrentDay,
  autoSyncCurrentDay,
} from "../store/slices/challengeSlice";

// Debug utilities for development
export const debugUtils = {
  // Clear all persisted data
  clearData: async () => {
    await clearPersistedData();
    console.log("🗑️ All persisted data cleared");
  },

  // View current persisted data
  viewPersistedData: async () => {
    const data = await getPersistedData();
    console.log("📊 Current persisted data:", data);
    return data;
  },

  // Check if data exists
  checkDataExists: async () => {
    const exists = await hasPersistedData();
    console.log("🔍 Persisted data exists:", exists);
    return exists;
  },

  // View current store state
  viewStoreState: () => {
    const state = store.getState();
    console.log("🏪 Current store state:", state);
    return state;
  },

  // Reset to fresh state (for testing)
  resetToFresh: async () => {
    await clearPersistedData();
    // Note: You'll need to restart the app for this to take effect
    console.log("🔄 Data cleared. Restart the app to see fresh state.");
  },

  // Log user progress summary
  logProgressSummary: () => {
    const state = store.getState();
    const { user, challenge } = state;

    console.log("📈 Progress Summary:");
    console.log("- User onboarded:", user.isOnboarded);
    console.log("- Challenge active:", challenge.isActive);
    console.log("- Current day:", challenge.currentDay);
    console.log("- Current streak:", challenge.currentStreak);
    console.log("- Total days completed:", challenge.totalDaysCompleted);
    console.log("- Baselines:", challenge.baselines);

    return {
      user: {
        isOnboarded: user.isOnboarded,
        hasCompletedFirstChallenge: user.hasCompletedFirstChallenge,
        totalChallengesCompleted: user.totalChallengesCompleted,
        achievements: user.achievements,
      },
      challenge: {
        isActive: challenge.isActive,
        currentDay: challenge.currentDay,
        currentStreak: challenge.currentStreak,
        totalDaysCompleted: challenge.totalDaysCompleted,
        baselines: challenge.baselines,
      },
    };
  },

  // Timezone and date debugging functions
  logTimezoneInfo: () => {
    logTimezoneInfo();
  },

  getCurrentDate: () => {
    const date = getCurrentLocalDateString();
    console.log("📅 Current local date:", date);
    return date;
  },

  calculateChallengeDay: (startDate?: string) => {
    const state = store.getState();
    const challengeStartDate = startDate || state.challenge.startDate;

    if (!challengeStartDate) {
      console.log("❌ No start date available");
      return null;
    }

    const currentDay = calculateCurrentChallengeDay(challengeStartDate);
    const timeDiff = getTimeDifferenceDescription(challengeStartDate);

    console.log("📊 Challenge Day Calculation:");
    console.log("- Start date:", challengeStartDate);
    console.log("- Current day:", currentDay);
    console.log("- Time difference:", timeDiff);

    return { startDate: challengeStartDate, currentDay, timeDiff };
  },

  syncCurrentDay: () => {
    console.log("🔄 Manually syncing current day...");
    store.dispatch(syncCurrentDay());
  },

  autoSyncCurrentDay: () => {
    console.log("🔄 Auto-syncing current day...");
    store.dispatch(autoSyncCurrentDay());
  },

  testTimezoneChange: () => {
    console.log("🧪 Testing timezone change scenario...");
    console.log("This simulates what happens when:");
    console.log("- User travels to different timezone");
    console.log("- DST begins/ends");
    console.log("- Device timezone settings change");

    const state = store.getState();
    if (state.challenge.startDate) {
      debugUtils.calculateChallengeDay();
      debugUtils.autoSyncCurrentDay();
      debugUtils.logProgressSummary();
    } else {
      console.log("❌ No active challenge to test with");
    }
  },
};

// Make debug utils available globally in development
if (__DEV__) {
  (global as any).debugUtils = debugUtils;
  console.log("🛠️ Debug utils available globally as debugUtils");
  console.log("Available methods:");
  console.log("- debugUtils.clearData()");
  console.log("- debugUtils.viewPersistedData()");
  console.log("- debugUtils.checkDataExists()");
  console.log("- debugUtils.viewStoreState()");
  console.log("- debugUtils.resetToFresh()");
  console.log("- debugUtils.logProgressSummary()");
  console.log("- debugUtils.logTimezoneInfo()");
  console.log("- debugUtils.getCurrentDate()");
  console.log("- debugUtils.calculateChallengeDay()");
  console.log("- debugUtils.syncCurrentDay()");
  console.log("- debugUtils.autoSyncCurrentDay()");
  console.log("- debugUtils.testTimezoneChange()");
}

export default debugUtils;
