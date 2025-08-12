import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
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
import { socialService } from "./SocialService";
import { ExerciseType } from "../types/firebase";
import { getCurrentTimestamp } from "../utils/firebase";

export interface Achievement {
  id: string;
  type:
    | "first_pb"
    | "streak_milestone"
    | "duel_win_streak"
    | "level_up"
    | "challenge_complete"
    | "exercise_master";
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlockedAt: Date;
  metadata?: any;
}

export interface SocialPost {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  type: "achievement" | "pb" | "streak" | "duel_win" | "challenge_complete";
  title: string;
  description: string;
  metadata: any;
  likes: number;
  comments: number;
  likedByUser: boolean;
  createdAt: Date;
  visibility: "public" | "friends" | "private";
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  avatarUrl: string;
  content: string;
  createdAt: Date;
}

export interface ActivityStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  achievementsUnlocked: number;
  friendsCount: number;
}

class SocialActivityService {
  private static instance: SocialActivityService;
  private activeListeners: Map<string, Unsubscribe> = new Map();

  private constructor() {}

  static getInstance(): SocialActivityService {
    if (!SocialActivityService.instance) {
      SocialActivityService.instance = new SocialActivityService();
    }
    return SocialActivityService.instance;
  }

  /**
   * Broadcast achievement to friends
   */
  async broadcastAchievement(
    achievement: Achievement
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      const userProfile = await authService.getUserProfile();
      if (!userProfile) {
        return { success: false, error: "User profile not found" };
      }

      // Create social post
      const postsRef = collection(db, "socialPosts");
      await addDoc(postsRef, {
        userId: currentUserId,
        username: userProfile.username,
        avatarUrl: userProfile.avatarUrl,
        type: "achievement",
        title: `🏆 ${achievement.title}`,
        description: achievement.description,
        metadata: {
          achievementId: achievement.id,
          achievementType: achievement.type,
          rarity: achievement.rarity,
          icon: achievement.icon,
        },
        likes: 0,
        comments: 0,
        visibility: "friends",
        createdAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error broadcasting achievement:", error);
      return {
        success: false,
        error: error.message || "Failed to broadcast achievement",
      };
    }
  }

  /**
   * Broadcast personal best
   */
  async broadcastPersonalBest(
    exercise: ExerciseType,
    newPB: number,
    previousPB: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      const userProfile = await authService.getUserProfile();
      if (!userProfile) {
        return { success: false, error: "User profile not found" };
      }

      const exerciseNames = {
        pushups: "Push-ups",
        squats: "Squats",
        situps: "Sit-ups",
        planks: "Plank",
      };

      const unit = exercise === "planks" ? "seconds" : "reps";
      const improvement = newPB - previousPB;
      const improvementText =
        previousPB > 0
          ? ` (+${improvement} ${unit} improvement!)`
          : " (First personal best!)";

      // Create social post
      const postsRef = collection(db, "socialPosts");
      await addDoc(postsRef, {
        userId: currentUserId,
        username: userProfile.username,
        avatarUrl: userProfile.avatarUrl,
        type: "pb",
        title: `💪 New ${exerciseNames[exercise]} PB!`,
        description: `${newPB} ${unit}${improvementText}`,
        metadata: {
          exercise,
          newPB,
          previousPB,
          improvement,
          unit,
        },
        likes: 0,
        comments: 0,
        visibility: "friends",
        createdAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error broadcasting personal best:", error);
      return {
        success: false,
        error: error.message || "Failed to broadcast personal best",
      };
    }
  }

  /**
   * Broadcast streak milestone
   */
  async broadcastStreakMilestone(
    streakDays: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      const userProfile = await authService.getUserProfile();
      if (!userProfile) {
        return { success: false, error: "User profile not found" };
      }

      // Only broadcast significant milestones
      const milestones = [7, 14, 21, 30, 45, 60, 90, 100];
      if (!milestones.includes(streakDays)) {
        return { success: true }; // Don't broadcast, but don't error
      }

      const getMilestoneEmoji = (days: number) => {
        if (days >= 100) return "🔥🔥🔥";
        if (days >= 60) return "🔥🔥";
        if (days >= 30) return "🔥";
        return "⚡";
      };

      // Create social post
      const postsRef = collection(db, "socialPosts");
      await addDoc(postsRef, {
        userId: currentUserId,
        username: userProfile.username,
        avatarUrl: userProfile.avatarUrl,
        type: "streak",
        title: `${getMilestoneEmoji(streakDays)} ${streakDays}-Day Streak!`,
        description: `Completed ${streakDays} consecutive days of challenges. Unstoppable!`,
        metadata: {
          streakDays,
          milestone: true,
        },
        likes: 0,
        comments: 0,
        visibility: "friends",
        createdAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error broadcasting streak milestone:", error);
      return {
        success: false,
        error: error.message || "Failed to broadcast streak milestone",
      };
    }
  }

  /**
   * Broadcast duel victory
   */
  async broadcastDuelVictory(
    exercise: ExerciseType,
    opponentName: string,
    userScore: number,
    opponentScore: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      const userProfile = await authService.getUserProfile();
      if (!userProfile) {
        return { success: false, error: "User profile not found" };
      }

      const exerciseNames = {
        pushups: "Push-ups",
        squats: "Squats",
        situps: "Sit-ups",
        planks: "Plank",
      };

      const unit = exercise === "planks" ? "seconds" : "reps";

      // Create social post
      const postsRef = collection(db, "socialPosts");
      await addDoc(postsRef, {
        userId: currentUserId,
        username: userProfile.username,
        avatarUrl: userProfile.avatarUrl,
        type: "duel_win",
        title: `⚔️ Duel Victory!`,
        description: `Defeated ${opponentName} in ${exerciseNames[exercise]}: ${userScore} vs ${opponentScore} ${unit}`,
        metadata: {
          exercise,
          opponentName,
          userScore,
          opponentScore,
          unit,
        },
        likes: 0,
        comments: 0,
        visibility: "friends",
        createdAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error broadcasting duel victory:", error);
      return {
        success: false,
        error: error.message || "Failed to broadcast duel victory",
      };
    }
  }

  /**
   * Get social activity feed for user and friends
   */
  async getSocialFeed(limit: number = 50): Promise<SocialPost[]> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) return [];

      // Get user's friends
      const friends = await socialService.getFriends();
      const friendIds = friends.map((f) => f.uid);
      friendIds.push(currentUserId); // Include own posts

      if (friendIds.length === 0) return [];

      // Get posts from friends and self
      const postsRef = collection(db, "socialPosts");
      const q = query(
        postsRef,
        where("userId", "in", friendIds.slice(0, 10)), // Firestore 'in' limit is 10
        orderBy("createdAt", "desc"),
        limit(limit)
      );

      const querySnap = await getDocs(q);
      const posts: SocialPost[] = [];

      // Get user's likes for these posts
      const userLikes = await this.getUserLikes(currentUserId);

      querySnap.forEach((doc) => {
        const data = doc.data();
        posts.push({
          id: doc.id,
          userId: data.userId,
          username: data.username,
          avatarUrl: data.avatarUrl,
          type: data.type,
          title: data.title,
          description: data.description,
          metadata: data.metadata,
          likes: data.likes,
          comments: data.comments,
          likedByUser: userLikes.has(doc.id),
          createdAt: data.createdAt.toDate(),
          visibility: data.visibility,
        });
      });

      return posts;
    } catch (error) {
      console.error("Error getting social feed:", error);
      return [];
    }
  }

  /**
   * Like a post
   */
  async likePost(
    postId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      const batch = writeBatch(db);

      // Add like record
      const likesRef = collection(db, "postLikes");
      const likeDoc = doc(likesRef);
      batch.set(likeDoc, {
        postId,
        userId: currentUserId,
        createdAt: serverTimestamp(),
      });

      // Increment post like count
      const postRef = doc(db, "socialPosts", postId);
      batch.update(postRef, {
        likes: increment(1),
      });

      await batch.commit();

      return { success: true };
    } catch (error: any) {
      console.error("Error liking post:", error);
      return { success: false, error: error.message || "Failed to like post" };
    }
  }

  /**
   * Unlike a post
   */
  async unlikePost(
    postId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      // Find and delete like record
      const likesRef = collection(db, "postLikes");
      const q = query(
        likesRef,
        where("postId", "==", postId),
        where("userId", "==", currentUserId)
      );

      const querySnap = await getDocs(q);
      if (querySnap.empty) {
        return { success: false, error: "Like not found" };
      }

      const batch = writeBatch(db);

      // Delete like record
      querySnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Decrement post like count
      const postRef = doc(db, "socialPosts", postId);
      batch.update(postRef, {
        likes: increment(-1),
      });

      await batch.commit();

      return { success: true };
    } catch (error: any) {
      console.error("Error unliking post:", error);
      return {
        success: false,
        error: error.message || "Failed to unlike post",
      };
    }
  }

  /**
   * Add comment to post
   */
  async addComment(
    postId: string,
    content: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      const userProfile = await authService.getUserProfile();
      if (!userProfile) {
        return { success: false, error: "User profile not found" };
      }

      const batch = writeBatch(db);

      // Add comment
      const commentsRef = collection(db, "postComments");
      const commentDoc = doc(commentsRef);
      batch.set(commentDoc, {
        postId,
        userId: currentUserId,
        username: userProfile.username,
        avatarUrl: userProfile.avatarUrl,
        content: content.trim(),
        createdAt: serverTimestamp(),
      });

      // Increment post comment count
      const postRef = doc(db, "socialPosts", postId);
      batch.update(postRef, {
        comments: increment(1),
      });

      await batch.commit();

      return { success: true };
    } catch (error: any) {
      console.error("Error adding comment:", error);
      return {
        success: false,
        error: error.message || "Failed to add comment",
      };
    }
  }

  /**
   * Get comments for a post
   */
  async getPostComments(postId: string): Promise<Comment[]> {
    try {
      const commentsRef = collection(db, "postComments");
      const q = query(
        commentsRef,
        where("postId", "==", postId),
        orderBy("createdAt", "asc")
      );

      const querySnap = await getDocs(q);
      const comments: Comment[] = [];

      querySnap.forEach((doc) => {
        const data = doc.data();
        comments.push({
          id: doc.id,
          postId: data.postId,
          userId: data.userId,
          username: data.username,
          avatarUrl: data.avatarUrl,
          content: data.content,
          createdAt: data.createdAt.toDate(),
        });
      });

      return comments;
    } catch (error) {
      console.error("Error getting post comments:", error);
      return [];
    }
  }

  /**
   * Get user's activity stats
   */
  async getUserActivityStats(userId?: string): Promise<ActivityStats> {
    try {
      const uid = userId || authService.getCurrentUserId();
      if (!uid) {
        return {
          totalPosts: 0,
          totalLikes: 0,
          totalComments: 0,
          achievementsUnlocked: 0,
          friendsCount: 0,
        };
      }

      // Get user's posts
      const postsRef = collection(db, "socialPosts");
      const postsQuery = query(postsRef, where("userId", "==", uid));
      const postsSnap = await getDocs(postsQuery);

      let totalLikes = 0;
      let totalComments = 0;
      postsSnap.forEach((doc) => {
        const data = doc.data();
        totalLikes += data.likes || 0;
        totalComments += data.comments || 0;
      });

      // Get friends count
      const friends = await socialService.getFriends(uid);

      return {
        totalPosts: postsSnap.size,
        totalLikes,
        totalComments,
        achievementsUnlocked: 0, // TODO: Implement achievements system
        friendsCount: friends.length,
      };
    } catch (error) {
      console.error("Error getting user activity stats:", error);
      return {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        achievementsUnlocked: 0,
        friendsCount: 0,
      };
    }
  }

  /**
   * Get user's likes for posts
   */
  private async getUserLikes(userId: string): Promise<Set<string>> {
    try {
      const likesRef = collection(db, "postLikes");
      const q = query(likesRef, where("userId", "==", userId));
      const querySnap = await getDocs(q);

      const likes = new Set<string>();
      querySnap.forEach((doc) => {
        likes.add(doc.data().postId);
      });

      return likes;
    } catch (error) {
      console.error("Error getting user likes:", error);
      return new Set();
    }
  }

  /**
   * Subscribe to social feed updates
   */
  subscribeToSocialFeed(callback: (posts: SocialPost[]) => void): Unsubscribe {
    const currentUserId = authService.getCurrentUserId();
    if (!currentUserId) {
      return () => {};
    }

    // For now, just return empty function
    // TODO: Implement real-time feed updates
    return () => {};
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

// Helper function for Firestore increment (not available in web SDK)
function increment(value: number) {
  return { increment: value };
}

// Export singleton instance
export const socialActivityService = SocialActivityService.getInstance();
export default socialActivityService;
