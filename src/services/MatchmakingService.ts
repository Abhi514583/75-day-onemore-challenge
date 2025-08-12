import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { authService } from "./AuthService";
import { duelService, DuelConfig } from "./DuelService";
import { Duel, ExerciseType, User } from "../types/firebase";
import { isWithinTimeWindow } from "../utils/firebase";

export interface MatchmakingRequest {
  exercise: ExerciseType;
  preferredTimeWindow: number; // 600, 1800, or 86400 seconds
  ratingRange: number; // +/- OMR rating difference allowed
  maxWaitTime: number; // Maximum time to wait for a match (seconds)
}

export interface MatchmakingResult {
  success: boolean;
  duelId?: string;
  duel?: Duel;
  matchType: "created" | "joined";
  error?: string;
}

export interface OpponentProfile {
  uid: string;
  username: string;
  avatarUrl: string;
  omrRating: number;
  wins: number;
  losses: number;
  winRate: number;
  isOnline: boolean;
  lastActive: Date;
}

export interface FriendInviteResult {
  success: boolean;
  duelId?: string;
  error?: string;
}

class MatchmakingService {
  private static instance: MatchmakingService;
  private activeMatchmaking: Map<string, NodeJS.Timeout> = new Map();
  private matchmakingListeners: Map<string, Unsubscribe> = new Map();

  private constructor() {}

  static getInstance(): MatchmakingService {
    if (!MatchmakingService.instance) {
      MatchmakingService.instance = new MatchmakingService();
    }
    return MatchmakingService.instance;
  }

  /**
   * Find a random opponent for matchmaking
   */
  async findRandomOpponent(
    request: MatchmakingRequest
  ): Promise<MatchmakingResult> {
    try {
      const userId = authService.getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          matchType: "created",
          error: "User not authenticated",
        };
      }

      // Get user's current OMR rating for the exercise
      const userProfile = await authService.getUserProfile();
      if (!userProfile) {
        return {
          success: false,
          matchType: "created",
          error: "User profile not found",
        };
      }

      const userRating = userProfile.omrRatings?.[request.exercise] || 1200;

      // First, try to find existing duels to join
      const availableDuels = await this.findMatchingDuels(request, userRating);

      if (availableDuels.length > 0) {
        // Join the best matching duel
        const bestMatch = this.selectBestMatch(availableDuels, userRating);
        const joinResult = await duelService.joinDuel(bestMatch.id);

        if (joinResult.success) {
          return {
            success: true,
            duelId: bestMatch.id,
            duel: joinResult.duel,
            matchType: "joined",
          };
        }
      }

      // No suitable duels found, create a new one
      const duelConfig: DuelConfig = {
        exercise: request.exercise,
        matchType: "public",
        windowSec: request.preferredTimeWindow,
      };

      const createResult = await duelService.createDuel(duelConfig);

      if (createResult.success) {
        // Start waiting for an opponent
        this.startMatchmakingWait(createResult.duelId!, request.maxWaitTime);

        return {
          success: true,
          duelId: createResult.duelId,
          duel: createResult.duel,
          matchType: "created",
        };
      }

      return {
        success: false,
        matchType: "created",
        error: createResult.error || "Failed to create duel",
      };
    } catch (error: any) {
      console.error("Matchmaking error:", error);
      return {
        success: false,
        matchType: "created",
        error: error.message || "Matchmaking failed",
      };
    }
  }

  /**
   * Invite a friend to a duel
   */
  async inviteFriend(
    friendId: string,
    config: DuelConfig
  ): Promise<FriendInviteResult> {
    try {
      const userId = authService.getCurrentUserId();
      if (!userId) {
        return { success: false, error: "User not authenticated" };
      }

      // Verify friend exists
      const friendProfile = await authService.getUserProfile(friendId);
      if (!friendProfile) {
        return { success: false, error: "Friend not found" };
      }

      // Create friend duel
      const friendConfig: DuelConfig = {
        ...config,
        matchType: "friend",
        opponentId: friendId,
      };

      const createResult = await duelService.createDuel(friendConfig);

      if (createResult.success) {
        // TODO: Send push notification to friend
        console.log(`Duel invitation sent to ${friendProfile.username}`);

        return {
          success: true,
          duelId: createResult.duelId,
        };
      }

      return {
        success: false,
        error: createResult.error || "Failed to create friend duel",
      };
    } catch (error: any) {
      console.error("Friend invite error:", error);
      return {
        success: false,
        error: error.message || "Failed to invite friend",
      };
    }
  }

  /**
   * Get potential opponents based on rating and activity
   */
  async getPotentialOpponents(
    exercise: ExerciseType,
    ratingRange: number = 200
  ): Promise<OpponentProfile[]> {
    try {
      const userId = authService.getCurrentUserId();
      if (!userId) return [];

      const userProfile = await authService.getUserProfile();
      if (!userProfile) return [];

      const userRating = userProfile.omrRatings?.[exercise] || 1200;
      const minRating = userRating - ratingRange;
      const maxRating = userRating + ratingRange;

      // Query users within rating range
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where(`omrRatings.${exercise}`, ">=", minRating),
        where(`omrRatings.${exercise}`, "<=", maxRating),
        orderBy(`omrRatings.${exercise}`, "desc"),
        limit(20)
      );

      const querySnap = await getDocs(q);
      const opponents: OpponentProfile[] = [];

      for (const docSnap of querySnap.docs) {
        const userData = docSnap.data() as User;

        // Skip self
        if (docSnap.id === userId) continue;

        // Get user's duel stats from leaderboard
        const stats = await this.getUserDuelStats(docSnap.id, exercise);

        opponents.push({
          uid: docSnap.id,
          username: userData.username,
          avatarUrl: userData.avatarUrl,
          omrRating: userData.omrRatings[exercise],
          wins: stats.wins,
          losses: stats.losses,
          winRate:
            stats.wins + stats.losses > 0
              ? stats.wins / (stats.wins + stats.losses)
              : 0,
          isOnline: this.isUserOnline(userData.updatedAt),
          lastActive: userData.updatedAt.toDate(),
        });
      }

      // Sort by rating similarity and online status
      return opponents.sort((a, b) => {
        // Prioritize online users
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;

        // Then by rating similarity
        const aRatingDiff = Math.abs(a.omrRating - userRating);
        const bRatingDiff = Math.abs(b.omrRating - userRating);
        return aRatingDiff - bRatingDiff;
      });
    } catch (error) {
      console.error("Error getting potential opponents:", error);
      return [];
    }
  }

  /**
   * Get user's friends who are available for duels
   */
  async getAvailableFriends(): Promise<OpponentProfile[]> {
    try {
      const userId = authService.getCurrentUserId();
      if (!userId) return [];

      // TODO: Implement friends system
      // For now, return empty array
      return [];
    } catch (error) {
      console.error("Error getting available friends:", error);
      return [];
    }
  }

  /**
   * Cancel active matchmaking
   */
  async cancelMatchmaking(duelId: string): Promise<void> {
    // Clear timeout
    const timeout = this.activeMatchmaking.get(duelId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeMatchmaking.delete(duelId);
    }

    // Clear listener
    const listener = this.matchmakingListeners.get(duelId);
    if (listener) {
      listener();
      this.matchmakingListeners.delete(duelId);
    }

    // TODO: Delete the duel if no one joined
  }

  /**
   * Find existing duels that match criteria
   */
  private async findMatchingDuels(
    request: MatchmakingRequest,
    userRating: number
  ): Promise<Duel[]> {
    try {
      const duelsRef = collection(db, "duels");
      const q = query(
        duelsRef,
        where("matchType", "==", "public"),
        where("status", "==", "pending"),
        where("exercise", "==", request.exercise),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      const querySnap = await getDocs(q);
      const matchingDuels: Duel[] = [];

      for (const docSnap of querySnap.docs) {
        const duel = { id: docSnap.id, ...docSnap.data() } as Duel;

        // Skip own duels
        if (duel.host.uid === authService.getCurrentUserId()) continue;

        // Check if still within time window
        if (!isWithinTimeWindow(duel.createdAt, duel.windowSec)) continue;

        // Get host's rating
        const hostProfile = await authService.getUserProfile(duel.host.uid);
        if (!hostProfile) continue;

        const hostRating = hostProfile.omrRatings?.[request.exercise] || 1200;
        const ratingDiff = Math.abs(hostRating - userRating);

        // Check if within rating range
        if (ratingDiff <= request.ratingRange) {
          matchingDuels.push(duel);
        }
      }

      return matchingDuels;
    } catch (error) {
      console.error("Error finding matching duels:", error);
      return [];
    }
  }

  /**
   * Select the best match from available duels
   */
  private selectBestMatch(duels: Duel[], userRating: number): Duel {
    // For now, select the most recent duel
    // TODO: Implement more sophisticated matching algorithm
    return duels.sort(
      (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
    )[0];
  }

  /**
   * Start waiting for an opponent to join
   */
  private startMatchmakingWait(duelId: string, maxWaitTime: number): void {
    // Set timeout to cancel matchmaking
    const timeout = setTimeout(() => {
      this.cancelMatchmaking(duelId);
    }, maxWaitTime * 1000);

    this.activeMatchmaking.set(duelId, timeout);

    // Listen for duel updates
    const unsubscribe = duelService.subscribeToDuel(duelId, (duel) => {
      if (duel && duel.status === "active") {
        // Match found! Clear timeout
        this.cancelMatchmaking(duelId);
      }
    });

    this.matchmakingListeners.set(duelId, unsubscribe);
  }

  /**
   * Get user's duel statistics
   */
  private async getUserDuelStats(
    userId: string,
    exercise: ExerciseType
  ): Promise<{ wins: number; losses: number }> {
    try {
      const currentSeason = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const rankingRef = doc(
        db,
        "leaderboards",
        exercise,
        currentSeason,
        "rankings",
        userId
      );
      const rankingSnap = await getDoc(rankingRef);

      if (rankingSnap.exists()) {
        const data = rankingSnap.data();
        return {
          wins: data.wins || 0,
          losses: data.losses || 0,
        };
      }

      return { wins: 0, losses: 0 };
    } catch (error) {
      console.error("Error getting user duel stats:", error);
      return { wins: 0, losses: 0 };
    }
  }

  /**
   * Check if user is considered online
   */
  private isUserOnline(lastActive: any): boolean {
    const now = new Date();
    const lastActiveDate = lastActive.toDate
      ? lastActive.toDate()
      : new Date(lastActive);
    const timeDiff = now.getTime() - lastActiveDate.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    // Consider online if active within last 5 minutes
    return minutesDiff <= 5;
  }

  /**
   * Clean up all active matchmaking
   */
  cleanup(): void {
    // Clear all timeouts
    this.activeMatchmaking.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.activeMatchmaking.clear();

    // Clear all listeners
    this.matchmakingListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.matchmakingListeners.clear();
  }
}

// Export singleton instance
export const matchmakingService = MatchmakingService.getInstance();
export default matchmakingService;
