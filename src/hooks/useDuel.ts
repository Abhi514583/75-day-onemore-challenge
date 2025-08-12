import { useState, useEffect, useCallback } from "react";
import { Unsubscribe } from "firebase/firestore";
import {
  duelService,
  DuelConfig,
  DuelCreateResult,
  DuelJoinResult,
  DuelSubmitResult,
  MatchmakingCriteria,
} from "../services/DuelService";
import { Duel } from "../types/firebase";
import useAuth from "./useAuth";

export interface UseDuelReturn {
  // State
  activeDuels: Duel[];
  isLoading: boolean;
  error: string | null;

  // Actions
  createDuel: (config: DuelConfig) => Promise<DuelCreateResult>;
  joinDuel: (duelId: string) => Promise<DuelJoinResult>;
  submitScore: (duelId: string, score: number) => Promise<DuelSubmitResult>;
  forfeitDuel: (duelId: string) => Promise<DuelSubmitResult>;
  findAvailableDuels: (criteria: MatchmakingCriteria) => Promise<Duel[]>;
  subscribeToDuel: (
    duelId: string,
    callback: (duel: Duel | null) => void
  ) => Unsubscribe;
  refreshUserDuels: () => Promise<void>;

  // Utilities
  getDuelRemainingTime: (duel: Duel) => number;
  isDuelExpired: (duel: Duel) => boolean;
}

export const useDuel = (): UseDuelReturn => {
  const [activeDuels, setActiveDuels] = useState<Duel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();

  // Load user's active duels
  const refreshUserDuels = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const duels = await duelService.getUserDuels(user.uid);
      setActiveDuels(duels);
    } catch (err: any) {
      setError(err.message || "Failed to load duels");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Load duels when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      refreshUserDuels();
    } else {
      setActiveDuels([]);
    }
  }, [isAuthenticated, refreshUserDuels]);

  // Create duel
  const createDuel = useCallback(
    async (config: DuelConfig): Promise<DuelCreateResult> => {
      setError(null);

      try {
        const result = await duelService.createDuel(config);

        if (result.success) {
          // Refresh duels list
          await refreshUserDuels();
        } else {
          setError(result.error || "Failed to create duel");
        }

        return result;
      } catch (err: any) {
        const error = err.message || "Failed to create duel";
        setError(error);
        return { success: false, error };
      }
    },
    [refreshUserDuels]
  );

  // Join duel
  const joinDuel = useCallback(
    async (duelId: string): Promise<DuelJoinResult> => {
      setError(null);

      try {
        const result = await duelService.joinDuel(duelId);

        if (result.success) {
          // Refresh duels list
          await refreshUserDuels();
        } else {
          setError(result.error || "Failed to join duel");
        }

        return result;
      } catch (err: any) {
        const error = err.message || "Failed to join duel";
        setError(error);
        return { success: false, error };
      }
    },
    [refreshUserDuels]
  );

  // Submit score
  const submitScore = useCallback(
    async (duelId: string, score: number): Promise<DuelSubmitResult> => {
      setError(null);

      try {
        const result = await duelService.submitScore(duelId, score);

        if (result.success) {
          // Update local duel state
          setActiveDuels((prev) =>
            prev.map((duel) =>
              duel.id === duelId && result.duel ? result.duel : duel
            )
          );
        } else {
          setError(result.error || "Failed to submit score");
        }

        return result;
      } catch (err: any) {
        const error = err.message || "Failed to submit score";
        setError(error);
        return { success: false, error };
      }
    },
    []
  );

  // Forfeit duel
  const forfeitDuel = useCallback(
    async (duelId: string): Promise<DuelSubmitResult> => {
      setError(null);

      try {
        const result = await duelService.forfeitDuel(duelId);

        if (result.success) {
          // Refresh duels list
          await refreshUserDuels();
        } else {
          setError(result.error || "Failed to forfeit duel");
        }

        return result;
      } catch (err: any) {
        const error = err.message || "Failed to forfeit duel";
        setError(error);
        return { success: false, error };
      }
    },
    [refreshUserDuels]
  );

  // Find available duels
  const findAvailableDuels = useCallback(
    async (criteria: MatchmakingCriteria): Promise<Duel[]> => {
      setError(null);

      try {
        return await duelService.findAvailableDuels(criteria);
      } catch (err: any) {
        setError(err.message || "Failed to find available duels");
        return [];
      }
    },
    []
  );

  // Subscribe to duel updates
  const subscribeToDuel = useCallback(
    (duelId: string, callback: (duel: Duel | null) => void): Unsubscribe => {
      return duelService.subscribeToDuel(duelId, callback);
    },
    []
  );

  // Utility functions
  const getDuelRemainingTime = useCallback((duel: Duel): number => {
    return duelService.getDuelRemainingTime(duel);
  }, []);

  const isDuelExpired = useCallback((duel: Duel): boolean => {
    return duelService.isDuelExpired(duel);
  }, []);

  return {
    // State
    activeDuels,
    isLoading,
    error,

    // Actions
    createDuel,
    joinDuel,
    submitScore,
    forfeitDuel,
    findAvailableDuels,
    subscribeToDuel,
    refreshUserDuels,

    // Utilities
    getDuelRemainingTime,
    isDuelExpired,
  };
};

export default useDuel;
