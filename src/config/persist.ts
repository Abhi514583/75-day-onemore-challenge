import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersistConfig } from "redux-persist";
import { RootState } from "../store";

// Current version of the persisted state schema
const CURRENT_VERSION = 1;

// Migration functions for different versions
const migrations = {
  // Migration from version 0 (no version) to version 1
  0: (state: any) => {
    console.log("🔄 Migrating from version 0 to 1");
    return {
      ...state,
      _persist: {
        ...state._persist,
        version: 1,
      },
      // Add any new fields or transform existing ones
      user: {
        ...state.user,
        // Ensure all required fields exist
        isOnboarded: state.user?.isOnboarded ?? false,
        hasCompletedFirstChallenge:
          state.user?.hasCompletedFirstChallenge ?? false,
        isPremium: state.user?.isPremium ?? false,
        totalChallengesCompleted: state.user?.totalChallengesCompleted ?? 0,
        achievements: state.user?.achievements ?? [],
        preferences: {
          notifications: {
            enabled: true,
            reminderTime: "09:00",
            streakReminders: true,
            milestoneAlerts: true,
            ...state.user?.preferences?.notifications,
          },
          privacy: {
            shareProgress: true,
            allowAnalytics: true,
            ...state.user?.preferences?.privacy,
          },
          display: {
            theme: "auto",
            units: "metric",
            ...state.user?.preferences?.display,
          },
          ...state.user?.preferences,
        },
        profile: {
          fitnessLevel: "beginner",
          ...state.user?.profile,
        },
      },
      challenge: {
        ...state.challenge,
        // Ensure all required fields exist
        isActive: state.challenge?.isActive ?? false,
        startDate: state.challenge?.startDate ?? null,
        currentDay: state.challenge?.currentDay ?? 1,
        baselines: {
          pushups: 10,
          squats: 15,
          situps: 10,
          planks: 30,
          ...state.challenge?.baselines,
        },
        currentStreak: state.challenge?.currentStreak ?? 0,
        bestStreak: state.challenge?.bestStreak ?? 0,
        totalDaysCompleted: state.challenge?.totalDaysCompleted ?? 0,
        dailyProgress: state.challenge?.dailyProgress ?? {},
        lastCompletedDate: state.challenge?.lastCompletedDate ?? null,
        challengeCompleted: state.challenge?.challengeCompleted ?? false,
      },
    };
  },
  // Add future migrations here
  // 1: (state: any) => { /* migration from v1 to v2 */ },
  // 2: (state: any) => { /* migration from v2 to v3 */ },
};

// Custom migration function
const migrate = (state: any): Promise<any> => {
  return new Promise((resolve) => {
    try {
      console.log("🔍 Checking for state migrations...");

      if (!state) {
        console.log("📝 No existing state found, starting fresh");
        resolve(undefined);
        return;
      }

      const currentVersion = state._persist?.version ?? 0;
      console.log(
        `📊 Current state version: ${currentVersion}, Target version: ${CURRENT_VERSION}`
      );

      if (currentVersion >= CURRENT_VERSION) {
        console.log("✅ State is up to date, no migration needed");
        resolve(state);
        return;
      }

      let migratedState = state;

      // Apply migrations sequentially
      for (let version = currentVersion; version < CURRENT_VERSION; version++) {
        if (migrations[version as keyof typeof migrations]) {
          console.log(
            `🔄 Applying migration from version ${version} to ${version + 1}`
          );
          migratedState =
            migrations[version as keyof typeof migrations](migratedState);
        }
      }

      // Update the version
      migratedState._persist = {
        ...migratedState._persist,
        version: CURRENT_VERSION,
      };

      console.log("✅ Migration completed successfully");
      resolve(migratedState);
    } catch (error) {
      console.error("❌ Migration failed:", error);
      // In case of migration failure, start fresh
      console.log("🔄 Starting with fresh state due to migration error");
      resolve(undefined);
    }
  });
};

// Transform functions for data sanitization
const transforms = [
  // Add any transforms here if needed
  // For example, to encrypt sensitive data or clean up invalid values
];

// Main persist configuration
export const persistConfig: PersistConfig<RootState> = {
  key: "root",
  version: CURRENT_VERSION,
  storage: AsyncStorage,
  migrate,
  transforms,
  // Optionally blacklist certain reducers or keys
  // blacklist: ['someTemporaryData'],
  // whitelist: ['user', 'challenge'], // Only persist these reducers

  // Debug options (disable in production)
  debug: __DEV__,

  // Throttle writes to storage (in ms)
  throttle: 1000,

  // Serialize/deserialize options
  serialize: true,

  // Timeout for rehydration
  timeout: 10000,
};

// Helper function to clear persisted data (for development/testing)
export const clearPersistedData = async (): Promise<void> => {
  try {
    console.log("🗑️ Clearing persisted data...");
    await AsyncStorage.removeItem("persist:root");
    console.log("✅ Persisted data cleared successfully");
  } catch (error) {
    console.error("❌ Failed to clear persisted data:", error);
  }
};

// Helper function to get current persisted data (for debugging)
export const getPersistedData = async (): Promise<any> => {
  try {
    const data = await AsyncStorage.getItem("persist:root");
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("❌ Failed to get persisted data:", error);
    return null;
  }
};

// Helper function to check if data exists
export const hasPersistedData = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem("persist:root");
    return data !== null;
  } catch (error) {
    console.error("❌ Failed to check persisted data:", error);
    return false;
  }
};

export default persistConfig;
