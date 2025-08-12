import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { authService } from "./AuthService";
import {
  Duel,
  DuelParticipant,
  ExerciseType,
  MatchType,
  DuelStatus,
  TieBreaker,
} from "../types/firebase";
import {
  getCurrentTimestamp,
  getCurrentSeasonId,
  generateDuelId,
  getTimeWindowOptions,
  isWithinTimeWindow,
  getRemainingTime,
} from "../utils/firebase";

export interface DuelConfig {
  exercise: ExerciseType;
  matchType: MatchType;
  windowSec: number;
  opponentId?: string; // For friend duels
}

export interface DuelCreateResult {
  success: boolean;
  duelId?: string;
  duel?: Duel;
  error?: string;
}

export interface DuelJoinResult {
  success: boolean;
  duel?: Duel;
  error?: string;
}

export interface DuelSubmitResult {
  success: boolean;
  duel?: Duel;
  isComplete?: boolean;
  winner?: string;
  error?: string;
}

export interface MatchmakingCriteria {
  exercise: ExerciseType;
  ratingRange?: number; // +/- rating difference allowed
  maxWaitTime?: number; // seconds to wait for match
}

export interface DuelUpdateCallback {
  (duel: Duel | null): void;
}

class DuelService {
  private static instance: DuelService;
  private activeListeners: Map<string, Unsubscribe> = new Map();

  private constructor() {}

  static getInstance(): DuelService {
    if (!DuelService.instance) {
      DuelService.instance = new DuelService();
    }
    return DuelService.instance;
  }

  /**
   * Create a new duel
   */
  async createDuel(config: DuelConfig): Promise<DuelCreateResult> {
    try {
      const currentUser = authService.getCurrentUser();
      const userId = authService.getCurrentUserId();

      if (!currentUser || !userId) {
        return { success: false, error: "User not authenticated" };
      }

      // Get user profile for username
      const userProfile = await authService.getUserProfile();
      if (!userProfile) {
        return { success: false, error: "User profile not found" };
      }

      const host: DuelParticipant = {
        uid: userId,
        username: userProfile.username,
      };

      let guest: DuelParticipant | null = null;

      // For friend duels, get opponent info
      if (config.matchType === "friend" && config.opponentId) {
        const opponentProfile = await authService.getUserProfile(
          config.opponentId
        );
        if (!opponentProfile) {
          return { success: false, error: "Opponent not found" };
        }

        guest = {
          uid: config.opponentId,
          username: opponentProfile.username,
        };
      }

      const now = getCurrentTimestamp();
      const duelData: Omit<Duel, "id"> = {
        exercise: config.exercise,
        matchType: config.matchType,
        windowSec: config.windowSec,
        host,
        guest,
        status: "pending",
        hostScore: null,
        guestScore: null,
        winnerUid: null,
        tieBreaker: null,
        seasonId: getCurrentSeasonId(),
        createdAt: now,
        activatedAt: now,
        completedAt: now,
      };

      const duelsRef = collection(db, "duels");
      const docRef = await addDoc(duelsRef, duelData);

      const duel: Duel = {
        id: docRef.id,
        ...duelData,
      };

      return {
        success: true,
        duelId: docRef.id,
        duel,
      };
    } catch (error: any) {
      console.error("Error creating duel:", error);
      return {
        success: false,
        error: error.message || "Failed to create duel",
      };
    }
  }

  /**
   * Join an existing duel
   */
  async joinDuel(duelId: string): Promise<DuelJoinResult> {
    try {
      const currentUser = authService.getCurrentUser();
      const userId = authService.getCurrentUserId();

      if (!currentUser || !userId) {
        return { success: false, error: "User not authenticated" };
      }

      const userProfile = await authService.getUserProfile();
      if (!userProfile) {
        return { success: false, error: "User profile not found" };
      }

      const duelRef = doc(db, "duels", duelId);
      const duelSnap = await getDoc(duelRef);

      if (!duelSnap.exists()) {
        return { success: false, error: "Duel not found" };
      }

      const duel = { id: duelSnap.id, ...duelSnap.data() } as Duel;

      // Check if duel is joinable
      if (duel.status !== "pending") {
        return { success: false, error: "Duel is no longer available" };
      }

      if (duel.guest !== null) {
        return { success: false, error: "Duel is already full" };
      }

      if (duel.host.uid === userId) {
        return { success: false, error: "Cannot join your own duel" };
      }

      // Check if duel is still within time window
      if (!isWithinTimeWindow(duel.createdAt, duel.windowSec)) {
        return { success: false, error: "Duel has expired" };
      }

      const guest: DuelParticipant = {
        uid: userId,
        username: userProfile.username,
      };

      // Update duel with guest and activate
      await updateDoc(duelRef, {
        guest,
        status: "active",
        activatedAt: serverTimestamp(),
      });

      const updatedDuel: Duel = {
        ...duel,
        guest,
        status: "active",
        activatedAt: getCurrentTimestamp(),
      };

      return {
        success: true,
        duel: updatedDuel,
      };
    } catch (error: any) {
      console.error("Error joining duel:", error);
      return {
        success: false,
        error: error.message || "Failed to join duel",
      };
    }
  }

  /**
   * Submit score for a duel
   */
  async submitScore(duelId: string, score: number): Promise<DuelSubmitResult> {
    try {
      const userId = authService.getCurrentUserId();

      if (!userId) {
        return { success: false, error: "User not authenticated" };
      }

      const duelRef = doc(db, "duels", duelId);
      const duelSnap = await getDoc(duelRef);

      if (!duelSnap.exists()) {
        return { success: false, error: "Duel not found" };
      }

      const duel = { id: duelSnap.id, ...duelSnap.data() } as Duel;

      // Check if user is participant
      const isHost = duel.host.uid === userId;
      const isGuest = duel.guest?.uid === userId;

      if (!isHost && !isGuest) {
        return {
          success: false,
          error: "You are not a participant in this duel",
        };
      }

      // Check if duel is active
      if (duel.status !== "active") {
        return { success: false, error: "Duel is not active" };
      }

      // Check if user already submitted score
      if (
        (isHost && duel.hostScore !== null) ||
        (isGuest && duel.guestScore !== null)
      ) {
        return { success: false, error: "Score already submitted" };
      }

      // Check if still within time window
      if (!isWithinTimeWindow(duel.activatedAt, duel.windowSec)) {
        return { success: false, error: "Duel time window has expired" };
      }

      // Update score
      const updateData: any = {};
      if (isHost) {
        updateData.hostScore = score;
      } else {
        updateData.guestScore = score;
      }

      // Check if this completes the duel
      const hostScore = isHost ? score : duel.hostScore;
      const guestScore = isGuest ? score : duel.guestScore;

      let isComplete = false;
      let winner: string | null = null;
      let tieBreaker: TieBreaker = null;

      if (hostScore !== null && guestScore !== null) {
        isComplete = true;
        updateData.status = "completed";
        updateData.completedAt = serverTimestamp();

        // Determine winner
        if (hostScore > guestScore) {
          winner = duel.host.uid;
          updateData.winnerUid = winner;
        } else if (guestScore > hostScore) {
          winner = duel.guest!.uid;
          updateData.winnerUid = winner;
        } else {
          // Tie - use tie breaker (for now, random)
          tieBreaker = "coin";
          winner = Math.random() < 0.5 ? duel.host.uid : duel.guest!.uid;
          updateData.winnerUid = winner;
          updateData.tieBreaker = tieBreaker;
        }
      }

      await updateDoc(duelRef, updateData);

      const updatedDuel: Duel = {
        ...duel,
        hostScore,
        guestScore,
        status: isComplete ? "completed" : "active",
        winnerUid: winner,
        tieBreaker,
        completedAt: isComplete ? getCurrentTimestamp() : duel.completedAt,
      };

      return {
        success: true,
        duel: updatedDuel,
        isComplete,
        winner: winner || undefined,
      };
    } catch (error: any) {
      console.error("Error submitting score:", error);
      return {
        success: false,
        error: error.message || "Failed to submit score",
      };
    }
  }

  /**
   * Subscribe to real-time duel updates
   */
  subscribeToDuel(duelId: string, callback: DuelUpdateCallback): Unsubscribe {
    const duelRef = doc(db, "duels", duelId);

    const unsubscribe = onSnapshot(
      duelRef,
      (doc) => {
        if (doc.exists()) {
          const duel: Duel = {
            id: doc.id,
            ...doc.data(),
          } as Duel;
          callback(duel);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error("Duel subscription error:", error);
        callback(null);
      }
    );

    // Store listener for cleanup
    this.activeListeners.set(`duel_${duelId}`, unsubscribe);

    return unsubscribe;
  }

  /**
   * Get user's active duels
   */
  async getUserDuels(userId?: string): Promise<Duel[]> {
    try {
      const uid = userId || authService.getCurrentUserId();
      if (!uid) return [];

      const duelsRef = collection(db, "duels");

      // Query for duels where user is host
      const hostQuery = query(
        duelsRef,
        where("host.uid", "==", uid),
        where("status", "in", ["pending", "active"]),
        orderBy("createdAt", "desc"),
        limit(20)
      );

      // Query for duels where user is guest
      const guestQuery = query(
        duelsRef,
        where("guest.uid", "==", uid),
        where("status", "in", ["pending", "active"]),
        orderBy("createdAt", "desc"),
        limit(20)
      );

      const [hostSnap, guestSnap] = await Promise.all([
        getDocs(hostQuery),
        getDocs(guestQuery),
      ]);

      const duels: Duel[] = [];

      hostSnap.forEach((doc) => {
        duels.push({ id: doc.id, ...doc.data() } as Duel);
      });

      guestSnap.forEach((doc) => {
        duels.push({ id: doc.id, ...doc.data() } as Duel);
      });

      // Remove duplicates and sort by creation date
      const uniqueDuels = duels.filter(
        (duel, index, self) => index === self.findIndex((d) => d.id === duel.id)
      );

      return uniqueDuels.sort(
        (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
      );
    } catch (error) {
      console.error("Error fetching user duels:", error);
      return [];
    }
  }

  /**
   * Find available duels for matchmaking
   */
  async findAvailableDuels(criteria: MatchmakingCriteria): Promise<Duel[]> {
    try {
      const userId = authService.getCurrentUserId();
      if (!userId) return [];

      const duelsRef = collection(db, "duels");

      const q = query(
        duelsRef,
        where("matchType", "==", "public"),
        where("status", "==", "pending"),
        where("exercise", "==", criteria.exercise),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      const querySnap = await getDocs(q);
      const duels: Duel[] = [];

      querySnap.forEach((doc) => {
        const duel = { id: doc.id, ...doc.data() } as Duel;

        // Don't include own duels
        if (duel.host.uid !== userId) {
          // Check if still within time window
          if (isWithinTimeWindow(duel.createdAt, duel.windowSec)) {
            duels.push(duel);
          }
        }
      });

      return duels;
    } catch (error) {
      console.error("Error finding available duels:", error);
      return [];
    }
  }

  /**
   * Get remaining time for a duel
   */
  getDuelRemainingTime(duel: Duel): number {
    const startTime =
      duel.status === "active" ? duel.activatedAt : duel.createdAt;
    return getRemainingTime(startTime, duel.windowSec);
  }

  /**
   * Check if duel is expired
   */
  isDuelExpired(duel: Duel): boolean {
    const startTime =
      duel.status === "active" ? duel.activatedAt : duel.createdAt;
    return !isWithinTimeWindow(startTime, duel.windowSec);
  }

  /**
   * Forfeit a duel
   */
  async forfeitDuel(duelId: string): Promise<DuelSubmitResult> {
    try {
      const userId = authService.getCurrentUserId();

      if (!userId) {
        return { success: false, error: "User not authenticated" };
      }

      const duelRef = doc(db, "duels", duelId);
      const duelSnap = await getDoc(duelRef);

      if (!duelSnap.exists()) {
        return { success: false, error: "Duel not found" };
      }

      const duel = { id: duelSnap.id, ...duelSnap.data() } as Duel;

      // Check if user is participant
      const isHost = duel.host.uid === userId;
      const isGuest = duel.guest?.uid === userId;

      if (!isHost && !isGuest) {
        return {
          success: false,
          error: "You are not a participant in this duel",
        };
      }

      // Determine winner (opponent)
      const winner = isHost ? duel.guest?.uid : duel.host.uid;

      await updateDoc(duelRef, {
        status: "forfeit",
        winnerUid: winner,
        completedAt: serverTimestamp(),
      });

      const updatedDuel: Duel = {
        ...duel,
        status: "forfeit",
        winnerUid: winner || null,
        completedAt: getCurrentTimestamp(),
      };

      return {
        success: true,
        duel: updatedDuel,
        isComplete: true,
        winner,
      };
    } catch (error: any) {
      console.error("Error forfeiting duel:", error);
      return {
        success: false,
        error: error.message || "Failed to forfeit duel",
      };
    }
  }

  /**
   * Clean up all active listeners
   */
  cleanup(): void {
    this.activeListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.activeListeners.clear();
  }
}

// Export singleton instance
export const duelService = DuelService.getInstance();
export default duelService;
