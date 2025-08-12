export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "streak" | "milestone" | "consistency" | "special";
  requirement: {
    type:
      | "days_completed"
      | "streak_length"
      | "total_exercises"
      | "special_condition";
    value: number;
    condition?: string;
  };
  unlockedAt?: string; // ISO date string
  isUnlocked: boolean;
  rarity: "common" | "rare" | "epic" | "legendary";
  points: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  glowColor: string;
  unlockedAt?: string;
  isUnlocked: boolean;
  category: "milestone" | "streak" | "consistency" | "special";
}

export interface UserAchievements {
  totalPoints: number;
  unlockedAchievements: Achievement[];
  unlockedBadges: Badge[];
  lastChecked: string;
}

// Predefined achievements
export const ACHIEVEMENTS: Achievement[] = [
  // Milestone Achievements
  {
    id: "first_day",
    title: "First Step",
    description: "Completed your first day of the challenge",
    icon: "🎯",
    category: "milestone",
    requirement: { type: "days_completed", value: 1 },
    isUnlocked: false,
    rarity: "common",
    points: 10,
  },
  {
    id: "week_warrior",
    title: "Week Warrior",
    description: "Completed 7 consecutive days",
    icon: "🔥",
    category: "milestone",
    requirement: { type: "streak_length", value: 7 },
    isUnlocked: false,
    rarity: "rare",
    points: 50,
  },
  {
    id: "two_week_champion",
    title: "Two Week Champion",
    description: "Completed 14 consecutive days",
    icon: "💪",
    category: "milestone",
    requirement: { type: "streak_length", value: 14 },
    isUnlocked: false,
    rarity: "rare",
    points: 100,
  },
  {
    id: "month_master",
    title: "Month Master",
    description: "Completed 30 consecutive days",
    icon: "🏆",
    category: "milestone",
    requirement: { type: "streak_length", value: 30 },
    isUnlocked: false,
    rarity: "epic",
    points: 200,
  },
  {
    id: "halfway_hero",
    title: "Halfway Hero",
    description: "Reached the halfway point - Day 37",
    icon: "🚀",
    category: "milestone",
    requirement: { type: "days_completed", value: 37 },
    isUnlocked: false,
    rarity: "epic",
    points: 250,
  },
  {
    id: "fifty_day_superstar",
    title: "50-Day Superstar",
    description: "Completed 50 days of the challenge",
    icon: "⚡",
    category: "milestone",
    requirement: { type: "days_completed", value: 50 },
    isUnlocked: false,
    rarity: "epic",
    points: 300,
  },
  {
    id: "sixty_day_legend",
    title: "60-Day Legend",
    description: "Only 15 days left - you are unstoppable!",
    icon: "🎖️",
    category: "milestone",
    requirement: { type: "days_completed", value: 60 },
    isUnlocked: false,
    rarity: "legendary",
    points: 400,
  },
  {
    id: "challenge_conqueror",
    title: "Challenge Conqueror",
    description: "Completed 100 days of the OneMore challenge!",
    icon: "👑",
    category: "milestone",
    requirement: { type: "days_completed", value: 100 },
    isUnlocked: false,
    rarity: "legendary",
    points: 1000,
  },

  // Streak Achievements
  {
    id: "streak_starter",
    title: "Streak Starter",
    description: "Started your first 3-day streak",
    icon: "🌟",
    category: "streak",
    requirement: { type: "streak_length", value: 3 },
    isUnlocked: false,
    rarity: "common",
    points: 25,
  },
  {
    id: "streak_master",
    title: "Streak Master",
    description: "Achieved a 10-day streak",
    icon: "⚡",
    category: "streak",
    requirement: { type: "streak_length", value: 10 },
    isUnlocked: false,
    rarity: "rare",
    points: 75,
  },
  {
    id: "streak_legend",
    title: "Streak Legend",
    description: "Achieved a 21-day streak",
    icon: "🔥",
    category: "streak",
    requirement: { type: "streak_length", value: 21 },
    isUnlocked: false,
    rarity: "epic",
    points: 150,
  },

  // Exercise Achievements
  {
    id: "hundred_pushups",
    title: "Century Pusher",
    description: "Completed 100+ pushups in a single day",
    icon: "💯",
    category: "special",
    requirement: {
      type: "special_condition",
      value: 100,
      condition: "single_day_pushups",
    },
    isUnlocked: false,
    rarity: "rare",
    points: 100,
  },
  {
    id: "plank_master",
    title: "Plank Master",
    description: "Held a plank for 5+ minutes",
    icon: "🧘",
    category: "special",
    requirement: {
      type: "special_condition",
      value: 300,
      condition: "plank_duration_seconds",
    },
    isUnlocked: false,
    rarity: "epic",
    points: 150,
  },

  // Consistency Achievements
  {
    id: "early_bird",
    title: "Early Bird",
    description: "Completed workouts before 8 AM for 7 days",
    icon: "🌅",
    category: "consistency",
    requirement: {
      type: "special_condition",
      value: 7,
      condition: "early_morning_workouts",
    },
    isUnlocked: false,
    rarity: "rare",
    points: 75,
  },
  {
    id: "night_owl",
    title: "Night Owl",
    description: "Completed workouts after 8 PM for 7 days",
    icon: "🦉",
    category: "consistency",
    requirement: {
      type: "special_condition",
      value: 7,
      condition: "late_evening_workouts",
    },
    isUnlocked: false,
    rarity: "rare",
    points: 75,
  },
];

// Predefined badges
export const BADGES: Badge[] = [
  {
    id: "week_badge",
    name: "Week Warrior",
    description: "7 Days Strong",
    icon: "🔥",
    color: "#FF6B6B",
    glowColor: "#FF8E8E",
    isUnlocked: false,
    category: "milestone",
  },
  {
    id: "month_badge",
    name: "Month Master",
    description: "30 Days Complete",
    icon: "🏆",
    color: "#FFD700",
    glowColor: "#FFED4E",
    isUnlocked: false,
    category: "milestone",
  },
  {
    id: "halfway_badge",
    name: "Halfway Hero",
    description: "Day 37 Reached",
    icon: "🚀",
    color: "#667eea",
    glowColor: "#8B9EFF",
    isUnlocked: false,
    category: "milestone",
  },
  {
    id: "champion_badge",
    name: "Challenge Champion",
    description: "Challenge Champion",
    icon: "👑",
    color: "#9C27B0",
    glowColor: "#BA68C8",
    isUnlocked: false,
    category: "milestone",
  },
  {
    id: "streak_badge",
    name: "Streak Master",
    description: "21+ Day Streak",
    icon: "⚡",
    color: "#4CAF50",
    glowColor: "#81C784",
    isUnlocked: false,
    category: "streak",
  },
  {
    id: "consistency_badge",
    name: "Consistency King",
    description: "Never Missed a Day",
    icon: "💎",
    color: "#00BCD4",
    glowColor: "#4DD0E1",
    isUnlocked: false,
    category: "consistency",
  },
];
