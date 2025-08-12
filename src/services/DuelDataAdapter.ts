/**
 * Duel Data Adapter Service
 * Provides a unified interface for duel data regardless of the underlying data source
 */

import {
  UnifiedDuel,
  DuelConfig,
  DuelCreateResult,
  DuelJoinResult,
  DuelSubmitResult,
  MatchmakingCriteria,
  DuelUpdateCallback,
  Unsubscribe,
  DataSource,
} from "../types/unified";
import {
  firebaseToUnified,
  localToUnified,
  validateUnifiedDuel,
} from "../adapters/DuelTypeAdapter";
import { duelService } from "./DuelService";
import { sampleDuelGenerator } from "./SampleDuelGenerator";

/**
 * Interface for duel data operations
 */
export interface IDuelDataAdapter {
  getDuel(id: string): Promise<UnifiedDuel | null>;
  subscribeToDuel(id: string, callback: DuelUpdateCallback): Unsubscribe;
  createDuel(config: DuelConfig): Promise<DuelCreateResult>;
  joinDuel(id: string): Promise<DuelJoinResult>;
  submitScore(id: string, score: number): Promise<DuelSubmitResult>;
  forfeitDuel(id: string): Promise<DuelSubmitResult>;
  getUserDuels(userId?: string): Promise<UnifiedDuel[]>;
  findAvailableDuels(criteria: MatchmakingCriteria): Promise<UnifiedDuel[]>;
  getDataSource(): DataSource;
  isOnline(): boolean;
}

/**
 * Firebase implementation of the duel data adapter
 */
class FirebaseDuelAdapter implements IDuelDataAdapter {
  async getDuel(id: string): Promise<UnifiedDuel | null> {
    try {
      // This would typically fetch from Firebase
      // For now, we'll use the existing duel service
      return null; // Placeholder
    } catch (error) {
      console.error("Error getting duel from Firebase:", error);
      return null;
    }
  }

  subscribeToDuel(id: string, callback: DuelUpdateCallback): Unsubscribe {
    return duelService.subscribeToDuel(id, (firebaseDuel) => {
      if (firebaseDuel) {
        try {
          const unifiedDuel = firebaseToUnified({ ...firebaseDuel, id });
          callback(unifiedDuel);
        } catch (error) {
          console.error(
            "Error converting Firebase duel to unified format:",
            error
          );
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  async createDuel(config: DuelConfig): Promise<DuelCreateResult> {
    try {
      const result = await duelService.createDuel(config);
      if (result.success && result.duel) {
        const unifiedDuel = firebaseToUnified({
          ...result.duel,
          id: result.duelId!,
        });
        return {
          success: true,
          duelId: result.duelId,
          duel: unifiedDuel,
        };
      }
      return { success: false, error: result.error };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to create duel",
      };
    }
  }

  async joinDuel(id: string): Promise<DuelJoinResult> {
    try {
      const result = await duelService.joinDuel(id);
      if (result.success && result.duel) {
        const unifiedDuel = firebaseToUnified({ ...result.duel, id });
        return {
          success: true,
          duel: unifiedDuel,
        };
      }
      return { success: false, error: result.error };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to join duel" };
    }
  }

  async submitScore(id: string, score: number): Promise<DuelSubmitResult> {
    try {
      const result = await duelService.submitScore(id, score);
      if (result.success && result.duel) {
        const unifiedDuel = firebaseToUnified({ ...result.duel, id });
        return {
          success: true,
          duel: unifiedDuel,
          isComplete: result.isComplete,
          winner: result.winner,
        };
      }
      return { success: false, error: result.error };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to submit score",
      };
    }
  }

  async forfeitDuel(id: string): Promise<DuelSubmitResult> {
    try {
      const result = await duelService.forfeitDuel(id);
      if (result.success && result.duel) {
        const unifiedDuel = firebaseToUnified({ ...result.duel, id });
        return {
          success: true,
          duel: unifiedDuel,
          isComplete: result.isComplete,
          winner: result.winner,
        };
      }
      return { success: false, error: result.error };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to forfeit duel",
      };
    }
  }

  async getUserDuels(userId?: string): Promise<UnifiedDuel[]> {
    try {
      const firebaseDuels = await duelService.getUserDuels(userId);
      return firebaseDuels.map((duel) =>
        firebaseToUnified({ ...duel, id: (duel as any).id })
      );
    } catch (error) {
      console.error("Error getting user duels from Firebase:", error);
      return [];
    }
  }

  async findAvailableDuels(
    criteria: MatchmakingCriteria
  ): Promise<UnifiedDuel[]> {
    try {
      const firebaseDuels = await duelService.findAvailableDuels(criteria);
      return firebaseDuels.map((duel) =>
        firebaseToUnified({ ...duel, id: (duel as any).id })
      );
    } catch (error) {
      console.error("Error finding available duels from Firebase:", error);
      return [];
    }
  }

  getDataSource(): DataSource {
    return "firebase";
  }

  isOnline(): boolean {
    return navigator.onLine;
  }
}

/**
 * Mock implementation of the duel data adapter for offline mode
 */
class MockDuelAdapter implements IDuelDataAdapter {
  private mockDuels: Map<string, UnifiedDuel> = new Map();
  private subscribers: Map<string, Set<DuelUpdateCallback>> = new Map();

  constructor() {
    // Initialize with some sample duels
    this.initializeSampleDuels();
  }

  private initializeSampleDuels() {
    const sampleDuels = sampleDuelGenerator.generateSampleDuels({
      includeCompleted: true,
      includeExpired: false,
      maxDuels: 3,
      userAsHost: true,
    });

    sampleDuels.forEach((duel) => {
      this.mockDuels.set(duel.id, duel);
    });
  }

  async getDuel(id: string): Promise<UnifiedDuel | null> {
    return this.mockDuels.get(id) || null;
  }

  subscribeToDuel(id: string, callback: DuelUpdateCallback): Unsubscribe {
    if (!this.subscribers.has(id)) {
      this.subscribers.set(id, new Set());
    }
    this.subscribers.get(id)!.add(callback);

    // Immediately call with current duel if it exists
    const duel = this.mockDuels.get(id);
    if (duel) {
      callback(duel);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(id);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(id);
        }
      }
    };
  }

  async createDuel(config: DuelConfig): Promise<DuelCreateResult> {
    try {
      const duelId = `mock_duel_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const now = Date.now();

      const newDuel: UnifiedDuel = {
        id: duelId,
        exercise: config.exercise,
        status:
          config.matchType === "friend" && config.opponentId
            ? "active"
            : "pending",
        host: {
          uid: "current_user_id", // This would come from auth
          username: "You",
        },
        guest: config.opponentId
          ? {
              uid: config.opponentId,
              username: "Friend", // This would be fetched from user service
            }
          : undefined,
        windowSec: config.windowSec,
        matchType: config.matchType,
        createdAt: now,
        expiresAt: now + config.windowSec * 1000,
      };

      this.mockDuels.set(duelId, newDuel);
      this.notifySubscribers(duelId, newDuel);

      return {
        success: true,
        duelId,
        duel: newDuel,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to create mock duel",
      };
    }
  }

  async joinDuel(id: string): Promise<DuelJoinResult> {
    try {
      const duel = this.mockDuels.get(id);
      if (!duel) {
        return { success: false, error: "Duel not found" };
      }

      if (duel.guest) {
        return { success: false, error: "Duel is already full" };
      }

      if (duel.status !== "pending") {
        return { success: false, error: "Duel is not available for joining" };
      }

      const updatedDuel: UnifiedDuel = {
        ...duel,
        guest: {
          uid: "current_user_id", // This would come from auth
          username: "You",
        },
        status: "active",
        activatedAt: Date.now(),
      };

      this.mockDuels.set(id, updatedDuel);
      this.notifySubscribers(id, updatedDuel);

      return {
        success: true,
        duel: updatedDuel,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to join mock duel",
      };
    }
  }

  async submitScore(id: string, score: number): Promise<DuelSubmitResult> {
    try {
      const duel = this.mockDuels.get(id);
      if (!duel) {
        return { success: false, error: "Duel not found" };
      }

      if (duel.status !== "active") {
        return { success: false, error: "Duel is not active" };
      }

      // Simulate submitting score for current user
      const isHost = true; // This would be determined by comparing user ID
      const updatedDuel: UnifiedDuel = {
        ...duel,
        hostScore: isHost ? score : duel.hostScore,
        guestScore: !isHost ? score : duel.guestScore,
      };

      // Check if duel is complete
      let isComplete = false;
      let winner: string | undefined;

      if (
        updatedDuel.hostScore !== null &&
        updatedDuel.hostScore !== undefined &&
        updatedDuel.guestScore !== null &&
        updatedDuel.guestScore !== undefined
      ) {
        isComplete = true;
        updatedDuel.status = "completed";
        updatedDuel.completedAt = Date.now();

        if (updatedDuel.hostScore > updatedDuel.guestScore) {
          winner = updatedDuel.host.uid;
          updatedDuel.winnerUid = winner;
        } else if (updatedDuel.guestScore > updatedDuel.hostScore) {
          winner = updatedDuel.guest!.uid;
          updatedDuel.winnerUid = winner;
        } else {
          // Tie - random winner for mock
          winner =
            Math.random() < 0.5 ? updatedDuel.host.uid : updatedDuel.guest!.uid;
          updatedDuel.winnerUid = winner;
          updatedDuel.tieBreaker = "coin";
        }
      }

      this.mockDuels.set(id, updatedDuel);
      this.notifySubscribers(id, updatedDuel);

      return {
        success: true,
        duel: updatedDuel,
        isComplete,
        winner,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to submit score to mock duel",
      };
    }
  }

  async forfeitDuel(id: string): Promise<DuelSubmitResult> {
    try {
      const duel = this.mockDuels.get(id);
      if (!duel) {
        return { success: false, error: "Duel not found" };
      }

      const isHost = true; // This would be determined by comparing user ID
      const winner = isHost ? duel.guest?.uid : duel.host.uid;

      const updatedDuel: UnifiedDuel = {
        ...duel,
        status: "forfeit",
        winnerUid: winner || null,
        completedAt: Date.now(),
      };

      this.mockDuels.set(id, updatedDuel);
      this.notifySubscribers(id, updatedDuel);

      return {
        success: true,
        duel: updatedDuel,
        isComplete: true,
        winner,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to forfeit mock duel",
      };
    }
  }

  async getUserDuels(userId?: string): Promise<UnifiedDuel[]> {
    // Return all mock duels for now
    return Array.from(this.mockDuels.values());
  }

  async findAvailableDuels(
    criteria: MatchmakingCriteria
  ): Promise<UnifiedDuel[]> {
    // Return pending duels that match the criteria
    return Array.from(this.mockDuels.values()).filter(
      (duel) =>
        duel.status === "pending" &&
        duel.exercise === criteria.exercise &&
        duel.matchType === "public"
    );
  }

  getDataSource(): DataSource {
    return "mock";
  }

  isOnline(): boolean {
    return false; // Mock adapter is always offline
  }

  // Helper method to add sample duels
  addSampleDuel(duel: UnifiedDuel) {
    this.mockDuels.set(duel.id, duel);
  }

  // Helper method to notify subscribers
  private notifySubscribers(id: string, duel: UnifiedDuel) {
    const callbacks = this.subscribers.get(id);
    if (callbacks) {
      callbacks.forEach((callback) => callback(duel));
    }
  }
}

/**
 * Factory class for creating the appropriate duel adapter
 */
export class DuelDataAdapterFactory {
  private static firebaseAdapter: FirebaseDuelAdapter | null = null;
  private static mockAdapter: MockDuelAdapter | null = null;

  static getAdapter(forceOffline: boolean = false): IDuelDataAdapter {
    const isOnline = !forceOffline && navigator.onLine;

    if (isOnline) {
      if (!this.firebaseAdapter) {
        this.firebaseAdapter = new FirebaseDuelAdapter();
      }
      return this.firebaseAdapter;
    } else {
      if (!this.mockAdapter) {
        this.mockAdapter = new MockDuelAdapter();
      }
      return this.mockAdapter;
    }
  }

  static getMockAdapter(): MockDuelAdapter {
    if (!this.mockAdapter) {
      this.mockAdapter = new MockDuelAdapter();
    }
    return this.mockAdapter;
  }

  static reset() {
    this.firebaseAdapter = null;
    this.mockAdapter = null;
  }
}

// Export the main adapter instance
export const duelDataAdapter = DuelDataAdapterFactory.getAdapter();
