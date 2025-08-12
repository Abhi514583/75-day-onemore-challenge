/**
 * Unified type definitions for the duel system
 * These types work with both mock data and Firebase data
 */

export type ExerciseType = "pushups" | "squats" | "situps" | "planks";
export type DuelStatus =
  | "pending"
  | "active"
  | "completed"
  | "forfeit"
  | "expired";
export type MatchType = "public" | "friend";
export type TieBreaker = "quality" | "speed" | "coin" | null;

export interface DuelParticipant {
  uid: string;
  username: string;
}

/**
 * Unified Duel interface that works with both local and Firebase data
 */
export interface UnifiedDuel {
  id: string;
  exercise: ExerciseType;
  status: DuelStatus;
  host: DuelParticipant;
  guest?: DuelParticipant | null;
  hostScore?: number | null;
  guestScore?: number | null;
  winnerUid?: string | null;
  tieBreaker?: TieBreaker;
  windowSec: number;
  matchType: MatchType;
  createdAt: number; // Unix timestamp
  activatedAt?: number; // Unix timestamp
  completedAt?: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (calculated from createdAt + windowSec)
  seasonId?: string;
}

/**
 * Configuration for creating a new duel
 */
export interface DuelConfig {
  exercise: ExerciseType;
  matchType: MatchType;
  windowSec: number;
  opponentId?: string; // For friend duels
}

/**
 * Result types for duel operations
 */
export interface DuelResult {
  success: boolean;
  duel?: UnifiedDuel;
  error?: string;
}

export interface DuelCreateResult extends DuelResult {
  duelId?: string;
}

export interface DuelJoinResult extends DuelResult {}

export interface DuelSubmitResult extends DuelResult {
  isComplete?: boolean;
  winner?: string;
}

/**
 * Matchmaking criteria for finding available duels
 */
export interface MatchmakingCriteria {
  exercise: ExerciseType;
  ratingRange?: number; // +/- rating difference allowed
  maxWaitTime?: number; // seconds to wait for match
}

/**
 * Data source types
 */
export type DataSource = "mock" | "firebase";

/**
 * Duel update callback type
 */
export type DuelUpdateCallback = (duel: UnifiedDuel | null) => void;

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;
