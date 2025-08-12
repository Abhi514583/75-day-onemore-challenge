import {
  Achievement,
  Badge,
  ACHIEVEMENTS,
  BADGES,
} from "../types/achievements";
import NotificationService from "./NotificationService";

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  isCompleted: boolean;
  completedAt?: string;
}

class AchievementService {
  private unlockedAchievements: Set<string> = new Set();
  private unlockedBadges: Set<string> = new Set();
  private achievementProgress: Map<string, AchievementProgress> = new Map();

  // Initialize achievement system
  initialize() {
    // Load saved achievements from storage
    this.loadAchievements();
    console.log("🏆 Achievement system initialized");
  }

  // Check and unlock achievements based on user progress
  async checkAchievements(userStats: {
    currentDay: number;
    currentStreak: number;
    bestStreak: number;
    totalDaysCompleted: number;
    lastWorkoutTime?: string;
    todayExercises?: {
      pushups?: number;
      squats?: number;
      situps?: number;
      planks?: number; // in seconds
    };
  }): Promise<Achievement[]> {
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (this.unlockedAchievements.has(achievement.id)) {
        continue; // Already unlocked
      }

      let shouldUnlock = false;

      switch (achievement.requirement.type) {
        case "days_completed":
          shouldUnlock =
            userStats.totalDaysCompleted >= achievement.requirement.value;
          break;

        case "streak_length":
          shouldUnlock =
            userStats.currentStreak >= achievement.requirement.value;
          break;

        case "total_exercises":
          // This would need total exercise count tracking
          break;

        case "special_condition":
          shouldUnlock = await this.checkSpecialCondition(
            achievement,
            userStats
          );
          break;
      }

      if (shouldUnlock) {
        await this.unlockAchievement(achievement);
        newlyUnlocked.push(achievement);
      }
    }

    // Check badge unlocks
    await this.checkBadgeUnlocks(userStats);

    return newlyUnlocked;
  }

  // Check special achievement conditions
  private async checkSpecialCondition(
    achievement: Achievement,
    userStats: any
  ): Promise<boolean> {
    const condition = achievement.requirement.condition;
    const value = achievement.requirement.value;

    switch (condition) {
      case "single_day_pushups":
        return (userStats.todayExercises?.pushups || 0) >= value;

      case "plank_duration_seconds":
        return (userStats.todayExercises?.planks || 0) >= value;

      case "early_morning_workouts":
        // Check if last 7 workouts were before 8 AM
        return this.checkWorkoutTimePattern(userStats, "early");

      case "late_evening_workouts":
        // Check if last 7 workouts were after 8 PM
        return this.checkWorkoutTimePattern(userStats, "late");

      default:
        return false;
    }
  }

  // Check workout time patterns for consistency achievements
  private checkWorkoutTimePattern(
    userStats: any,
    pattern: "early" | "late"
  ): boolean {
    // This would need workout time history tracking
    // For now, return false as we don't have this data yet
    return false;
  }

  // Unlock an achievement
  private async unlockAchievement(achievement: Achievement): Promise<void> {
    this.unlockedAchievements.add(achievement.id);
    achievement.isUnlocked = true;
    achievement.unlockedAt = new Date().toISOString();

    // Save to storage
    this.saveAchievements();

    // Send notification
    await NotificationService.scheduleAchievementUnlock({
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
    });

    console.log(`🎉 Achievement unlocked: ${achievement.title}`);
  }

  // Check and unlock badges
  private async checkBadgeUnlocks(userStats: {
    currentDay: number;
    currentStreak: number;
    totalDaysCompleted: number;
  }): Promise<void> {
    for (const badge of BADGES) {
      if (this.unlockedBadges.has(badge.id)) {
        continue;
      }

      let shouldUnlock = false;

      switch (badge.id) {
        case "week_badge":
          shouldUnlock = userStats.currentStreak >= 7;
          break;
        case "month_badge":
          shouldUnlock = userStats.currentStreak >= 30;
          break;
        case "halfway_badge":
          shouldUnlock = userStats.totalDaysCompleted >= 37;
          break;
        case "champion_badge":
          shouldUnlock = userStats.totalDaysCompleted >= 100;
          break;
        case "streak_badge":
          shouldUnlock = userStats.currentStreak >= 21;
          break;
        case "consistency_badge":
          // Perfect consistency - no missed days
          shouldUnlock =
            userStats.currentStreak === userStats.totalDaysCompleted &&
            userStats.totalDaysCompleted >= 30;
          break;
      }

      if (shouldUnlock) {
        await this.unlockBadge(badge);
      }
    }
  }

  // Unlock a badge
  private async unlockBadge(badge: Badge): Promise<void> {
    this.unlockedBadges.add(badge.id);
    badge.isUnlocked = true;
    badge.unlockedAt = new Date().toISOString();

    // Save to storage
    this.saveBadges();

    // Send notification
    await NotificationService.sendMotivationalPush({
      title: `🏆 Badge Unlocked: ${badge.name}!`,
      body: `${badge.icon} ${badge.description} - You're amazing!`,
      type: "badge_unlock",
    });

    console.log(`🏅 Badge unlocked: ${badge.name}`);
  }

  // Get all unlocked achievements
  getUnlockedAchievements(): Achievement[] {
    return ACHIEVEMENTS.filter((achievement) =>
      this.unlockedAchievements.has(achievement.id)
    );
  }

  // Get all unlocked badges
  getUnlockedBadges(): Badge[] {
    return BADGES.filter((badge) => this.unlockedBadges.has(badge.id));
  }

  // Get achievement progress
  getAchievementProgress(achievementId: string): AchievementProgress | null {
    return this.achievementProgress.get(achievementId) || null;
  }

  // Get total achievement points
  getTotalPoints(): number {
    return this.getUnlockedAchievements().reduce(
      (total, achievement) => total + achievement.points,
      0
    );
  }

  // Get achievements by category
  getAchievementsByCategory(category: Achievement["category"]): Achievement[] {
    return ACHIEVEMENTS.filter(
      (achievement) => achievement.category === category
    );
  }

  // Get next milestone achievement
  getNextMilestone(currentDay: number): Achievement | null {
    const milestoneAchievements = ACHIEVEMENTS.filter(
      (achievement) =>
        achievement.category === "milestone" &&
        achievement.requirement.type === "days_completed" &&
        achievement.requirement.value > currentDay &&
        !this.unlockedAchievements.has(achievement.id)
    ).sort((a, b) => a.requirement.value - b.requirement.value);

    return milestoneAchievements[0] || null;
  }

  // Get achievement completion percentage
  getCompletionPercentage(): number {
    const totalAchievements = ACHIEVEMENTS.length;
    const unlockedCount = this.unlockedAchievements.size;
    return Math.round((unlockedCount / totalAchievements) * 100);
  }

  // Get rarity distribution
  getRarityStats(): { [key: string]: { unlocked: number; total: number } } {
    const stats = {
      common: { unlocked: 0, total: 0 },
      rare: { unlocked: 0, total: 0 },
      epic: { unlocked: 0, total: 0 },
      legendary: { unlocked: 0, total: 0 },
    };

    ACHIEVEMENTS.forEach((achievement) => {
      stats[achievement.rarity].total++;
      if (this.unlockedAchievements.has(achievement.id)) {
        stats[achievement.rarity].unlocked++;
      }
    });

    return stats;
  }

  // Save achievements to storage
  private saveAchievements(): void {
    try {
      // In a real app, this would save to AsyncStorage or SQLite
      const achievementData = {
        unlockedAchievements: Array.from(this.unlockedAchievements),
        unlockedBadges: Array.from(this.unlockedBadges),
        lastUpdated: new Date().toISOString(),
      };

      // For now, just log - in production this would persist data
      console.log("💾 Achievements saved:", achievementData);
    } catch (error) {
      console.error("Failed to save achievements:", error);
    }
  }

  // Save badges to storage
  private saveBadges(): void {
    try {
      // Similar to saveAchievements - would persist to storage
      console.log("💾 Badges saved");
    } catch (error) {
      console.error("Failed to save badges:", error);
    }
  }

  // Load achievements from storage
  private loadAchievements(): void {
    try {
      // In a real app, this would load from AsyncStorage or SQLite
      // For now, start with empty sets
      console.log("📂 Achievements loaded");
    } catch (error) {
      console.error("Failed to load achievements:", error);
    }
  }

  // Reset all achievements (for testing)
  resetAllAchievements(): void {
    this.unlockedAchievements.clear();
    this.unlockedBadges.clear();
    this.achievementProgress.clear();

    // Reset achievement objects
    ACHIEVEMENTS.forEach((achievement) => {
      achievement.isUnlocked = false;
      achievement.unlockedAt = undefined;
    });

    BADGES.forEach((badge) => {
      badge.isUnlocked = false;
      badge.unlockedAt = undefined;
    });

    this.saveAchievements();
    this.saveBadges();

    console.log("🔄 All achievements reset");
  }

  // Get achievement suggestions based on current progress
  getAchievementSuggestions(userStats: {
    currentDay: number;
    currentStreak: number;
    totalDaysCompleted: number;
  }): string[] {
    const suggestions: string[] = [];

    // Next milestone suggestion
    const nextMilestone = this.getNextMilestone(userStats.currentDay);
    if (nextMilestone) {
      const daysLeft =
        nextMilestone.requirement.value - userStats.totalDaysCompleted;
      suggestions.push(
        `🎯 ${daysLeft} more days to unlock "${nextMilestone.title}"!`
      );
    }

    // Streak suggestions
    if (userStats.currentStreak >= 3 && userStats.currentStreak < 7) {
      suggestions.push(
        `🔥 ${
          7 - userStats.currentStreak
        } more days for "Week Warrior" achievement!`
      );
    }

    if (userStats.currentStreak >= 7 && userStats.currentStreak < 21) {
      suggestions.push(
        `⚡ ${
          21 - userStats.currentStreak
        } more days for "Streak Legend" achievement!`
      );
    }

    return suggestions;
  }
}

export default new AchievementService();
