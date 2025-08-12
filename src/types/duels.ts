export type ExerciseType = "pushups" | "squats" | "situps" | "planks";
export type DuelType = "max_reps" | "max_hold";
export type TimeWindow = "10min" | "30min" | "24hours";
export type DuelStatus = "waiting" | "active" | "completed" | "expired";

export interface DuelSettings {
  exercise: ExerciseType;
  type: DuelType;
  timeWindow: TimeWindow;
  isPublic: boolean;
  friendCode?: string;
}

export interface DuelAttempt {
  userId: string;
  username: string;
  score: number; // reps or seconds
  timestamp: string;
  duration: number; // time taken to complete
  proofNote?: string;
  verified: boolean;
  quality?: number; // AI quality score (placeholder)
}

export interface Duel {
  id: string;
  hostId: string;
  hostUsername: string;
  guestId?: string;
  guestUsername?: string;
  settings: DuelSettings;
  status: DuelStatus;
  createdAt: string;
  expiresAt: string;
  hostAttempt?: DuelAttempt;
  guestAttempt?: DuelAttempt;
  winnerId?: string;
  ratingChanges?: {
    host: number;
    guest: number;
  };
}

export interface OMRRating {
  pushups: number;
  squats: number;
  situps: number;
  planks: number;
  gamesPlayed: {
    pushups: number;
    squats: number;
    situps: number;
    planks: number;
  };
}

export interface DuelHistory {
  duelId: string;
  opponentUsername: string;
  exercise: ExerciseType;
  myScore: number;
  opponentScore: number;
  won: boolean;
  ratingChange: number;
  completedAt: string;
}

export interface SeasonalBadge {
  season: string;
  rank: "top1" | "top10" | "top25";
  exercise: ExerciseType;
  finalRating: number;
}

// Utility functions
export const getTimeWindowMs = (window: TimeWindow): number => {
  switch (window) {
    case "10min":
      return 10 * 60 * 1000;
    case "30min":
      return 30 * 60 * 1000;
    case "24hours":
      return 24 * 60 * 60 * 1000;
  }
};

export const getTimeWindowLabel = (window: TimeWindow): string => {
  switch (window) {
    case "10min":
      return "10 minutes";
    case "30min":
      return "30 minutes";
    case "24hours":
      return "24 hours";
  }
};

export const getDuelTypeLabel = (type: DuelType): string => {
  switch (type) {
    case "max_reps":
      return "Max Reps";
    case "max_hold":
      return "Max Hold";
  }
};

export const getExerciseLabel = (exercise: ExerciseType): string => {
  switch (exercise) {
    case "pushups":
      return "Push-ups";
    case "squats":
      return "Squats";
    case "situps":
      return "Sit-ups";
    case "planks":
      return "Plank";
  }
};

export const getExerciseEmoji = (exercise: ExerciseType): string => {
  switch (exercise) {
    case "pushups":
      return "💪";
    case "squats":
      return "🦵";
    case "situps":
      return "🔥";
    case "planks":
      return "⏱️";
  }
};
