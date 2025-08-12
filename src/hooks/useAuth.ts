import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setAuthState, loadUserProfile } from "../store/slices/authSlice";
import { authService } from "../services/AuthService";
import { syncService } from "../services/SyncService";

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (user) => {
      dispatch(setAuthState({ user }));

      if (user) {
        // Load user profile when authenticated
        dispatch(loadUserProfile(user.uid));

        // Start real-time profile sync
        syncService.subscribeToUserProfile(user.uid, (userData) => {
          if (userData) {
            // Update Redux store with synced data
            // This would integrate with existing user slice
            console.log("User profile updated:", userData);
          }
        });
      } else {
        // Clean up when signed out
        syncService.cleanup();
      }
    });

    return unsubscribe;
  }, [dispatch]);

  // Sync user data
  const syncUserData = useCallback(async () => {
    if (!authState.isAuthenticated) return;

    // Get current local data from Redux store
    // This would integrate with existing user slice
    const localData = {
      personalBests: {}, // from userSlice
      totalXP: 0, // from userSlice
      currentStreak: 0, // from challengeSlice
      longestStreak: 0, // from userSlice
      completedChallenges: 0, // from challengeSlice
      lastActiveDate: new Date().toISOString(),
    };

    const result = await syncService.syncUserProfile(localData);
    return result;
  }, [authState.isAuthenticated]);

  // Force sync
  const forceSync = useCallback(async () => {
    return await syncService.forceSyncUserData();
  }, []);

  // Get sync status
  const getSyncStatus = useCallback(() => {
    return syncService.getSyncQueueStatus();
  }, []);

  return {
    // Auth state
    user: authState.user,
    userProfile: authState.userProfile,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    isInitialized: authState.isInitialized,

    // Sync functions
    syncUserData,
    forceSync,
    getSyncStatus,
  };
};

export default useAuth;
