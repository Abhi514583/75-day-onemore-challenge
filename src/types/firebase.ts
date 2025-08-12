import { Timestamp } from "firebase/firestore";

// Exercise types
export type ExerciseType = "pushups" | "squats" | "situps" | "planks";
export type ExerciseMode = "challenge" | "pb" | "duel";
export type AttemptSource = "manual" | "ai";

// User types
export interface User {
  username: string;
  avatarUrl: string;
  omrRatings: {
    pushups: number; // default 1200
    squats: number; // default 1200
    situps: number; // default 1200
    planks: number; // default 1200
  };
  xp: number;
  levels: {
    pushups: number;
    squats: number;
    situps: number;
    planks: number;
    global: number;
  };
  baselines: {
    pushups: number;
    squats: number;
    situps: number;
    planks: number;
  };
  freezeTokens: number;
  badges: string[];
  fcmToken: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Attempt types
export interface Attempt {
  exercise: ExerciseType;
  mode: ExerciseMode;
  score: number; // reps or seconds
  sets: number[]; // for challenge multi-set
  isPB: boolean;
  source: AttemptSource;
  quality: number | null; // AI analysis later
  clientAt: Timestamp; // client local time for UX
  serverAt: Timestamp; // server timestamp set by Cloud Function
  notes?: string;
}

// Duel types
export type DuelStatus = "pending" | "active" | "completed" | "forfeit";
export type MatchType = "public" | "friend";
export type TieBreaker = "quality" | "speed" | "coin" | null;

export interface DuelParticipant {
  uid: string;
  username: string;
}

export interface Duel {
  exercise: ExerciseType;
  matchType: MatchType;
  windowSec: number; // 600|1800|86400 (10min|30min|24hr)
  host: DuelParticipant;
  guest: DuelParticipant | null;
  status: DuelStatus;
  hostScore: number | null;
  guestScore: number | null;
  winnerUid: string | null;
  tieBreaker: TieBreaker;
  seasonId: string;
  createdAt: Timestamp;
  activatedAt: Timestamp;
  completedAt: Timestamp;
}

// Leaderboard types
export interface LeaderboardRanking {
  username: string;
  omr: number; // OMR rating
  wins: number;
  losses: number;
  updatedAt: Timestamp;
}

// Personal Best types
export interface PersonalBest {
  value: number; // reps or seconds
  achievedAt: Timestamp;
  source: AttemptSource | "duel";
}

// Challenge Day types
export interface ExerciseProgress {
  target: number;
  completed: number;
}

export interface ChallengeDay {
  exercises: {
    pushups: ExerciseProgress;
    squats: ExerciseProgress;
    situps: ExerciseProgress;
    planks: ExerciseProgress;
  };
  completedAt: Timestamp | null;
  lightened: boolean;
  earnedXP: number;
}

// Proof Video types
export interface ProofVideo {
  storagePath: string; // duels/{duelId}/{uid}/proof.mp4
  uploadedAt: Timestamp;
  fileSize: number;
  duration: number;
  thumbnailUrl?: string;
}

// Utility types
export interface FirebaseError {
  code: string;
  message: string;
}

export interface SyncResult {
  success: boolean;
  error?: FirebaseError;
  conflictsResolved?: number;
}

export interface QueueStatus {
  pending: number;
  failed: number;
  lastSync?: Timestamp;
}
