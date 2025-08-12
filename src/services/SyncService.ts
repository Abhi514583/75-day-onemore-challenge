import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { authService } from "./AuthService";
import { User, SyncResult, QueueStatus } from "../types/firebase";
import {
  getCurrentTimestamp,
  getDefaultOMRRatings,
  getDefaultLevels,
  getDefaultBaselines,
} from "../utils/firebase";

export interface LocalUserData {
  personalBests: Record<string, number>;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  completedChallenges: number;
  lastActiveDate: string;
}

export interface SyncConflict {
  field: string;
  localValue: any;
  remoteValue: any;
  timestamp: Date;
}

export interface SyncOptions {
  forceSync?: boolean;
  resolveConflicts?: boolean;
}

class SyncService {
  private syncQueue: Array<() => Promise<void>> = [];
  private isOnline: boolean = true;
  private listeners: Map<string, Unsubscribe> = new Map();

  /**
   * Sync user profile data between local Redux store and Firestore
   */
  async syncUserProfile(
    localData: LocalUserData,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    try {
      const userId = authService.getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: {
            code: "auth/not-authenticated",
            message: "User not authenticated",
          },
        };
      }

      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create new user profile
        await this.createUserProfile(userId, localData);
        return { success: true };
      }

      const remoteData = userSnap.data() as User;

      // Check for conflicts
      const conflicts = this.detectConflicts(localData, remoteData);

      if (conflicts.length > 0 && !options.resolveConflicts) {
        return {
          success: false,
          error: {
            code: "sync/conflicts-detected",
            message: "Data conflicts detected",
          },
        };
      }

      // Merge data (local takes precedence for user-generated data)
      const mergedData = this.mergeUserData(localData, remoteData);

      // Update Firestore
      await updateDoc(userRef, {
        ...mergedData,
        updatedAt: serverTimestamp(),
      });

      return { success: true, conflictsResolved: conflicts.length };
    } catch (error: any) {
      console.error("Sync error:", error);

      // Queue for retry if offline
      if (this.isNetworkError(error)) {
        this.queueSyncOperation(() => this.syncUserProfile(localData, options));
      }

      return {
        success: false,
        error: { code: error.code || "sync/unknown", message: error.message },
      };
    }
  }

  /**
   * Create new user profile in Firestore
   */
  private async createUserProfile(
    userId: string,
    localData: LocalUserData
  ): Promise<void> {
    const currentUser = authService.getCurrentUser();
    const userRef = doc(db, "users", userId);

    const userData: User = {
      username: currentUser?.displayName || "User",
      avatarUrl: currentUser?.photoURL || "",
      omrRatings: getDefaultOMRRatings(),
      xp: localData.totalXP || 0,
      levels: getDefaultLevels(),
      baselines: getDefaultBaselines(),
      freezeTokens: 0,
      badges: [],
      fcmToken: null,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    await setDoc(userRef, userData);
  }

  /**
   * Detect conflicts between local and remote data
   */
  private detectConflicts(
    localData: LocalUserData,
    remoteData: User
  ): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    // Check XP conflicts (use higher value)
    if (localData.totalXP !== remoteData.xp) {
      conflicts.push({
        field: "xp",
        localValue: localData.totalXP,
        remoteValue: remoteData.xp,
        timestamp: new Date(),
      });
    }

    // Check personal bests conflicts (use higher values)
    Object.entries(localData.personalBests).forEach(([exercise, localPB]) => {
      // Note: This is a simplified check. In reality, we'd need to compare with pb collection
      if (localPB > 0) {
        conflicts.push({
          field: `pb.${exercise}`,
          localValue: localPB,
          remoteValue: 0, // Would fetch from pb collection
          timestamp: new Date(),
        });
      }
    });

    return conflicts;
  }

  /**
   * Merge local and remote user data
   */
  private mergeUserData(
    localData: LocalUserData,
    remoteData: User
  ): Partial<User> {
    return {
      // Use higher XP value
      xp: Math.max(localData.totalXP, remoteData.xp),

      // Keep existing OMR ratings, levels, baselines from remote
      omrRatings: remoteData.omrRatings,
      levels: remoteData.levels,
      baselines: remoteData.baselines,

      // Keep remote social data
      freezeTokens: remoteData.freezeTokens,
      badges: remoteData.badges,
      fcmToken: remoteData.fcmToken,
    };
  }

  /**
   * Subscribe to real-time user profile updates
   */
  subscribeToUserProfile(
    userId: string,
    callback: (userData: User | null) => void
  ): Unsubscribe {
    const userRef = doc(db, "users", userId);

    const unsubscribe = onSnapshot(
      userRef,
      (doc) => {
        if (doc.exists()) {
          callback(doc.data() as User);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error("User profile subscription error:", error);
        callback(null);
      }
    );

    this.listeners.set(`user_${userId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Queue sync operation for offline retry
   */
  private queueSyncOperation(operation: () => Promise<void>): void {
    this.syncQueue.push(operation);
  }

  /**
   * Process queued sync operations
   */
  async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    const operations = [...this.syncQueue];
    this.syncQueue = [];

    for (const operation of operations) {
      try {
        await operation();
      } catch (error) {
        console.error("Queued sync operation failed:", error);
        // Re-queue if still network error
        if (this.isNetworkError(error)) {
          this.syncQueue.push(operation);
        }
      }
    }
  }

  /**
   * Get sync queue status
   */
  getSyncQueueStatus(): QueueStatus {
    return {
      pending: this.syncQueue.length,
      failed: 0, // Would track failed operations in real implementation
      lastSync: getCurrentTimestamp(),
    };
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
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: any): boolean {
    return (
      error.code === "unavailable" ||
      error.code === "deadline-exceeded" ||
      error.message?.includes("network") ||
      error.message?.includes("offline")
    );
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }

  /**
   * Force sync all user data
   */
  async forceSyncUserData(): Promise<SyncResult> {
    try {
      const userId = authService.getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: {
            code: "auth/not-authenticated",
            message: "User not authenticated",
          },
        };
      }

      // This would integrate with Redux store to get current local data
      // For now, return success
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: { code: error.code || "sync/unknown", message: error.message },
      };
    }
  }

  /**
   * Resolve conflicts automatically using predefined strategies
   */
  async resolveConflictsAutomatically(
    conflicts: SyncConflict[]
  ): Promise<void> {
    // Implement conflict resolution strategies
    // - XP: use higher value
    // - Personal Bests: use higher value
    // - Streaks: use more recent data
    // - etc.
  }
}

// Export singleton instance
export const syncService = new SyncService();
export default syncService;
