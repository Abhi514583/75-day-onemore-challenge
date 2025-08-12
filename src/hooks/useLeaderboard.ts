import { useState, useEffect, useCallback } from "react";
import {
  leaderboardService,
  LeaderboardEntry,
  UserRanking,
  LeaderboardFilters,
  SeasonInfo,
} from "../services/LeaderboardService";
import { ExerciseType } from "../types/firebase";
import useAuth from "./useAuth";

export interface UseLeaderboardReturn {
  // State
  globalLeaderboard: LeaderboardEntry[];
  friendsLeaderboard: LeaderboardEntry[];
  userRanking: UserRanking | null;
  availableSeasons: SeasonInfo[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadGlobalLeaderboard: (filters: LeaderboardFilters) => Promise<void>;
  loadFriendsLeaderboard: (filters: LeaderboardFilters) => Promise<void>;
  loadUserRanking: (
    userId: string,
    exercise: ExerciseType,
    season?: string
  ) => Promise<void>;
  loadLeaderboardAroundUser: (
    userId: string,
    exercise: ExerciseType,
    range?: number,
    season?: string
  ) => Promise<LeaderboardEntry[]>;
  loadAvailableSeasons: () => Promise<void>;
  subscribeToLeaderboard: (
    filters: LeaderboardFilters,
    callback: (entries: LeaderboardEntry[]) => void
  ) => () => void;

  // Utilities
  clearError: () => void;
  clearCache: () => void;
}

export const useLeaderboard = (): UseLeaderboardReturn => {
  const [globalLeaderboard, setGlobalLeaderboard] = useState<
    LeaderboardEntry[]
  >([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<
    LeaderboardEntry[]
  >([]);
  const [userRanking, setUserRanking] = useState<UserRanking | null>(null);
  const [availableSeasons, setAvailableSeasons] = useState<SeasonInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, user } = useAuth();

  // Load available seasons on mount
  useEffect(() => {
    loadAvailableSeasons();
  }, []);

  // Clear data when signed out
  useEffect(() => {
    if (!isAuthenticated) {
      setGlobalLeaderboard([]);
      setFriendsLeaderboard([]);
      setUserRanking(null);
    }
  }, [isAuthenticated]);

  // Load global leaderboard
  const loadGlobalLeaderboard = useCallback(
    async (filters: LeaderboardFilters) => {
      setIsLoading(true);
      setError(null);

      try {
        const entries = await leaderboardService.getGlobalLeaderboard(filters);
        setGlobalLeaderboard(entries);
      } catch (err: any) {
        setError(err.message || "Failed to load global leaderboard");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Load friends leaderboard
  const loadFriendsLeaderboard = useCallback(
    async (filters: LeaderboardFilters) => {
      if (!isAuthenticated) return;

      setIsLoading(true);
      setError(null);

      try {
        const entries = await leaderboardService.getFriendsLeaderboard(filters);
        setFriendsLeaderboard(entries);
      } catch (err: any) {
        setError(err.message || "Failed to load friends leaderboard");
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated]
  );

  // Load user ranking
  const loadUserRanking = useCallback(
    async (userId: string, exercise: ExerciseType, season?: string) => {
      setError(null);

      try {
        const ranking = await leaderboardService.getUserRanking(
          userId,
          exercise,
          season
        );
        setUserRanking(ranking);
      } catch (err: any) {
        setError(err.message || "Failed to load user ranking");
      }
    },
    []
  );

  // Load leaderboard around user
  const loadLeaderboardAroundUser = useCallback(
    async (
      userId: string,
      exercise: ExerciseType,
      range: number = 10,
      season?: string
    ): Promise<LeaderboardEntry[]> => {
      setError(null);

      try {
        const entries = await leaderboardService.getLeaderboardAroundUser(
          userId,
          exercise,
          range,
          season
        );
        return entries;
      } catch (err: any) {
        setError(err.message || "Failed to load leaderboard around user");
        return [];
      }
    },
    []
  );

  // Load available seasons
  const loadAvailableSeasons = useCallback(async () => {
    setError(null);

    try {
      const seasons = await leaderboardService.getAvailableSeasons();
      setAvailableSeasons(seasons);
    } catch (err: any) {
      setError(err.message || "Failed to load available seasons");
    }
  }, []);

  // Subscribe to leaderboard updates
  const subscribeToLeaderboard = useCallback(
    (
      filters: LeaderboardFilters,
      callback: (entries: LeaderboardEntry[]) => void
    ) => {
      return leaderboardService.subscribeToLeaderboard(filters, callback);
    },
    []
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    leaderboardService.clearCache();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaderboardService.cleanup();
    };
  }, []);

  return {
    // State
    globalLeaderboard,
    friendsLeaderboard,
    userRanking,
    availableSeasons,
    isLoading,
    error,

    // Actions
    loadGlobalLeaderboard,
    loadFriendsLeaderboard,
    loadUserRanking,
    loadLeaderboardAroundUser,
    loadAvailableSeasons,
    subscribeToLeaderboard,

    // Utilities
    clearError,
    clearCache,
  };
};

export default useLeaderboard;
