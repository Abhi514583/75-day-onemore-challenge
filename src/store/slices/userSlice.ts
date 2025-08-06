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
  resetUserData,
} = userSlice.actions;

export default userSlice.reducer;
