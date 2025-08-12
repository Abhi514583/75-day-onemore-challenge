import { Timestamp } from "firebase/firestore";
import { ExerciseType } from "../types/firebase";

// Firebase utility functions

/**
 * Convert JavaScript Date to Firestore Timestamp
 */
export const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

/**
 * Convert Firestore Timestamp to JavaScript Date
 */
export const timestampToDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

/**
 * Get current timestamp
 */
export const getCurrentTimestamp = (): Timestamp => {
  return Timestamp.now();
};

/**
 * Format ISO date string for challengeDays collection
 */
export const formatISODate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Get current season ID (year-month format)
 */
export const getCurrentSeasonId = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Generate unique attempt ID
 */
export const generateAttemptId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate unique duel ID
 */
export const generateDuelId = (): string => {
  return `duel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Default OMR ratings for new users
 */
export const getDefaultOMRRatings = () => ({
  pushups: 1200,
  squats: 1200,
  situps: 1200,
  planks: 1200,
});

/**
 * Default levels for new users
 */
export const getDefaultLevels = () => ({
  pushups: 1,
  squats: 1,
  situps: 1,
  planks: 1,
  global: 1,
});

/**
 * Default baselines for new users
 */
export const getDefaultBaselines = () => ({
  pushups: 0,
  squats: 0,
  situps: 0,
  planks: 0,
});

/**
 * Validate exercise type
 */
export const isValidExerciseType = (
  exercise: string
): exercise is ExerciseType => {
  return ["pushups", "squats", "situps", "planks"].includes(exercise);
};

/**
 * Get exercise display name
 */
export const getExerciseDisplayName = (exercise: ExerciseType): string => {
  const names = {
    pushups: "Push-ups",
    squats: "Squats",
    situps: "Sit-ups",
    planks: "Plank",
  };
  return names[exercise];
};

/**
 * Get exercise unit (reps or seconds)
 */
export const getExerciseUnit = (exercise: ExerciseType): string => {
  return exercise === "planks" ? "seconds" : "reps";
};

/**
 * Calculate time window options in seconds
 */
export const getTimeWindowOptions = () => ({
  "10min": 600,
  "30min": 1800,
  "24hr": 86400,
});

/**
 * Format time window for display
 */
export const formatTimeWindow = (windowSec: number): string => {
  if (windowSec === 600) return "10 minutes";
  if (windowSec === 1800) return "30 minutes";
  if (windowSec === 86400) return "24 hours";
  return `${windowSec} seconds`;
};

/**
 * Check if timestamp is within time window
 */
export const isWithinTimeWindow = (
  startTime: Timestamp,
  windowSec: number,
  currentTime: Timestamp = getCurrentTimestamp()
): boolean => {
  const startMs = startTime.toMillis();
  const currentMs = currentTime.toMillis();
  const windowMs = windowSec * 1000;

  return currentMs - startMs <= windowMs;
};

/**
 * Calculate remaining time in window
 */
export const getRemainingTime = (
  startTime: Timestamp,
  windowSec: number,
  currentTime: Timestamp = getCurrentTimestamp()
): number => {
  const startMs = startTime.toMillis();
  const currentMs = currentTime.toMillis();
  const windowMs = windowSec * 1000;

  const remaining = windowMs - (currentMs - startMs);
  return Math.max(0, Math.floor(remaining / 1000));
};
