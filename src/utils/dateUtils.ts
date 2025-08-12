/**
 * Timezone-safe date utilities for the OneMore challenge
 * Handles DST changes and timezone travel correctly
 */

/**
 * Get the current local date as YYYY-MM-DD string
 * Always uses the device's current timezone
 */
export const getCurrentLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Convert a date string (YYYY-MM-DD) to a Date object at local midnight
 * This ensures we're working with local timezone boundaries
 */
export const dateStringToLocalMidnight = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number);
  // Create date at local midnight (not UTC)
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * Calculate the number of days between two local dates
 * Uses local midnight boundaries, safe for DST and timezone changes
 */
export const calculateDaysBetween = (
  startDateString: string,
  endDateString: string
): number => {
  const startDate = dateStringToLocalMidnight(startDateString);
  const endDate = dateStringToLocalMidnight(endDateString);

  // Calculate difference in milliseconds
  const diffTime = endDate.getTime() - startDate.getTime();

  // Convert to days (24 hours = 86400000 milliseconds)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Calculate the current challenge day based on start date
 * Returns the day number (1-indexed) with no upper limit for lifelong challenge
 */
export const calculateCurrentChallengeDay = (
  startDateString: string
): number => {
  const today = getCurrentLocalDateString();
  const daysSinceStart = calculateDaysBetween(startDateString, today);

  // Challenge day is 1-indexed (day 1 is the start date)
  const challengeDay = daysSinceStart + 1;

  // Only ensure minimum of 1 (no upper limit for lifelong challenge)
  return Math.max(1, challengeDay);
};

/**
 * Check if a date string represents today in local timezone
 */
export const isToday = (dateString: string): boolean => {
  return dateString === getCurrentLocalDateString();
};

/**
 * Check if a date string represents yesterday in local timezone
 */
export const isYesterday = (dateString: string): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = formatDateToString(yesterday);
  return dateString === yesterdayString;
};

/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Get the date string for a specific number of days from the start date
 */
export const getDateStringForChallengeDay = (
  startDateString: string,
  challengeDay: number
): string => {
  const startDate = dateStringToLocalMidnight(startDateString);
  const targetDate = new Date(startDate);
  targetDate.setDate(startDate.getDate() + (challengeDay - 1));
  return formatDateToString(targetDate);
};

/**
 * Check if the challenge is completed (lifelong challenge never completes)
 * This function is kept for backward compatibility but always returns false
 */
export const isChallengeCompleted = (startDateString: string): boolean => {
  // Lifelong challenge never completes
  return false;
};

/**
 * Get a human-readable description of the time difference
 */
export const getTimeDifferenceDescription = (
  startDateString: string
): string => {
  const today = getCurrentLocalDateString();
  const daysDiff = calculateDaysBetween(startDateString, today);

  if (daysDiff === 0) {
    return "Started today";
  } else if (daysDiff === 1) {
    return "Started yesterday";
  } else if (daysDiff > 0) {
    return `Started ${daysDiff} days ago`;
  } else {
    return `Starts in ${Math.abs(daysDiff)} days`;
  }
};

/**
 * Debug function to log timezone information
 */
export const logTimezoneInfo = (): void => {
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = now.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const offsetSign = offset <= 0 ? "+" : "-";

  console.log("🌍 Timezone Info:");
  console.log(`- Timezone: ${timeZone}`);
  console.log(
    `- UTC Offset: ${offsetSign}${offsetHours
      .toString()
      .padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`
  );
  console.log(`- Current local time: ${now.toLocaleString()}`);
  console.log(`- Current local date: ${getCurrentLocalDateString()}`);
  console.log(`- Is DST: ${isDST(now)}`);
};

/**
 * Check if a date is during Daylight Saving Time
 */
export const isDST = (date: Date): boolean => {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  return date.getTimezoneOffset() < stdOffset;
};

/**
 * Validate a date string format (YYYY-MM-DD)
 */
export const isValidDateString = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  const date = dateStringToLocalMidnight(dateString);
  const [year, month, day] = dateString.split("-").map(Number);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

export default {
  getCurrentLocalDateString,
  dateStringToLocalMidnight,
  calculateDaysBetween,
  calculateCurrentChallengeDay,
  isToday,
  isYesterday,
  formatDateToString,
  getDateStringForChallengeDay,
  isChallengeCompleted,
  getTimeDifferenceDescription,
  logTimezoneInfo,
  isDST,
  isValidDateString,
};
