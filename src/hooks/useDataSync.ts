import { useEffect, useState, useCallback } from "react";
import { dataSyncService, SyncStats } from "../services/DataSyncService";
import useNetworkStatus from "./useNetworkStatus";

export const useDataSync = () => {
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalPending: 0,
    totalFailed: 0,
    lastSyncTime: null,
    isOnline: true,
    isSyncing: false,
  });

  const { isOnline } = useNetworkStatus();

  // Update sync service with network status
  useEffect(() => {
    dataSyncService.setOnlineStatus(isOnline);
  }, [isOnline]);

  // Subscribe to sync stats updates
  useEffect(() => {
    const unsubscribe = dataSyncService.addSyncListener(setSyncStats);
    return unsubscribe;
  }, []);

  // Sync functions
  const queueAttemptSync = useCallback(
    async (attemptData: {
      exercise: string;
      mode: string;
      score: number;
      sets?: number[];
      isPB: boolean;
      notes?: string;
    }) => {
      await dataSyncService.queueAttemptSync(attemptData);
    },
    []
  );

  const queuePersonalBestSync = useCallback(
    async (pbData: { exercise: string; value: number; source: string }) => {
      await dataSyncService.queuePersonalBestSync(pbData);
    },
    []
  );

  const queueChallengeDaySync = useCallback(
    async (challengeData: {
      date: string;
      exercises: any;
      completedAt?: Date;
      lightened: boolean;
      earnedXP: number;
    }) => {
      await dataSyncService.queueChallengeDaySync(challengeData);
    },
    []
  );

  const forceSyncAll = useCallback(async () => {
    return await dataSyncService.forceSyncAll();
  }, []);

  const clearFailedOperations = useCallback(async () => {
    await dataSyncService.clearFailedOperations();
  }, []);

  const processSyncQueue = useCallback(async () => {
    await dataSyncService.processSyncQueue();
  }, []);

  return {
    // Sync stats
    syncStats,

    // Sync functions
    queueAttemptSync,
    queuePersonalBestSync,
    queueChallengeDaySync,
    forceSyncAll,
    clearFailedOperations,
    processSyncQueue,

    // Computed values
    hasPendingSync: syncStats.totalPending > 0,
    hasFailedSync: syncStats.totalFailed > 0,
    canSync: isOnline && !syncStats.isSyncing,
  };
};

export default useDataSync;
