import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UserPreferences {
  notifications: {
    enabled: boolean;
    reminderTime: string; // HH:MM format
    streakReminders: boolean;
    milestoneAlerts: boolean;
  };
  privacy: {
    shareProgress: boolean;
    allowAnalytics: boolean;
  };
  display: {
    theme: "light" | "dark" | "auto";
    units: "metric" | "imperial";
  };
}

export interface UserState {
  isOnboarded: boolean;
  hasCompletedFirstChallenge: boolean;
  isPremium: boolean;
  preferences: UserPreferences;
  profile: {
    name?: string;
    age?: number;
    fitnessLevel: "beginner" | "intermediate" | "advanced";
  };
  achievements: string[]; // Achievement IDs
  totalChallengesCompleted: number;
  xp: number;
  level: number;
  personalBests: {
    pushups: number;
    squats: number;
    situps: number;
    planks: number;
    pushupsDate: string;
    squatsDate: string;
    situpsDate: string;
    planksDate: string;
  };
}

const initialState: UserState = {
  isOnboarded: false,
  hasCompletedFirstChallenge: false,
  isPremium: false,
  preferences: {
    notifications: {
      enabled: true,
      reminderTime: "09:00",
      streakReminders: true,
      milestoneAlerts: true,
    },
    privacy: {
      shareProgress: true,
      allowAnalytics: true,
    },
    display: {
      theme: "auto",
      units: "metric",
    },
  },
  profile: {
    fitnessLevel: "beginner",
  },
  achievements: [],
  totalChallengesCompleted: 0,
  xp: 0,
  level: 1,
  personalBests: {
    pushups: 0,
    squats: 0,
    situps: 0,
    planks: 0,
    pushupsDate: "",
    squatsDate: "",
    situpsDate: "",
    planksDate: "",
  },
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    completeOnboarding: (
      state,
      action: PayloadAction<{
        name?: string;
        age?: number;
        fitnessLevel: "beginner" | "intermediate" | "advanced";
      }>
    ) => {
      state.isOnboarded = true;
      state.profile = { ...state.profile, ...action.payload };
    },

    updatePreferences: (
      state,
      action: PayloadAction<Partial<UserPreferences>>
    ) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },

    updateProfile: (
      state,
      action: PayloadAction<Partial<UserState["profile"]>>
    ) => {
      state.profile = { ...state.profile, ...action.payload };
    },

    unlockPremium: (state) => {
      state.isPremium = true;
    },

    addAchievement: (state, action: PayloadAction<string>) => {
      if (!state.achievements.includes(action.payload)) {
        state.achievements.push(action.payload);
      }
    },

    completeChallengeAchievement: (state) => {
      state.hasCompletedFirstChallenge = true;
      state.totalChallengesCompleted += 1;
    },

    updatePersonalBest: (
      state,
      action: PayloadAction<{
        exercise: "pushups" | "squats" | "situps" | "planks";
        value: number;
      }>
    ) => {
      const { exercise, value } = action.payload;
      if (value > state.personalBests[exercise]) {
        state.personalBests[exercise] = value;
        state.personalBests[
          `${exercise}Date` as keyof typeof state.personalBests
        ] = new Date().toISOString();
        // Award XP for new PB
        state.xp += 100;
        // Level up if needed
        const newLevel = Math.floor(state.xp / 1000) + 1;
        if (newLevel > state.level) {
          state.level = newLevel;
        }
      }
    },

    awardXP: (state, action: PayloadAction<number>) => {
      state.xp += action.payload;
      const newLevel = Math.floor(state.xp / 1000) + 1;
      if (newLevel > state.level) {
        state.level = newLevel;
      }
    },

    resetUserData: (state) => {
      return { ...initialState };
    },
  },
});

export const {
  completeOnboarding,
  updatePreferences,
  updateProfile,
  unlockPremium,
  addAchievement,
  completeChallengeAchievement,
  updatePersonalBest,
  awardXP,
  resetUserData,
} = userSlice.actions;

export default userSlice.reducer;
