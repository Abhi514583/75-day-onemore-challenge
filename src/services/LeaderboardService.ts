import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { authService } from "./AuthService";
import { socialService } from "./SocialService";
import { ExerciseType } from "../types/firebase";
import { getCurrentSeasonId } from "../utils/firebase";

export interface LeaderboardEntry {
  uid: string;
  username: string;
  avatarUrl: string;
  rank: number;
  omrRating: number;
  wins: number;
  losses: number;
  winRate: number;
  totalDuels: number;
  personalBest: number;
  currentStreak: number;
  totalXP: number;
  isFriend: boolean;
  isCurrentUser: boolean;
}

export interface UserRanking {
  rank: number;
  totalUsers: number;
  percentile: number;
  omrRating: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface LeaderboardFilters {
  exercise: ExerciseType;
  season?: string;
  friendsOnly?: boolean;
  timeframe?: "all" | "season" | "month" | "week";
  limit?: number;
}

export interface SeasonInfo {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

class LeaderboardService {
  private static instance: LeaderboardService;
  private activeListeners: Map<string, Unsubscribe> = new Map();
  private cachedLeaderboards: Map<
    string,
    { data: LeaderboardEntry[]; timestamp: number }
  > = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  /**
   * Get global leaderboard for an exercise
   */
  async getGlobalLeaderboard(
    filters: LeaderboardFilters
  ): Promise<LeaderboardEntry[]> {
    try {
      const cacheKey = this.getCacheKey(filters);

      // Check cache first
      const cached = this.cachedLeaderboards.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const seasonId = filters.season || getCurrentSeasonId();
      const leaderboardRef = collection(
        db,
        "leaderboards",
        filters.exercise,
        seasonId,
        "rankings"
      );

      const q = query(
        leaderboardRef,
        orderBy("omr", "desc"),
        limit(filters.limit || 100)
      );

      const querySnap = await getDocs(q);
      const entries: LeaderboardEntry[] = [];

      // Get current user and friends for context
      const currentUserId = authService.getCurrentUserId();
      const friends = currentUserId ? await socialService.getFriends() : [];
      const friendIds = new Set(friends.map((f) => f.uid));

      let rank = 1;
      for (const docSnap of querySnap.docs) {
        const data = docSnap.data();
        const userId = docSnap.id;

        // Get user profile for additional info
        const userProfile = await authService.getUserProfile(userId);
        if (!userProfile) continue;

        // Get personal best for this exercise
        const personalBest = await this.getUserPersonalBest(
          userId,
          filters.exercise
        );

        const entry: LeaderboardEntry = {
          uid: userId,
          username: data.username,
          avatarUrl: userProfile.avatarUrl,
          rank,
          omrRating: data.omr,
          wins: data.wins,
          losses: data.losses,
          winRate:
            data.wins + data.losses > 0
              ? data.wins / (data.wins + data.losses)
              : 0,
          totalDuels: data.wins + data.losses,
          personalBest: personalBest || 0,
          currentStreak: 0, // TODO: Get from challenge data
          totalXP: userProfile.xp,
          isFriend: friendIds.has(userId),
          isCurrentUser: userId === currentUserId,
        };

        entries.push(entry);
        rank++;
      }

      // Cache the results
      this.cachedLeaderboards.set(cacheKey, {
        data: entries,
        timestamp: Date.now(),
      });

      return entries;
    } catch (error) {
      console.error("Error getting global leaderboard:", error);
      return [];
    }
  }

  /**
   * Get friends-only leaderboard
   */
  async getFriendsLeaderboard(
    filters: LeaderboardFilters
  ): Promise<LeaderboardEntry[]> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) return [];

      // Get user's friends
      const friends = await socialService.getFriends();
      if (friends.length === 0) return [];

      const friendIds = friends.map((f) => f.uid);
      friendIds.push(currentUserId); // Include current user

      const seasonId = filters.season || getCurrentSeasonId();
      const entries: LeaderboardEntry[] = [];

      // Get rankings for each friend
      for (const friendId of friendIds) {
        const rankingRef = doc(
          db,
          "leaderboards",
          filters.exercise,
          seasonId,
          "rankings",
          friendId
        );
        const rankingSnap = await getDoc(rankingRef);

        if (!rankingSnap.exists()) continue;

        const data = rankingSnap.data();
        const userProfile = await authService.getUserProfile(friendId);
        if (!userProfile) continue;

        const personalBest = await this.getUserPersonalBest(
          friendId,
          filters.exercise
        );

        entries.push({
          uid: friendId,
          username: data.username,
          avatarUrl: userProfile.avatarUrl,
          rank: 0, // Will be calculated after sorting
          omrRating: data.omr,
          wins: data.wins,
          losses: data.losses,
          winRate:
            data.wins + data.losses > 0
              ? data.wins / (data.wins + data.losses)
              : 0,
          totalDuels: data.wins + data.losses,
          personalBest: personalBest || 0,
          currentStreak: 0, // TODO: Get from challenge data
          totalXP: userProfile.xp,
          isFriend: friendId !== currentUserId,
          isCurrentUser: friendId === currentUserId,
        });
      }

      // Sort by OMR rating and assign ranks
      entries.sort((a, b) => b.omrRating - a.omrRating);
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return entries;
    } catch (error) {
      console.error("Error getting friends leaderboard:", error);
      return [];
    }
  }

  /**
   * Get user's ranking information
   */
  async getUserRanking(
    userId: string,
    exercise: ExerciseType,
    season?: string
  ): Promise<UserRanking | null> {
    try {
      const seasonId = season || getCurrentSeasonId();
      const rankingRef = doc(
        db,
        "leaderboards",
        exercise,
        seasonId,
        "rankings",
        userId
      );
      const rankingSnap = await getDoc(rankingRef);

      if (!rankingSnap.exists()) {
        return null;
      }

      const data = rankingSnap.data();

      // Get total number of users in this leaderboard
      const leaderboardRef = collection(
        db,
        "leaderboards",
        exercise,
        seasonId,
        "rankings"
      );
      const totalUsersSnap = await getDocs(leaderboardRef);
      const totalUsers = totalUsersSnap.size;

      // Get users with higher rating to determine rank
      const higherRatedQuery = query(
        leaderboardRef,
        where("omr", ">", data.omr)
      );
      const higherRatedSnap = await getDocs(higherRatedQuery);
      const rank = higherRatedSnap.size + 1;

      const percentile =
        totalUsers > 0 ? ((totalUsers - rank + 1) / totalUsers) * 100 : 0;

      return {
        rank,
        totalUsers,
        percentile,
        omrRating: data.omr,
        wins: data.wins,
        losses: data.losses,
        winRate:
          data.wins + data.losses > 0
            ? data.wins / (data.wins + data.losses)
            : 0,
      };
    } catch (error) {
      console.error("Error getting user ranking:", error);
      return null;
    }
  }

  /**
   * Get leaderboard around user's position
   */
  async getLeaderboardAroundUser(
    userId: string,
    exercise: ExerciseType,
    range: number = 10,
    season?: string
  ): Promise<LeaderboardEntry[]> {
    try {
      const userRanking = await this.getUserRanking(userId, exercise, season);
      if (!userRanking) return [];

      const seasonId = season || getCurrentSeasonId();
      const leaderboardRef = collection(
        db,
        "leaderboards",
        exercise,
        seasonId,
        "rankings"
      );

      // Get users around the user's rank
      const startRank = Math.max(1, userRanking.rank - range);
      const endRank = userRanking.rank + range;

      const q = query(leaderboardRef, orderBy("omr", "desc"), limit(endRank));

      const querySnap = await getDocs(q);
      const entries: LeaderboardEntry[] = [];

      const currentUserId = authService.getCurrentUserId();
      const friends = currentUserId ? await socialService.getFriends() : [];
      const friendIds = new Set(friends.map((f) => f.uid));

      let rank = 1;
      for (const docSnap of querySnap.docs) {
        // Only include entries in the desired range
        if (rank < startRank) {
          rank++;
          continue;
        }

        const data = docSnap.data();
        const entryUserId = docSnap.id;

        const userProfile = await authService.getUserProfile(entryUserId);
        if (!userProfile) {
          rank++;
          continue;
        }

        const personalBest = await this.getUserPersonalBest(
          entryUserId,
          exercise
        );

        entries.push({
          uid: entryUserId,
          username: data.username,
          avatarUrl: userProfile.avatarUrl,
          rank,
          omrRating: data.omr,
          wins: data.wins,
          losses: data.losses,
          winRate:
            data.wins + data.losses > 0
              ? data.wins / (data.wins + data.losses)
              : 0,
          totalDuels: data.wins + data.losses,
          personalBest: personalBest || 0,
          currentStreak: 0, // TODO: Get from challenge data
          totalXP: userProfile.xp,
          isFriend: friendIds.has(entryUserId),
          isCurrentUser: entryUserId === currentUserId,
        });

        rank++;
      }

      return entries;
    } catch (error) {
      console.error("Error getting leaderboard around user:", error);
      return [];
    }
  }

  /**
   * Get available seasons
   */
  async getAvailableSeasons(): Promise<SeasonInfo[]> {
    try {
      // For now, generate seasons based on current date
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      const seasons: SeasonInfo[] = [];

      // Generate last 6 months of seasons
      for (let i = 5; i >= 0; i--) {
        const seasonDate = new Date(currentYear, currentMonth - i, 1);
        const seasonId = `${seasonDate.getFullYear()}-${String(
          seasonDate.getMonth() + 1
        ).padStart(2, "0")}`;
        const seasonName = seasonDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

        const startDate = new Date(
          seasonDate.getFullYear(),
          seasonDate.getMonth(),
          1
        );
        const endDate = new Date(
          seasonDate.getFullYear(),
          seasonDate.getMonth() + 1,
          0
        );

        seasons.push({
          id: seasonId,
          name: seasonName,
          startDate,
          endDate,
          isActive: seasonId === getCurrentSeasonId(),
        });
      }

      return seasons;
    } catch (error) {
      console.error("Error getting available seasons:", error);
      return [];
    }
  }

  /**
   * Subscribe to leaderboard updates
   */
  subscribeToLeaderboard(
    filters: LeaderboardFilters,
    callback: (entries: LeaderboardEntry[]) => void
  ): Unsubscribe {
    const seasonId = filters.season || getCurrentSeasonId();
    const leaderboardRef = collection(
      db,
      "leaderboards",
      filters.exercise,
      seasonId,
      "rankings"
    );

    const q = query(
      leaderboardRef,
      orderBy("omr", "desc"),
      limit(filters.limit || 100)
    );

    const unsubscribe = onSnapshot(q, async (querySnap) => {
      const entries: LeaderboardEntry[] = [];

      const currentUserId = authService.getCurrentUserId();
      const friends = currentUserId ? await socialService.getFriends() : [];
      const friendIds = new Set(friends.map((f) => f.uid));

      let rank = 1;
      for (const docSnap of querySnap.docs) {
        const data = docSnap.data();
        const userId = docSnap.id;

        const userProfile = await authService.getUserProfile(userId);
        if (!userProfile) continue;

        const personalBest = await this.getUserPersonalBest(
          userId,
          filters.exercise
        );

        entries.push({
          uid: userId,
          username: data.username,
          avatarUrl: userProfile.avatarUrl,
          rank,
          omrRating: data.omr,
          wins: data.wins,
          losses: data.losses,
          winRate:
            data.wins + data.losses > 0
              ? data.wins / (data.wins + data.losses)
              : 0,
          totalDuels: data.wins + data.losses,
          personalBest: personalBest || 0,
          currentStreak: 0,
          totalXP: userProfile.xp,
          isFriend: friendIds.has(userId),
          isCurrentUser: userId === currentUserId,
        });

        rank++;
      }

      callback(entries);
    });

    const listenerKey = `leaderboard_${filters.exercise}_${seasonId}`;
    this.activeListeners.set(listenerKey, unsubscribe);

    return unsubscribe;
  }

  /**
   * Get user's personal best for an exercise
   */
  private async getUserPersonalBest(
    userId: string,
    exercise: ExerciseType
  ): Promise<number | null> {
    try {
      const pbRef = doc(db, "pb", userId, exercise);
      const pbSnap = await getDoc(pbRef);

      if (pbSnap.exists()) {
        return pbSnap.data().value;
      }

      return null;
    } catch (error) {
      console.error("Error getting personal best:", error);
      return null;
    }
  }

  /**
   * Generate cache key for leaderboard filters
   */
  private getCacheKey(filters: LeaderboardFilters): string {
    return `${filters.exercise}_${filters.season || "current"}_${
      filters.friendsOnly ? "friends" : "global"
    }_${filters.limit || 100}`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedLeaderboards.clear();
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    this.activeListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.activeListeners.clear();
    this.clearCache();
  }
}

// Export singleton instance
export const leaderboardService = LeaderboardService.getInstance();
export default leaderboardService;
