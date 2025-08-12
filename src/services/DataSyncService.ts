import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { authService } from "./AuthService";
import { syncService } from "./SyncService";
import {
  Attempt,
  PersonalBest,
  ChallengeDay,
  SyncResult,
  QueueStatus,
} from "../types/firebase";
import {
  getCurrentTimestamp,
  formatISODate,
  generateAttemptId,
} from "../utils/firebase";

export interface PendingOperation {
  id: string;
  type: "attempt" | "pb" | "challenge" | "user_profile";
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface SyncStats {
  totalPending: number;
  totalFailed: number;
  lastSyncTime: Date | null;
  isOnline: boolean;
  isSyncing: boolean;
}

class DataSyncService {
  private static instance: DataSyncService;
  private syncQueue: PendingOperation[] = [];
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncListeners: Array<(stats: SyncStats) => void> = [];

  private constructor() {
    this.loadQueueFromStorage();
  }

  static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  /**
   * Add sync stats listener
   */
  addSyncListener(callback: (stats: SyncStats) => void): () => void {
    this.syncListeners.push(callback);

    // Send initial stats
    callback(this.getSyncStats());

    // Return unsubscribe function
    return () => {
      const index = this.syncListeners.indexOf(callback);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current sync statistics
   */
  getSyncStats(): SyncStats {
    const failed = this.syncQueue.filter(
      (op) => op.retryCount >= op.maxRetries
    ).length;

    return {
      totalPending: this.syncQueue.length,
      totalFailed: failed,
      lastSyncTime: null, // Would track from AsyncStorage
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Notify all listeners of sync stats changes
   */
  private notifyListeners(): void {
    const stats = this.getSyncStats();
    this.syncListeners.forEach((callback) => callback(stats));
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(isOnline: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;

    // Process queue when coming back online
    if (wasOffline && isOnline) {
      this.processSyncQueue();
    }

    this.notifyListeners();
  }

  /**
   * Queue an exercise attempt for sync
   */
  async queueAttemptSync(attemptData: {
    exercise: string;
    mode: string;
    score: number;
    sets?: number[];
    isPB: boolean;
    notes?: string;
  }): Promise<void> {
    const operation: PendingOperation = {
      id: generateAttemptId(),
      type: "attempt",
      data: {
        ...attemptData,
        clientAt: getCurrentTimestamp(),
      },
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.syncQueue.push(operation);
    await this.saveQueueToStorage();
    this.notifyListeners();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  /**
   * Queue personal best update for sync
   */
  async queuePersonalBestSync(pbData: {
    exercise: string;
    value: number;
    source: string;
  }): Promise<void> {
    const operation: PendingOperation = {
      id: `pb_${Date.now()}`,
      type: "pb",
      data: {
        ...pbData,
        achievedAt: getCurrentTimestamp(),
      },
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.syncQueue.push(operation);
    await this.saveQueueToStorage();
    this.notifyListeners();

    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  /**
   * Queue challenge day completion for sync
   */
  async queueChallengeDaySync(challengeData: {
    date: string;
    exercises: any;
    completedAt?: Date;
    lightened: boolean;
    earnedXP: number;
  }): Promise<void> {
    const operation: PendingOperation = {
      id: `challenge_${challengeData.date}`,
      type: "challenge",
      data: challengeData,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.syncQueue.push(operation);
    await this.saveQueueToStorage();
    this.notifyListeners();

    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  /**
   * Process the sync queue
   */
  async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    const userId = authService.getCurrentUserId();
    if (!userId) {
      console.log("No authenticated user, skipping sync");
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    const operations = [...this.syncQueue];
    const successfulOperations: string[] = [];

    for (const operation of operations) {
      if (operation.retryCount >= operation.maxRetries) {
        continue; // Skip failed operations
      }

      try {
        await this.syncOperation(userId, operation);
        successfulOperations.push(operation.id);
      } catch (error) {
        console.error(`Sync operation failed:`, error);
        operation.retryCount++;

        // If max retries reached, mark as failed
        if (operation.retryCount >= operation.maxRetries) {
          console.error(`Operation ${operation.id} failed permanently`);
        }
      }
    }

    // Remove successful operations from queue
    this.syncQueue = this.syncQueue.filter(
      (op) => !successfulOperations.includes(op.id)
    );

    await this.saveQueueToStorage();
    this.isSyncing = false;
    this.notifyListeners();
  }

  /**
   * Sync a single operation
   */
  private async syncOperation(
    userId: string,
    operation: PendingOperation
  ): Promise<void> {
    switch (operation.type) {
      case "attempt":
        await this.syncAttempt(userId, operation);
        break;
      case "pb":
        await this.syncPersonalBest(userId, operation);
        break;
      case "challenge":
        await this.syncChallengeDay(userId, operation);
        break;
      case "user_profile":
        await this.syncUserProfile(userId, operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Sync exercise attempt to Firestore
   */
  private async syncAttempt(
    userId: string,
    operation: PendingOperation
  ): Promise<void> {
    const attemptData: Attempt = {
      exercise: operation.data.exercise,
      mode: operation.data.mode,
      score: operation.data.score,
      sets: operation.data.sets || [],
      isPB: operation.data.isPB,
      source: "manual",
      quality: null,
      clientAt: operation.data.clientAt,
      serverAt: getCurrentTimestamp(),
      notes: operation.data.notes,
    };

    const attemptsRef = collection(db, "attempts", userId, "items");
    await addDoc(attemptsRef, attemptData);
  }

  /**
   * Sync personal best to Firestore
   */
  private async syncPersonalBest(
    userId: string,
    operation: PendingOperation
  ): Promise<void> {
    const pbData: PersonalBest = {
      value: operation.data.value,
      achievedAt: operation.data.achievedAt,
      source: operation.data.source,
    };

    const pbRef = doc(db, "pb", userId, operation.data.exercise);
    await setDoc(pbRef, pbData);
  }

  /**
   * Sync challenge day to Firestore
   */
  private async syncChallengeDay(
    userId: string,
    operation: PendingOperation
  ): Promise<void> {
    const challengeData: ChallengeDay = {
      exercises: operation.data.exercises,
      completedAt: operation.data.completedAt ? getCurrentTimestamp() : null,
      lightened: operation.data.lightened,
      earnedXP: operation.data.earnedXP,
    };

    const challengeRef = doc(db, "challengeDays", userId, operation.data.date);
    await setDoc(challengeRef, challengeData);
  }

  /**
   * Sync user profile updates
   */
  private async syncUserProfile(
    userId: string,
    operation: PendingOperation
  ): Promise<void> {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      ...operation.data,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Force sync all pending operations
   */
  async forceSyncAll(): Promise<SyncResult> {
    if (!this.isOnline) {
      return {
        success: false,
        error: { code: "offline", message: "Device is offline" },
      };
    }

    try {
      await this.processSyncQueue();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: { code: error.code || "sync/unknown", message: error.message },
      };
    }
  }

  /**
   * Clear failed operations from queue
   */
  async clearFailedOperations(): Promise<void> {
    this.syncQueue = this.syncQueue.filter(
      (op) => op.retryCount < op.maxRetries
    );
    await this.saveQueueToStorage();
    this.notifyListeners();
  }

  /**
   * Get queue status
   */
  getQueueStatus(): QueueStatus {
    const failed = this.syncQueue.filter(
      (op) => op.retryCount >= op.maxRetries
    ).length;

    return {
      pending: this.syncQueue.length - failed,
      failed,
      lastSync: getCurrentTimestamp(),
    };
  }

  /**
   * Save sync queue to AsyncStorage
   */
  private async saveQueueToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem("sync_queue", JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error("Failed to save sync queue:", error);
    }
  }

  /**
   * Load sync queue from AsyncStorage
   */
  private async loadQueueFromStorage(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem("sync_queue");
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
        this.notifyListeners();
      }
    } catch (error) {
      console.error("Failed to load sync queue:", error);
    }
  }
}

// Export singleton instance
export const dataSyncService = DataSyncService.getInstance();
export default dataSyncService;
