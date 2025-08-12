/**
 * Challenge Configuration
 * Centralized settings for the OneMore Challenge
 */

export const CHALLENGE_CONFIG = {
  // Challenge duration (can be changed to any number)
  TOTAL_DAYS: 100, // Changed from 75 to 100 days

  // Challenge name and branding
  NAME: "OneMore Challenge",
  SHORT_NAME: "OneMore",
  TAGLINE: "Transform your fitness with progressive daily challenges",

  // Milestone days for celebrations and achievements
  MILESTONES: [7, 14, 30, 50, 75, 100, 150, 200, 250, 300, 365, 500, 750, 1000],

  // Major milestone celebrations
  MAJOR_MILESTONES: {
    7: "🔥 One week down, feeling stronger already!",
    14: "💪 Two weeks of consistency - the habit is forming!",
    30: "🏆 One month strong - you're building real discipline!",
    50: "⚡ 50 days strong - nothing can stop you now!",
    60: "🎖️ 60 days of discipline - you're in the zone!",
    75: "🚀 75 days complete - you're a fitness warrior!",
    100: "👑 100 DAYS COMPLETE! You are a Challenge Conqueror! 🎉",
  },

  // Default exercise baselines
  DEFAULT_BASELINES: {
    pushups: 10,
    squats: 15,
    situps: 10,
    planks: 30, // seconds
  },

  // Exercise progression rules
  PROGRESSION: {
    // Standard exercises: +1 rep per day
    STANDARD_INCREMENT: 1,
    // Planks: +5 seconds per day
    PLANK_INCREMENT: 5,
  },

  // Achievement thresholds
  ACHIEVEMENTS: {
    CHAMPION_THRESHOLD: 100, // Days needed for champion status
    WARRIOR_THRESHOLD: 75, // Days needed for warrior status
    STREAK_MASTER: 30, // Days for streak master
  },

  // Social sharing hashtags
  HASHTAGS: "#OneMoreChallenge #FitnessJourney #ProgressiveTraining",

  // App metadata
  APP_NAME: "OneMore",
  APP_DESCRIPTION: "Progressive fitness challenge app",
};

// Helper functions
export const getChallengeProgress = (currentDay: number): number => {
  return Math.min((currentDay / CHALLENGE_CONFIG.TOTAL_DAYS) * 100, 100);
};

export const isChallengeMilestone = (day: number): boolean => {
  return CHALLENGE_CONFIG.MILESTONES.includes(day);
};

export const getMilestoneMessage = (day: number): string | null => {
  return (
    CHALLENGE_CONFIG.MAJOR_MILESTONES[
      day as keyof typeof CHALLENGE_CONFIG.MAJOR_MILESTONES
    ] || null
  );
};

export const isChallengeComplete = (currentDay: number): boolean => {
  return currentDay >= CHALLENGE_CONFIG.TOTAL_DAYS;
};

export const getDaysRemaining = (currentDay: number): number => {
  return Math.max(CHALLENGE_CONFIG.TOTAL_DAYS - currentDay, 0);
};

export const getExerciseTarget = (
  baseline: number,
  currentDay: number,
  isPlank: boolean = false
): number => {
  const increment = isPlank
    ? CHALLENGE_CONFIG.PROGRESSION.PLANK_INCREMENT
    : CHALLENGE_CONFIG.PROGRESSION.STANDARD_INCREMENT;
  return baseline + (currentDay - 1) * increment;
};

export default CHALLENGE_CONFIG;
