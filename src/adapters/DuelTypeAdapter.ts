/**
 * Type adapters for converting between different duel formats
 */

import { UnifiedDuel, DuelParticipant } from "../types/unified";
import { Duel as FirebaseDuel, Timestamp } from "../types/firebase";
import { Duel as LocalDuel } from "../types/duels";

/**
 * Converts Firebase Duel to Unified Duel format
 */
export const firebaseToUnified = (
  firebaseDuel: FirebaseDuel & { id: string }
): UnifiedDuel => {
  const createdAtMs =
    typeof firebaseDuel.createdAt === "object" &&
    firebaseDuel.createdAt.toMillis
      ? firebaseDuel.createdAt.toMillis()
      : (firebaseDuel.createdAt as number);

  const activatedAtMs = firebaseDuel.activatedAt
    ? typeof firebaseDuel.activatedAt === "object" &&
      firebaseDuel.activatedAt.toMillis
      ? firebaseDuel.activatedAt.toMillis()
      : (firebaseDuel.activatedAt as number)
    : undefined;

  const completedAtMs = firebaseDuel.completedAt
    ? typeof firebaseDuel.completedAt === "object" &&
      firebaseDuel.completedAt.toMillis
      ? firebaseDuel.completedAt.toMillis()
      : (firebaseDuel.completedAt as number)
    : undefined;

  return {
    id: firebaseDuel.id,
    exercise: firebaseDuel.exercise,
    status: firebaseDuel.status,
    host: firebaseDuel.host,
    guest: firebaseDuel.guest,
    hostScore: firebaseDuel.hostScore,
    guestScore: firebaseDuel.guestScore,
    winnerUid: firebaseDuel.winnerUid,
    tieBreaker: firebaseDuel.tieBreaker,
    windowSec: firebaseDuel.windowSec,
    matchType: firebaseDuel.matchType,
    createdAt: createdAtMs,
    activatedAt: activatedAtMs,
    completedAt: completedAtMs,
    expiresAt: createdAtMs + firebaseDuel.windowSec * 1000,
    seasonId: firebaseDuel.seasonId,
  };
};

/**
 * Converts Local Duel to Unified Duel format
 */
export const localToUnified = (localDuel: LocalDuel): UnifiedDuel => {
  // Convert local duel format to unified format
  const hostParticipant: DuelParticipant = {
    uid: localDuel.hostId,
    username: localDuel.hostUsername,
  };

  const guestParticipant: DuelParticipant | undefined = localDuel.guestId
    ? {
        uid: localDuel.guestId,
        username: localDuel.guestUsername || "Unknown",
      }
    : undefined;

  // Convert time window to seconds
  const windowSec = convertTimeWindowToSeconds(localDuel.settings.timeWindow);

  // Convert timestamps
  const createdAt = new Date(localDuel.createdAt).getTime();
  const activatedAt = localDuel.activatedAt
    ? new Date(localDuel.activatedAt).getTime()
    : undefined;
  const completedAt = localDuel.completedAt
    ? new Date(localDuel.completedAt).getTime()
    : undefined;

  // Map status
  const status = mapLocalStatusToUnified(localDuel.status);

  return {
    id: localDuel.id,
    exercise: localDuel.settings.exercise,
    status,
    host: hostParticipant,
    guest: guestParticipant,
    hostScore: localDuel.hostAttempt?.score,
    guestScore: localDuel.guestAttempt?.score,
    winnerUid: localDuel.winnerId,
    tieBreaker: null, // Local duels don't have tie breaker info
    windowSec,
    matchType: localDuel.settings.isPublic ? "public" : "friend",
    createdAt,
    activatedAt,
    completedAt,
    expiresAt: createdAt + windowSec * 1000,
  };
};

/**
 * Converts Unified Duel to Firebase Duel format (for saving)
 */
export const unifiedToFirebase = (unifiedDuel: UnifiedDuel): FirebaseDuel => {
  return {
    exercise: unifiedDuel.exercise,
    matchType: unifiedDuel.matchType,
    windowSec: unifiedDuel.windowSec,
    host: unifiedDuel.host,
    guest: unifiedDuel.guest || null,
    status: unifiedDuel.status,
    hostScore: unifiedDuel.hostScore || null,
    guestScore: unifiedDuel.guestScore || null,
    winnerUid: unifiedDuel.winnerUid || null,
    tieBreaker: unifiedDuel.tieBreaker || null,
    seasonId: unifiedDuel.seasonId || getCurrentSeasonId(),
    createdAt: { toMillis: () => unifiedDuel.createdAt } as Timestamp,
    activatedAt: {
      toMillis: () => unifiedDuel.activatedAt || unifiedDuel.createdAt,
    } as Timestamp,
    completedAt: {
      toMillis: () => unifiedDuel.completedAt || unifiedDuel.createdAt,
    } as Timestamp,
  };
};

/**
 * Helper function to convert time window strings to seconds
 */
const convertTimeWindowToSeconds = (timeWindow: string): number => {
  switch (timeWindow) {
    case "10min":
      return 10 * 60;
    case "30min":
      return 30 * 60;
    case "24hours":
      return 24 * 60 * 60;
    default:
      return 30 * 60; // Default to 30 minutes
  }
};

/**
 * Helper function to map local status to unified status
 */
const mapLocalStatusToUnified = (
  localStatus: string
): UnifiedDuel["status"] => {
  switch (localStatus) {
    case "waiting":
      return "pending";
    case "active":
      return "active";
    case "completed":
      return "completed";
    case "expired":
      return "expired";
    default:
      return "pending";
  }
};

/**
 * Helper function to get current season ID
 */
const getCurrentSeasonId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
};

/**
 * Validates that a duel object has all required fields
 */
export const validateUnifiedDuel = (duel: any): duel is UnifiedDuel => {
  return (
    typeof duel === "object" &&
    typeof duel.id === "string" &&
    typeof duel.exercise === "string" &&
    typeof duel.status === "string" &&
    typeof duel.host === "object" &&
    typeof duel.host.uid === "string" &&
    typeof duel.host.username === "string" &&
    typeof duel.windowSec === "number" &&
    typeof duel.matchType === "string" &&
    typeof duel.createdAt === "number" &&
    typeof duel.expiresAt === "number"
  );
};
