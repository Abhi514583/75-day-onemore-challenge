import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { authService } from "./AuthService";
import { ExerciseType } from "../types/firebase";
import { getCurrentTimestamp, getCurrentSeasonId } from "../utils/firebase";

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  updatedAt: Date;
}

export interface Friend {
  uid: string;
  username: string;
  avatarUrl: string;
  isOnline: boolean;
  lastActive: Date;
  friendshipDate: Date;
  mutualFriends: number;
  // Stats
  totalXP: number;
  currentStreak: number;
  favoriteExercise: ExerciseType;
}

export interface SocialActivity {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  type: "achievement" | "pb" | "streak" | "duel_win" | "level_up";
  title: string;
  description: string;
  metadata: any;
  createdAt: Date;
  likes: number;
  comments: number;
}

export interface UserSearch {
  uid: string;
  username: string;
  avatarUrl: string;
  totalXP: number;
  currentStreak: number;
  mutualFriends: number;
  isFriend: boolean;
  hasPendingRequest: boolean;
}

class SocialService {
  private static instance: SocialService;
  private activeListeners: Map<string, Unsubscribe> = new Map();

  private constructor() {}

  static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  /**
   * Send a friend request
   */
  async sendFriendRequest(
    targetUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      if (currentUserId === targetUserId) {
        return {
          success: false,
          error: "Cannot send friend request to yourself",
        };
      }

      // Check if request already exists
      const existingRequest = await this.checkExistingFriendRequest(
        currentUserId,
        targetUserId
      );
      if (existingRequest) {
        return { success: false, error: "Friend request already exists" };
      }

      // Check if already friends
      const areFriends = await this.checkIfFriends(currentUserId, targetUserId);
      if (areFriends) {
        return { success: false, error: "Already friends with this user" };
      }

      // Get user profiles
      const [currentUser, targetUser] = await Promise.all([
        authService.getUserProfile(currentUserId),
        authService.getUserProfile(targetUserId),
      ]);

      if (!currentUser || !targetUser) {
        return { success: false, error: "User profile not found" };
      }

      // Create friend request
      const friendRequestsRef = collection(db, "friendRequests");
      await addDoc(friendRequestsRef, {
        fromUserId: currentUserId,
        fromUsername: currentUser.username,
        toUserId: targetUserId,
        toUsername: targetUser.username,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      return {
        success: false,
        error: error.message || "Failed to send friend request",
      };
    }
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(
    requestId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      const requestRef = doc(db, "friendRequests", requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        return { success: false, error: "Friend request not found" };
      }

      const requestData = requestSnap.data();

      if (requestData.toUserId !== currentUserId) {
        return {
          success: false,
          error: "Not authorized to accept this request",
        };
      }

      if (requestData.status !== "pending") {
        return { success: false, error: "Friend request is no longer pending" };
      }

      const batch = writeBatch(db);

      // Update friend request status
      batch.update(requestRef, {
        status: "accepted",
        updatedAt: serverTimestamp(),
      });

      // Create friendship records for both users
      const friendshipsRef = collection(db, "friendships");

      // User 1 -> User 2
      const friendship1Ref = doc(friendshipsRef);
      batch.set(friendship1Ref, {
        userId: currentUserId,
        friendId: requestData.fromUserId,
        friendUsername: requestData.fromUsername,
        createdAt: serverTimestamp(),
      });

      // User 2 -> User 1
      const friendship2Ref = doc(friendshipsRef);
      batch.set(friendship2Ref, {
        userId: requestData.fromUserId,
        friendId: currentUserId,
        friendUsername: requestData.toUsername,
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      return {
        success: false,
        error: error.message || "Failed to accept friend request",
      };
    }
  }

  /**
   * Decline a friend request
   */
  async declineFriendRequest(
    requestId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      const requestRef = doc(db, "friendRequests", requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        return { success: false, error: "Friend request not found" };
      }

      const requestData = requestSnap.data();

      if (requestData.toUserId !== currentUserId) {
        return {
          success: false,
          error: "Not authorized to decline this request",
        };
      }

      await updateDoc(requestRef, {
        status: "declined",
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error declining friend request:", error);
      return {
        success: false,
        error: error.message || "Failed to decline friend request",
      };
    }
  }

  /**
   * Remove a friend
   */
  async removeFriend(
    friendId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      // Find and delete both friendship records
      const friendshipsRef = collection(db, "friendships");

      const [friendship1Query, friendship2Query] = await Promise.all([
        getDocs(
          query(
            friendshipsRef,
            where("userId", "==", currentUserId),
            where("friendId", "==", friendId)
          )
        ),
        getDocs(
          query(
            friendshipsRef,
            where("userId", "==", friendId),
            where("friendId", "==", currentUserId)
          )
        ),
      ]);

      const batch = writeBatch(db);

      friendship1Query.forEach((doc) => {
        batch.delete(doc.ref);
      });

      friendship2Query.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      return { success: true };
    } catch (error: any) {
      console.error("Error removing friend:", error);
      return {
        success: false,
        error: error.message || "Failed to remove friend",
      };
    }
  }

  /**
   * Get user's friends list
   */
  async getFriends(userId?: string): Promise<Friend[]> {
    try {
      const uid = userId || authService.getCurrentUserId();
      if (!uid) return [];

      const friendshipsRef = collection(db, "friendships");
      const q = query(
        friendshipsRef,
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
      );

      const querySnap = await getDocs(q);
      const friends: Friend[] = [];

      for (const docSnap of querySnap.docs) {
        const friendshipData = docSnap.data();

        // Get friend's profile
        const friendProfile = await authService.getUserProfile(
          friendshipData.friendId
        );
        if (!friendProfile) continue;

        // Check if friend is online (active within last 5 minutes)
        const isOnline = this.isUserOnline(friendProfile.updatedAt);

        friends.push({
          uid: friendshipData.friendId,
          username: friendProfile.username,
          avatarUrl: friendProfile.avatarUrl,
          isOnline,
          lastActive: friendProfile.updatedAt.toDate(),
          friendshipDate: friendshipData.createdAt.toDate(),
          mutualFriends: 0, // TODO: Calculate mutual friends
          totalXP: friendProfile.xp,
          currentStreak: 0, // TODO: Get from challenge data
          favoriteExercise: "pushups", // TODO: Calculate from user's activity
        });
      }

      return friends;
    } catch (error) {
      console.error("Error getting friends:", error);
      return [];
    }
  }

  /**
   * Get pending friend requests
   */
  async getPendingFriendRequests(): Promise<FriendRequest[]> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) return [];

      const requestsRef = collection(db, "friendRequests");
      const q = query(
        requestsRef,
        where("toUserId", "==", currentUserId),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      );

      const querySnap = await getDocs(q);
      const requests: FriendRequest[] = [];

      querySnap.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername,
          toUserId: data.toUserId,
          toUsername: data.toUsername,
          status: data.status,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      return requests;
    } catch (error) {
      console.error("Error getting pending friend requests:", error);
      return [];
    }
  }

  /**
   * Search for users
   */
  async searchUsers(
    searchTerm: string,
    limit: number = 20
  ): Promise<UserSearch[]> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) return [];

      // Simple search by username (case-insensitive)
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("username"), limit(limit));

      const querySnap = await getDocs(q);
      const users: UserSearch[] = [];

      for (const docSnap of querySnap.docs) {
        const userData = docSnap.data();

        // Skip current user
        if (docSnap.id === currentUserId) continue;

        // Filter by search term
        if (
          !userData.username.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          continue;
        }

        // Check friendship status
        const [isFriend, hasPendingRequest] = await Promise.all([
          this.checkIfFriends(currentUserId, docSnap.id),
          this.checkExistingFriendRequest(currentUserId, docSnap.id),
        ]);

        users.push({
          uid: docSnap.id,
          username: userData.username,
          avatarUrl: userData.avatarUrl,
          totalXP: userData.xp,
          currentStreak: 0, // TODO: Get from challenge data
          mutualFriends: 0, // TODO: Calculate mutual friends
          isFriend,
          hasPendingRequest: !!hasPendingRequest,
        });
      }

      return users;
    } catch (error) {
      console.error("Error searching users:", error);
      return [];
    }
  }

  /**
   * Get social activity feed
   */
  async getSocialActivityFeed(limit: number = 50): Promise<SocialActivity[]> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) return [];

      // Get user's friends
      const friends = await this.getFriends();
      const friendIds = friends.map((f) => f.uid);
      friendIds.push(currentUserId); // Include own activities

      // TODO: Implement activity feed from activities collection
      // For now, return empty array
      return [];
    } catch (error) {
      console.error("Error getting social activity feed:", error);
      return [];
    }
  }

  /**
   * Block a user
   */
  async blockUser(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      // Remove friendship if exists
      await this.removeFriend(userId);

      // Add to blocked users list
      const blockedUsersRef = collection(db, "blockedUsers");
      await addDoc(blockedUsersRef, {
        userId: currentUserId,
        blockedUserId: userId,
        createdAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error blocking user:", error);
      return { success: false, error: error.message || "Failed to block user" };
    }
  }

  /**
   * Check if two users are friends
   */
  private async checkIfFriends(
    userId1: string,
    userId2: string
  ): Promise<boolean> {
    try {
      const friendshipsRef = collection(db, "friendships");
      const q = query(
        friendshipsRef,
        where("userId", "==", userId1),
        where("friendId", "==", userId2)
      );

      const querySnap = await getDocs(q);
      return !querySnap.empty;
    } catch (error) {
      console.error("Error checking friendship:", error);
      return false;
    }
  }

  /**
   * Check if friend request exists between users
   */
  private async checkExistingFriendRequest(
    fromUserId: string,
    toUserId: string
  ): Promise<FriendRequest | null> {
    try {
      const requestsRef = collection(db, "friendRequests");
      const q = query(
        requestsRef,
        where("fromUserId", "==", fromUserId),
        where("toUserId", "==", toUserId),
        where("status", "==", "pending")
      );

      const querySnap = await getDocs(q);
      if (querySnap.empty) return null;

      const doc = querySnap.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        fromUserId: data.fromUserId,
        fromUsername: data.fromUsername,
        toUserId: data.toUserId,
        toUsername: data.toUsername,
        status: data.status,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    } catch (error) {
      console.error("Error checking existing friend request:", error);
      return null;
    }
  }

  /**
   * Check if user is online
   */
  private isUserOnline(lastActive: any): boolean {
    const now = new Date();
    const lastActiveDate = lastActive.toDate
      ? lastActive.toDate()
      : new Date(lastActive);
    const timeDiff = now.getTime() - lastActiveDate.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    return minutesDiff <= 5; // Online if active within last 5 minutes
  }

  /**
   * Subscribe to friend requests
   */
  subscribeToPendingRequests(
    callback: (requests: FriendRequest[]) => void
  ): Unsubscribe {
    const currentUserId = authService.getCurrentUserId();
    if (!currentUserId) {
      return () => {};
    }

    const requestsRef = collection(db, "friendRequests");
    const q = query(
      requestsRef,
      where("toUserId", "==", currentUserId),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnap) => {
      const requests: FriendRequest[] = [];
      querySnap.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername,
          toUserId: data.toUserId,
          toUsername: data.toUsername,
          status: data.status,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });
      callback(requests);
    });

    this.activeListeners.set("pendingRequests", unsubscribe);
    return unsubscribe;
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    this.activeListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.activeListeners.clear();
  }
}

// Export singleton instance
export const socialService = SocialService.getInstance();
export default socialService;
