import { useState, useEffect, useCallback } from "react";
import {
  socialService,
  Friend,
  FriendRequest,
  UserSearch,
  SocialActivity,
} from "../services/SocialService";
import useAuth from "./useAuth";

export interface UseSocialReturn {
  // State
  friends: Friend[];
  pendingRequests: FriendRequest[];
  searchResults: UserSearch[];
  activityFeed: SocialActivity[];
  isLoading: boolean;
  error: string | null;

  // Actions
  sendFriendRequest: (
    userId: string
  ) => Promise<{ success: boolean; error?: string }>;
  acceptFriendRequest: (
    requestId: string
  ) => Promise<{ success: boolean; error?: string }>;
  declineFriendRequest: (
    requestId: string
  ) => Promise<{ success: boolean; error?: string }>;
  removeFriend: (
    friendId: string
  ) => Promise<{ success: boolean; error?: string }>;
  blockUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  searchUsers: (searchTerm: string) => Promise<void>;
  loadFriends: () => Promise<void>;
  loadPendingRequests: () => Promise<void>;
  loadActivityFeed: () => Promise<void>;

  // Utilities
  clearError: () => void;
  clearSearchResults: () => void;
}

export const useSocial = (): UseSocialReturn => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearch[]>([]);
  const [activityFeed, setActivityFeed] = useState<SocialActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, user } = useAuth();

  // Load initial data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadFriends();
      loadPendingRequests();
      loadActivityFeed();
    } else {
      // Clear data when signed out
      setFriends([]);
      setPendingRequests([]);
      setSearchResults([]);
      setActivityFeed([]);
    }
  }, [isAuthenticated]);

  // Subscribe to real-time pending requests
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = socialService.subscribeToPendingRequests((requests) => {
      setPendingRequests(requests);
    });

    return unsubscribe;
  }, [isAuthenticated]);

  // Send friend request
  const sendFriendRequest = useCallback(async (userId: string) => {
    setError(null);

    try {
      const result = await socialService.sendFriendRequest(userId);

      if (result.success) {
        // Update search results to reflect sent request
        setSearchResults((prev) =>
          prev.map((user) =>
            user.uid === userId ? { ...user, hasPendingRequest: true } : user
          )
        );
      } else {
        setError(result.error || "Failed to send friend request");
      }

      return result;
    } catch (err: any) {
      const error = err.message || "Failed to send friend request";
      setError(error);
      return { success: false, error };
    }
  }, []);

  // Accept friend request
  const acceptFriendRequest = useCallback(async (requestId: string) => {
    setError(null);

    try {
      const result = await socialService.acceptFriendRequest(requestId);

      if (result.success) {
        // Refresh friends list and pending requests
        await Promise.all([loadFriends(), loadPendingRequests()]);
      } else {
        setError(result.error || "Failed to accept friend request");
      }

      return result;
    } catch (err: any) {
      const error = err.message || "Failed to accept friend request";
      setError(error);
      return { success: false, error };
    }
  }, []);

  // Decline friend request
  const declineFriendRequest = useCallback(async (requestId: string) => {
    setError(null);

    try {
      const result = await socialService.declineFriendRequest(requestId);

      if (result.success) {
        // Remove from pending requests
        setPendingRequests((prev) =>
          prev.filter((request) => request.id !== requestId)
        );
      } else {
        setError(result.error || "Failed to decline friend request");
      }

      return result;
    } catch (err: any) {
      const error = err.message || "Failed to decline friend request";
      setError(error);
      return { success: false, error };
    }
  }, []);

  // Remove friend
  const removeFriend = useCallback(async (friendId: string) => {
    setError(null);

    try {
      const result = await socialService.removeFriend(friendId);

      if (result.success) {
        // Remove from friends list
        setFriends((prev) => prev.filter((friend) => friend.uid !== friendId));

        // Update search results if present
        setSearchResults((prev) =>
          prev.map((user) =>
            user.uid === friendId ? { ...user, isFriend: false } : user
          )
        );
      } else {
        setError(result.error || "Failed to remove friend");
      }

      return result;
    } catch (err: any) {
      const error = err.message || "Failed to remove friend";
      setError(error);
      return { success: false, error };
    }
  }, []);

  // Block user
  const blockUser = useCallback(async (userId: string) => {
    setError(null);

    try {
      const result = await socialService.blockUser(userId);

      if (result.success) {
        // Remove from friends and search results
        setFriends((prev) => prev.filter((friend) => friend.uid !== userId));
        setSearchResults((prev) => prev.filter((user) => user.uid !== userId));
      } else {
        setError(result.error || "Failed to block user");
      }

      return result;
    } catch (err: any) {
      const error = err.message || "Failed to block user";
      setError(error);
      return { success: false, error };
    }
  }, []);

  // Search users
  const searchUsers = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await socialService.searchUsers(searchTerm.trim());
      setSearchResults(results);
    } catch (err: any) {
      setError(err.message || "Failed to search users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load friends
  const loadFriends = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const friendsList = await socialService.getFriends();
      setFriends(friendsList);
    } catch (err: any) {
      setError(err.message || "Failed to load friends");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load pending requests
  const loadPendingRequests = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const requests = await socialService.getPendingFriendRequests();
      setPendingRequests(requests);
    } catch (err: any) {
      setError(err.message || "Failed to load pending requests");
    }
  }, [isAuthenticated]);

  // Load activity feed
  const loadActivityFeed = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const activities = await socialService.getSocialActivityFeed();
      setActivityFeed(activities);
    } catch (err: any) {
      setError(err.message || "Failed to load activity feed");
    }
  }, [isAuthenticated]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear search results
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socialService.cleanup();
    };
  }, []);

  return {
    // State
    friends,
    pendingRequests,
    searchResults,
    activityFeed,
    isLoading,
    error,

    // Actions
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    blockUser,
    searchUsers,
    loadFriends,
    loadPendingRequests,
    loadActivityFeed,

    // Utilities
    clearError,
    clearSearchResults,
  };
};

export default useSocial;
