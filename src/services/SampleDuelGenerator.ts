/**
 * Sample Duel Generator
 * Creates realistic sample duels for demonstration and testing purposes
 */

import { UnifiedDuel, ExerciseType, DuelStatus } from "../types/unified";

interface SampleDuelConfig {
  includeCompleted?: boolean;
  includeExpired?: boolean;
  maxDuels?: number;
  userAsHost?: boolean;
}

/**
 * Sample opponent names for realistic duels
 */
const SAMPLE_OPPONENTS = [
  "FitnessFan92",
  "IronMike",
  "CardioQueen",
  "StrengthSeeker",
  "WorkoutWarrior",
  "FlexMaster",
  "EnduranceElite",
  "PowerLifter",
  "YogaYoda",
  "RunnerRebel",
  "GymGuru",
  "FitFighter",
  "HealthHero",
  "MuscleBuilder",
  "CoreCrusher",
];

/**
 * Sample exercise scores for realistic duels
 */
const EXERCISE_SCORE_RANGES = {
  pushups: { min: 15, max: 80 },
  squats: { min: 20, max: 100 },
  situps: { min: 25, max: 90 },
  planks: { min: 30, max: 300 }, // seconds
};

/**
 * Time windows in seconds
 */
const TIME_WINDOWS = [
  600, // 10 minutes
  1800, // 30 minutes
  86400, // 24 hours
];

export class SampleDuelGenerator {
  private static instance: SampleDuelGenerator;
  private usedOpponentNames: Set<string> = new Set();

  private constructor() {}

  static getInstance(): SampleDuelGenerator {
    if (!SampleDuelGenerator.instance) {
      SampleDuelGenerator.instance = new SampleDuelGenerator();
    }
    return SampleDuelGenerator.instance;
  }

  /**
   * Generate a set of sample duels
   */
  generateSampleDuels(config: SampleDuelConfig = {}): UnifiedDuel[] {
    const {
      includeCompleted = true,
      includeExpired = false,
      maxDuels = 5,
      userAsHost = true,
    } = config;

    const sampleDuels: UnifiedDuel[] = [];
    this.usedOpponentNames.clear();

    // Generate different types of duels
    const exercises: ExerciseType[] = ["pushups", "squats", "situps", "planks"];
    const statuses: DuelStatus[] = ["pending", "active"];

    if (includeCompleted) {
      statuses.push("completed");
    }

    if (includeExpired) {
      statuses.push("expired");
    }

    for (
      let i = 0;
      i < maxDuels && i < exercises.length * statuses.length;
      i++
    ) {
      const exercise = exercises[i % exercises.length];
      const status =
        statuses[Math.floor(i / exercises.length) % statuses.length];

      const duel = this.generateSingleDuel(exercise, status, userAsHost);
      if (duel) {
        sampleDuels.push(duel);
      }
    }

    return sampleDuels;
  }

  /**
   * Generate a single sample duel
   */
  private generateSingleDuel(
    exercise: ExerciseType,
    status: DuelStatus,
    userAsHost: boolean = true
  ): UnifiedDuel | null {
    const now = Date.now();
    const windowSec =
      TIME_WINDOWS[Math.floor(Math.random() * TIME_WINDOWS.length)];
    const opponentName = this.getUniqueOpponentName();

    if (!opponentName) {
      return null; // No more unique names available
    }

    const duelId = `sample_${exercise}_${status}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 5)}`;

    // Calculate timestamps based on status
    let createdAt: number;
    let activatedAt: number | undefined;
    let completedAt: number | undefined;
    let expiresAt: number;

    switch (status) {
      case "pending":
        createdAt = now - Math.random() * 3600000; // Created up to 1 hour ago
        expiresAt = createdAt + windowSec * 1000;
        break;

      case "active":
        createdAt = now - Math.random() * 1800000; // Created up to 30 minutes ago
        activatedAt = createdAt + Math.random() * 600000; // Activated within 10 minutes of creation
        expiresAt = activatedAt + windowSec * 1000;
        break;

      case "completed":
        createdAt = now - Math.random() * 86400000; // Created up to 1 day ago
        activatedAt = createdAt + Math.random() * 3600000; // Activated within 1 hour
        completedAt = activatedAt + Math.random() * windowSec * 1000; // Completed within window
        expiresAt = activatedAt + windowSec * 1000;
        break;

      case "expired":
        createdAt = now - windowSec * 1000 - Math.random() * 86400000; // Created and expired
        expiresAt = createdAt + windowSec * 1000;
        break;

      default:
        createdAt = now;
        expiresAt = now + windowSec * 1000;
    }

    // Generate participants
    const host = userAsHost
      ? {
          uid: "current_user_id",
          username: "You",
        }
      : {
          uid: `opponent_${Math.random().toString(36).substr(2, 8)}`,
          username: opponentName,
        };

    const guest =
      status !== "pending"
        ? userAsHost
          ? {
              uid: `opponent_${Math.random().toString(36).substr(2, 8)}`,
              username: opponentName,
            }
          : {
              uid: "current_user_id",
              username: "You",
            }
        : undefined;

    // Generate scores for completed duels
    let hostScore: number | undefined;
    let guestScore: number | undefined;
    let winnerUid: string | undefined;
    let tieBreaker: UnifiedDuel["tieBreaker"] = null;

    if (status === "completed" && guest) {
      const scoreRange = EXERCISE_SCORE_RANGES[exercise];
      hostScore = Math.floor(
        Math.random() * (scoreRange.max - scoreRange.min) + scoreRange.min
      );
      guestScore = Math.floor(
        Math.random() * (scoreRange.max - scoreRange.min) + scoreRange.min
      );

      if (hostScore > guestScore) {
        winnerUid = host.uid;
      } else if (guestScore > hostScore) {
        winnerUid = guest.uid;
      } else {
        // Tie - random winner
        winnerUid = Math.random() < 0.5 ? host.uid : guest.uid;
        tieBreaker = "coin";
      }
    }

    return {
      id: duelId,
      exercise,
      status,
      host,
      guest,
      hostScore,
      guestScore,
      winnerUid,
      tieBreaker,
      windowSec,
      matchType: "public", // Sample duels are always public
      createdAt,
      activatedAt,
      completedAt,
      expiresAt,
      seasonId: this.getCurrentSeasonId(),
    };
  }

  /**
   * Get a unique opponent name that hasn't been used yet
   */
  private getUniqueOpponentName(): string | null {
    const availableNames = SAMPLE_OPPONENTS.filter(
      (name) => !this.usedOpponentNames.has(name)
    );

    if (availableNames.length === 0) {
      return null;
    }

    const selectedName =
      availableNames[Math.floor(Math.random() * availableNames.length)];
    this.usedOpponentNames.add(selectedName);
    return selectedName;
  }

  /**
   * Get current season ID
   */
  private getCurrentSeasonId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `${year}-Q${quarter}`;
  }

  /**
   * Generate a specific sample duel for testing
   */
  generateTestDuel(
    exercise: ExerciseType,
    status: DuelStatus,
    customConfig?: Partial<UnifiedDuel>
  ): UnifiedDuel {
    const baseDuel = this.generateSingleDuel(exercise, status, true);

    if (!baseDuel) {
      throw new Error("Failed to generate test duel");
    }

    return {
      ...baseDuel,
      ...customConfig,
    };
  }

  /**
   * Check if sample duels should be shown
   */
  shouldShowSampleDuels(realDuelsCount: number): boolean {
    return realDuelsCount === 0;
  }

  /**
   * Reset the generator state
   */
  reset(): void {
    this.usedOpponentNames.clear();
  }
}

// Export singleton instance
export const sampleDuelGenerator = SampleDuelGenerator.getInstance();
