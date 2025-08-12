import { useState, useCallback, useEffect } from "react";
import {
  matchmakingService,
  MatchmakingRequest,
  MatchmakingResult,
  OpponentProfile,
  FriendInviteResult,
} from "../services/MatchmakingService";
import { DuelConfig } from "../services/DuelService";
import { ExerciseType } from "../types/firebase";
import useAuth from "./useAuth";

export interface UseMatchmakingReturn {
  // State
  isSearching: boolean;
  potentialOpponents: OpponentProfile[];
  availableFriends: OpponentProfile[];
  isLoading: boolean;
  error: string | null;

  // Actions
  findRandomOpponent: (
    request: MatchmakingRequest
  ) => Promise<MatchmakingResult>;
  inviteFriend: (
    friendId: string,
    config: DuelConfig
  ) => Promise<FriendInviteResult>;
  cancelMatchmaking: (duelId: string) => Promise<void>;
  loadPotentialOpponents: (
    exercise: ExerciseType,
    ratingRange?: number
  ) => Promise<void>;
  loadAvailableFriends: () => Promise<void>;

  // Utilities
  clearError: () => void;
}

export const useMatchmaking = (): UseMatchmakingReturn => {
  const [isSearching, setIsSearching] = useState(false);
  const [potentialOpponents, setPotentialOpponents] = useState<
    OpponentProfile[]
  >([]);
  const [availableFriends, setAvailableFriends] = useState<OpponentProfile[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Clear data when user signs out
  useEffect(() => {
    if (!isAuthenticated) {
      setPotentialOpponents([]);
      setAvailableFriends([]);
      setIsSearching(false);
      setError(null);
    }
  }, [isAuthenticated]);

  // Find random opponent
  const findRandomOpponent = useCallback(
    async (request: MatchmakingRequest): Promise<MatchmakingResult> => {
      setIsSearching(true);
      setError(null);

      try {
        const result = await matchmakingService.findRandomOpponent(request);

        if (!result.success) {
          setError(result.error || "Matchmaking failed");
        }

        return result;
      } catch (err: any) {
        const error = err.message || "Matchmaking failed";
        setError(error);
        return { success: false, matchType: "created", error };
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  // Invite friend
  const inviteFriend = useCallback(
    async (
      friendId: string,
      config: DuelConfig
    ): Promise<FriendInviteResult> => {
      setError(null);

      try {
        const result = await matchmakingService.inviteFriend(friendId, config);

        if (!result.success) {
          setError(result.error || "Failed to invite friend");
        }

        return result;
      } catch (err: any) {
        const error = err.message || "Failed to invite friend";
        setError(error);
        return { success: false, error };
      }
    },
    []
  );

  // Cancel matchmaking
  const cancelMatchmaking = useCallback(
    async (duelId: string): Promise<void> => {
      setIsSearching(false);
      setError(null);

      try {
        await matchmakingService.cancelMatchmaking(duelId);
      } catch (err: any) {
        setError(err.message || "Failed to cancel matchmaking");
      }
    },
    []
  );

  // Load potential opponents
  const loadPotentialOpponents = useCallback(
    async (
      exercise: ExerciseType,
      ratingRange: number = 200
    ): Promise<void> => {
      if (!isAuthenticated) return;

      setIsLoading(true);
      setError(null);

      try {
        const opponents = await matchmakingService.getPotentialOpponents(
          exercise,
          ratingRange
        );
        setPotentialOpponents(opponents);
      } catch (err: any) {
        setError(err.message || "Failed to load potential opponents");
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated]
  );

  // Load available friends
  const loadAvailableFriends = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const friends = await matchmakingService.getAvailableFriends();
      setAvailableFriends(friends);
    } catch (err: any) {
      setError(err.message || "Failed to load available friends");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      matchmakingService.cleanup();
    };
  }, []);

  return {
    // State
    isSearching,
    potentialOpponents,
    availableFriends,
    isLoading,
    error,

    // Actions
    findRandomOpponent,
    inviteFriend,
    cancelMatchmaking,
    loadPotentialOpponents,
    loadAvailableFriends,

    // Utilities
    clearError,
  };
};

export default useMatchmaking;
