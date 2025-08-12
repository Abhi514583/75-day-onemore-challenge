import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../config/firebase";
import { authService } from "./AuthService";
import { ExerciseType } from "../types/firebase";
import { getCurrentTimestamp } from "../utils/firebase";

export interface VerificationData {
  id: string;
  duelId: string;
  userId: string;
  username: string;
  exercise: ExerciseType;
  score: number;

  // Media evidence
  videoURL?: string;
  thumbnailURL?: string;
  videoMetadata?: {
    duration: number;
    fileSize: number;
    resolution: string;
    format: string;
  };

  // Form analysis (future AI integration)
  formAnalysis?: {
    repCount: number;
    formQuality: number; // 0-1 score
    consistency: number; // 0-1 score
    suspiciousActivity: boolean;
    confidence: number; // 0-1 confidence in analysis
    keyFrames?: string[]; // URLs to key frame images
  };

  // Manual review
  reviewStatus: "pending" | "approved" | "rejected" | "disputed";
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;

  // Dispute information
  disputeReason?: string;
  disputeEvidence?: string[];
  disputeStatus?: "open" | "investigating" | "resolved";

  // Metadata
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AntiCheatFlags {
  statisticalOutlier: boolean; // Score significantly higher than user's history
  impossibleScore: boolean; // Physically impossible score
  suspiciousTimestamp: boolean; // Submitted too quickly or at odd times
  deviceInconsistency: boolean; // Different device than usual
  networkAnomaly: boolean; // VPN, proxy, or unusual network
  behaviorPattern: boolean; // Unusual behavior patterns
}

export interface VerificationUploadResult {
  success: boolean;
  verificationId?: string;
  uploadURL?: string;
  error?: string;
}

class VerificationService {
  private static instance: VerificationService;

  private constructor() {}

  static getInstance(): VerificationService {
    if (!VerificationService.instance) {
      VerificationService.instance = new VerificationService();
    }
    return VerificationService.instance;
  }

  /**
   * Upload verification video for a duel
   */
  async uploadVerificationVideo(
    duelId: string,
    videoBlob: Blob,
    metadata: {
      exercise: ExerciseType;
      score: number;
      duration: number;
    }
  ): Promise<VerificationUploadResult> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      const userProfile = await authService.getUserProfile();
      if (!userProfile) {
        return { success: false, error: "User profile not found" };
      }

      // Create storage reference
      const videoRef = ref(
        storage,
        `duels/${duelId}/${currentUserId}/proof.mp4`
      );

      // Upload video
      const uploadResult = await uploadBytes(videoRef, videoBlob);
      const videoURL = await getDownloadURL(uploadResult.ref);

      // Create verification record
      const verificationRef = collection(db, "verifications");
      const verificationDoc = await addDoc(verificationRef, {
        duelId,
        userId: currentUserId,
        username: userProfile.username,
        exercise: metadata.exercise,
        score: metadata.score,
        videoURL,
        videoMetadata: {
          duration: metadata.duration,
          fileSize: videoBlob.size,
          resolution: "unknown", // Would be detected from video
          format: "mp4",
        },
        reviewStatus: "pending",
        uploadedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        verificationId: verificationDoc.id,
        uploadURL: videoURL,
      };
    } catch (error: any) {
      console.error("Error uploading verification video:", error);
      return {
        success: false,
        error: error.message || "Failed to upload verification video",
      };
    }
  }

  /**
   * Analyze score for anti-cheat flags
   */
  async analyzeScoreForCheating(
    userId: string,
    exercise: ExerciseType,
    score: number,
    context: {
      duelId?: string;
      submissionTime: Date;
      deviceInfo?: any;
    }
  ): Promise<AntiCheatFlags> {
    try {
      // Get user's historical scores for this exercise
      const historicalScores = await this.getUserHistoricalScores(
        userId,
        exercise
      );

      const flags: AntiCheatFlags = {
        statisticalOutlier: false,
        impossibleScore: false,
        suspiciousTimestamp: false,
        deviceInconsistency: false,
        networkAnomaly: false,
        behaviorPattern: false,
      };

      // Check for statistical outlier
      if (historicalScores.length > 0) {
        const average =
          historicalScores.reduce((sum, s) => sum + s, 0) /
          historicalScores.length;
        const maxHistorical = Math.max(...historicalScores);

        // Flag if score is more than 50% higher than previous best
        if (score > maxHistorical * 1.5) {
          flags.statisticalOutlier = true;
        }

        // Flag if score is more than 3 standard deviations from average
        const stdDev = Math.sqrt(
          historicalScores.reduce(
            (sum, s) => sum + Math.pow(s - average, 2),
            0
          ) / historicalScores.length
        );
        if (score > average + 3 * stdDev) {
          flags.statisticalOutlier = true;
        }
      }

      // Check for impossible scores based on exercise type
      const impossibleThresholds = {
        pushups: 500, // 500 push-ups in one set is highly suspicious
        squats: 1000, // 1000 squats in one set is highly suspicious
        situps: 1000, // 1000 sit-ups in one set is highly suspicious
        planks: 3600, // 1 hour plank is highly suspicious
      };

      if (score > impossibleThresholds[exercise]) {
        flags.impossibleScore = true;
      }

      // Check for suspicious timing
      const now = new Date();
      const timeDiff = Math.abs(
        now.getTime() - context.submissionTime.getTime()
      );

      // Flag if submitted more than 5 minutes in the future or past
      if (timeDiff > 5 * 60 * 1000) {
        flags.suspiciousTimestamp = true;
      }

      // Check submission time patterns (e.g., always at exact same time)
      const recentSubmissions = await this.getRecentSubmissions(userId, 10);
      if (recentSubmissions.length >= 5) {
        const times = recentSubmissions.map((s) =>
          s.submissionTime.getMinutes()
        );
        const uniqueTimes = new Set(times);

        // Flag if all submissions are at the exact same minute
        if (uniqueTimes.size === 1) {
          flags.behaviorPattern = true;
        }
      }

      return flags;
    } catch (error) {
      console.error("Error analyzing score for cheating:", error);

      // Return safe defaults on error
      return {
        statisticalOutlier: false,
        impossibleScore: false,
        suspiciousTimestamp: false,
        deviceInconsistency: false,
        networkAnomaly: false,
        behaviorPattern: false,
      };
    }
  }

  /**
   * Submit a dispute for a verification
   */
  async submitDispute(
    verificationId: string,
    reason: string,
    evidence?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      const verificationRef = doc(db, "verifications", verificationId);
      await updateDoc(verificationRef, {
        reviewStatus: "disputed",
        disputeReason: reason,
        disputeEvidence: evidence || [],
        disputeStatus: "open",
        updatedAt: serverTimestamp(),
      });

      // Create dispute record for admin review
      const disputesRef = collection(db, "disputes");
      await addDoc(disputesRef, {
        verificationId,
        disputedBy: currentUserId,
        reason,
        evidence: evidence || [],
        status: "open",
        createdAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error submitting dispute:", error);
      return {
        success: false,
        error: error.message || "Failed to submit dispute",
      };
    }
  }

  /**
   * Get verification data for a duel
   */
  async getDuelVerification(
    duelId: string,
    userId: string
  ): Promise<VerificationData | null> {
    try {
      const verificationsRef = collection(db, "verifications");
      const q = query(
        verificationsRef,
        where("duelId", "==", duelId),
        where("userId", "==", userId)
      );

      const querySnap = await getDocs(q);
      if (querySnap.empty) return null;

      const doc = querySnap.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        duelId: data.duelId,
        userId: data.userId,
        username: data.username,
        exercise: data.exercise,
        score: data.score,
        videoURL: data.videoURL,
        thumbnailURL: data.thumbnailURL,
        videoMetadata: data.videoMetadata,
        formAnalysis: data.formAnalysis,
        reviewStatus: data.reviewStatus,
        reviewNotes: data.reviewNotes,
        reviewedBy: data.reviewedBy,
        reviewedAt: data.reviewedAt?.toDate(),
        disputeReason: data.disputeReason,
        disputeEvidence: data.disputeEvidence,
        disputeStatus: data.disputeStatus,
        uploadedAt: data.uploadedAt.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    } catch (error) {
      console.error("Error getting duel verification:", error);
      return null;
    }
  }

  /**
   * Get user's historical scores for an exercise
   */
  private async getUserHistoricalScores(
    userId: string,
    exercise: ExerciseType
  ): Promise<number[]> {
    try {
      const attemptsRef = collection(db, "attempts", userId, "items");
      const q = query(
        attemptsRef,
        where("exercise", "==", exercise),
        orderBy("serverAt", "desc"),
        limit(20) // Last 20 attempts
      );

      const querySnap = await getDocs(q);
      const scores: number[] = [];

      querySnap.forEach((doc) => {
        const data = doc.data();
        scores.push(data.score);
      });

      return scores;
    } catch (error) {
      console.error("Error getting historical scores:", error);
      return [];
    }
  }

  /**
   * Get recent submissions for pattern analysis
   */
  private async getRecentSubmissions(
    userId: string,
    limit: number = 10
  ): Promise<
    Array<{
      score: number;
      exercise: ExerciseType;
      submissionTime: Date;
    }>
  > {
    try {
      const attemptsRef = collection(db, "attempts", userId, "items");
      const q = query(attemptsRef, orderBy("serverAt", "desc"), limit(limit));

      const querySnap = await getDocs(q);
      const submissions: Array<{
        score: number;
        exercise: ExerciseType;
        submissionTime: Date;
      }> = [];

      querySnap.forEach((doc) => {
        const data = doc.data();
        submissions.push({
          score: data.score,
          exercise: data.exercise,
          submissionTime: data.serverAt.toDate(),
        });
      });

      return submissions;
    } catch (error) {
      console.error("Error getting recent submissions:", error);
      return [];
    }
  }

  /**
   * Generate thumbnail from video (placeholder for future implementation)
   */
  async generateVideoThumbnail(videoURL: string): Promise<string | null> {
    // TODO: Implement video thumbnail generation
    // This would typically involve:
    // 1. Loading the video
    // 2. Extracting a frame at a specific time
    // 3. Converting to image
    // 4. Uploading to storage
    // 5. Returning the thumbnail URL

    console.log("📸 Generating thumbnail for video:", videoURL);
    return null; // Placeholder
  }

  /**
   * Delete verification data
   */
  async deleteVerification(
    verificationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
        return { success: false, error: "User not authenticated" };
      }

      // Get verification data
      const verificationRef = doc(db, "verifications", verificationId);
      const verificationSnap = await getDoc(verificationRef);

      if (!verificationSnap.exists()) {
        return { success: false, error: "Verification not found" };
      }

      const data = verificationSnap.data();

      // Check ownership
      if (data.userId !== currentUserId) {
        return {
          success: false,
          error: "Not authorized to delete this verification",
        };
      }

      // Delete video from storage if exists
      if (data.videoURL) {
        try {
          const videoRef = ref(
            storage,
            `duels/${data.duelId}/${currentUserId}/proof.mp4`
          );
          await deleteObject(videoRef);
        } catch (storageError) {
          console.warn("Failed to delete video from storage:", storageError);
        }
      }

      // Delete verification record
      await updateDoc(verificationRef, {
        reviewStatus: "deleted",
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error deleting verification:", error);
      return {
        success: false,
        error: error.message || "Failed to delete verification",
      };
    }
  }
}

// Export singleton instance
export const verificationService = VerificationService.getInstance();
export default verificationService;
