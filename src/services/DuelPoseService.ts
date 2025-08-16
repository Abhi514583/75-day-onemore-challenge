import {
  DuelPoseData,
  DuelPoseState,
  ExerciseType,
  FormFeedback,
  Pose,
  CalibrationData,
  PoseDetectionSettings,
} from "../types/pose";
import { FormTracker } from "./pose/FormTracker";
import { FeedbackManager } from "./pose/FeedbackManager";
import { CalibrationManager } from "./pose/CalibrationManager";

export interface DuelParticipant {
  id: string;
  name: string;
  isLocal: boolean; // true for current user, false for opponent
  formTracker: FormTracker;
  calibrationData?: CalibrationData;
  settings: PoseDetectionSettings;
}

export interface DuelSyncData {
  participantId: string;
  timestamp: number;
  repCount: number;
  formScore: number;
  isValidForm: boolean;
  lastRepTimestamp: number;
  streak: number;
}

export interface DuelFormComparison {
  participant1: {
    id: string;
    name: string;
    formScore: number;
    repCount: number;
    streak: number;
    isLeading: boolean;
  };
  participant2: {
    id: string;
    name: string;
    formScore: number;
    repCount: number;
    streak: number;
    isLeading: boolean;
  };
  formDifference: number; // positive if participant1 is better
  repDifference: number; // positive if participant1 has more reps
  encouragement: string;
}

export class DuelPoseService {
  private participants: Map<string, DuelParticipant> = new Map();
  private duelState: DuelPoseState;
  private exerciseType: ExerciseType;
  private isActive: boolean = false;
  private syncCallback?: (data: DuelSyncData) => void;
  private comparisonCallback?: (comparison: DuelFormComparison) => void;

  // Fairness and synchronization
  private readonly SYNC_INTERVAL = 500; // ms
  private readonly MAX_SYNC_DELAY = 2000; // ms
  private syncTimer?: NodeJS.Timeout;
  private lastSyncTime = 0;

  constructor(
    exerciseType: ExerciseType,
    onSyncData?: (data: DuelSyncData) => void,
    onComparison?: (comparison: DuelFormComparison) => void
  ) {
    this.exerciseType = exerciseType;
    this.syncCallback = onSyncData;
    this.comparisonCallback = onComparison;

    this.duelState = {
      participants: [],
      syncedCalibration: false,
      formValidationEnabled: true,
      realTimeSync: true,
      fairnessMode: true,
    };
  }

  /**
   * Add a participant to the duel
   */
  async addParticipant(
    id: string,
    name: string,
    isLocal: boolean = false,
    settings?: Partial<PoseDetectionSettings>
  ): Promise<void> {
    try {
      const defaultSettings: PoseDetectionSettings = {
        enabled: true,
        exerciseType: this.exerciseType,
        difficultyLevel: "intermediate",
        showSkeleton: true,
        skeletonOpacity: 0.8,
        renderMode: "minimal", // Use minimal for better performance in duels
        feedbackStyle: "visual",
        confidenceThreshold: 0.6,
        formStrictness: 0.7, // Standardized for fairness
        feedbackFrequency: "medium",
        autoCalibrate: true,
        persistCalibration: false, // Force fresh calibration for duels
        recalibrateOnLightingChange: true,
        targetFrameRate: 24,
        enablePerformanceMode: true,
        reducedQualityThreshold: 15,
      };

      const participantSettings = { ...defaultSettings, ...settings };

      const participant: DuelParticipant = {
        id,
        name,
        isLocal,
        formTracker: new FormTracker(),
        settings: participantSettings,
      };

      this.participants.set(id, participant);

      // Update duel state
      this.updateDuelState();

      console.log(`Added participant ${name} (${id}) to duel`);
    } catch (error) {
      console.error("Error adding participant:", error);
      throw error;
    }
  }

  /**
   * Remove a participant from the duel
   */
  removeParticipant(id: string): void {
    const participant = this.participants.get(id);
    if (participant) {
      // End their form tracking session
      if (participant.formTracker.isTracking()) {
        participant.formTracker.endSession();
      }

      this.participants.delete(id);
      this.updateDuelState();

      console.log(`Removed participant ${id} from duel`);
    }
  }

  /**
   * Start calibration for all participants
   */
  async startCalibration(): Promise<void> {
    try {
      const calibrationPromises: Promise<void>[] = [];

      for (const [id, participant] of this.participants) {
        if (participant.isLocal) {
          // Only calibrate local participant directly
          const calibrationManager = new CalibrationManager();
          const calibrationPromise = calibrationManager
            .startCalibration(this.exerciseType)
            .then((calibrationData) => {
              participant.calibrationData = calibrationData;
            });

          calibrationPromises.push(calibrationPromise);
        }
      }

      // Wait for all calibrations to complete
      await Promise.all(calibrationPromises);

      // Mark calibration as synced
      this.duelState.syncedCalibration = true;
      this.updateDuelState();

      console.log("Duel calibration completed for all participants");
    } catch (error) {
      console.error("Error during duel calibration:", error);
      throw error;
    }
  }

  /**
   * Start the duel session
   */
  async startDuel(): Promise<void> {
    try {
      if (!this.duelState.syncedCalibration) {
        throw new Error("Calibration must be completed before starting duel");
      }

      this.isActive = true;

      // Start form tracking for all participants
      for (const [id, participant] of this.participants) {
        participant.formTracker.startSession(this.exerciseType);
      }

      // Start synchronization timer
      this.startSyncTimer();

      console.log("Duel started with pose detection");
    } catch (error) {
      console.error("Error starting duel:", error);
      throw error;
    }
  }

  /**
   * End the duel session
   */
  async endDuel(): Promise<{ [participantId: string]: any }> {
    try {
      this.isActive = false;

      // Stop sync timer
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = undefined;
      }

      // End form tracking for all participants and collect results
      const results: { [participantId: string]: any } = {};

      for (const [id, participant] of this.participants) {
        if (participant.formTracker.isTracking()) {
          const sessionData = await participant.formTracker.endSession();
          results[id] = {
            participantName: participant.name,
            sessionData,
            finalStats: participant.formTracker.getSessionStats(),
          };
        }
      }

      console.log("Duel ended, collected results:", results);
      return results;
    } catch (error) {
      console.error("Error ending duel:", error);
      throw error;
    }
  }

  /**
   * Process pose frame for a participant
   */
  processPoseFrame(
    participantId: string,
    poses: Pose[],
    frameRate: number
  ): void {
    if (!this.isActive) return;

    const participant = this.participants.get(participantId);
    if (!participant || !participant.isLocal) return;

    if (poses.length > 0) {
      // Process frame with participant's form tracker
      const result = participant.formTracker.processFrame(
        poses[0],
        this.exerciseType,
        participant.calibrationData
      );

      // Handle rep detection
      if (result.shouldCountRep) {
        this.handleRepDetected(participantId, result.formScore);
      }

      // Sync data if needed
      this.syncParticipantData(participantId);
    }
  }

  /**
   * Handle detected rep for a participant
   */
  private handleRepDetected(participantId: string, formScore: any): void {
    const participant = this.participants.get(participantId);
    if (!participant) return;

    // Record rep in form tracker
    if (formScore) {
      participant.formTracker.recordRep(formScore, true);
    }

    // Update duel state
    this.updateDuelState();

    // Trigger comparison update
    this.updateFormComparison();
  }

  /**
   * Sync participant data
   */
  private syncParticipantData(participantId: string): void {
    const now = Date.now();
    if (now - this.lastSyncTime < this.SYNC_INTERVAL) return;

    const participant = this.participants.get(participantId);
    if (!participant || !this.syncCallback) return;

    const stats = participant.formTracker.getSessionStats();
    const session = participant.formTracker.getCurrentSession();

    const syncData: DuelSyncData = {
      participantId,
      timestamp: now,
      repCount: stats.validReps,
      formScore: stats.averageScore,
      isValidForm: stats.averageScore >= 70, // Threshold for valid form
      lastRepTimestamp: now,
      streak: stats.currentStreak,
    };

    this.syncCallback(syncData);
    this.lastSyncTime = now;
  }

  /**
   * Receive sync data from opponent
   */
  receiveSyncData(data: DuelSyncData): void {
    // Update opponent's data in duel state
    const participantIndex = this.duelState.participants.findIndex(
      (p) => p.participantId === data.participantId
    );

    if (participantIndex >= 0) {
      this.duelState.participants[participantIndex] = {
        participantId: data.participantId,
        currentReps: data.repCount,
        formScore: data.formScore,
        isValidForm: data.isValidForm,
        lastRepTimestamp: data.lastRepTimestamp,
        calibrationComplete: true,
      };

      // Update comparison
      this.updateFormComparison();
    }
  }

  /**
   * Update form comparison between participants
   */
  private updateFormComparison(): void {
    if (!this.comparisonCallback || this.duelState.participants.length < 2)
      return;

    const [p1, p2] = this.duelState.participants;

    const formDifference = p1.formScore - p2.formScore;
    const repDifference = p1.currentReps - p2.currentReps;

    // Determine who's leading
    const p1Leading =
      p1.currentReps > p2.currentReps ||
      (p1.currentReps === p2.currentReps && p1.formScore > p2.formScore);

    // Generate encouragement message
    const encouragement = this.generateEncouragement(
      p1,
      p2,
      formDifference,
      repDifference
    );

    const comparison: DuelFormComparison = {
      participant1: {
        id: p1.participantId,
        name: this.participants.get(p1.participantId)?.name || "Player 1",
        formScore: p1.formScore,
        repCount: p1.currentReps,
        streak: 0, // Would need to track this
        isLeading: p1Leading,
      },
      participant2: {
        id: p2.participantId,
        name: this.participants.get(p2.participantId)?.name || "Player 2",
        formScore: p2.formScore,
        repCount: p2.currentReps,
        streak: 0, // Would need to track this
        isLeading: !p1Leading,
      },
      formDifference,
      repDifference,
      encouragement,
    };

    this.comparisonCallback(comparison);
  }

  /**
   * Generate encouragement message based on comparison
   */
  private generateEncouragement(
    p1: DuelPoseData,
    p2: DuelPoseData,
    formDiff: number,
    repDiff: number
  ): string {
    const messages = {
      leading: [
        "You're in the lead! Keep it up! 🔥",
        "Great form! Stay focused! 💪",
        "You're crushing it! Don't let up! ⚡",
      ],
      behind: [
        "Push harder! You can catch up! 🚀",
        "Focus on your form! Quality over speed! 🎯",
        "Don't give up! You've got this! 💯",
      ],
      tied: [
        "It's neck and neck! Give it everything! ⚔️",
        "Perfect tie! Who wants it more? 🔥",
        "This is intense! Push through! 💥",
      ],
      formFocus: [
        "Great reps! Focus on form for the win! 📐",
        "Quality technique! Keep it consistent! ✨",
        "Perfect form! That's how it's done! 🎯",
      ],
    };

    let category: keyof typeof messages;

    if (Math.abs(repDiff) <= 1 && Math.abs(formDiff) <= 5) {
      category = "tied";
    } else if (repDiff > 0 || (repDiff === 0 && formDiff > 0)) {
      category = "leading";
    } else {
      category = "behind";
    }

    // Special case for form focus
    if (Math.abs(formDiff) > 15) {
      category = "formFocus";
    }

    const messageArray = messages[category];
    return messageArray[Math.floor(Math.random() * messageArray.length)];
  }

  /**
   * Start synchronization timer
   */
  private startSyncTimer(): void {
    this.syncTimer = setInterval(() => {
      // Sync data for local participants
      for (const [id, participant] of this.participants) {
        if (participant.isLocal) {
          this.syncParticipantData(id);
        }
      }
    }, this.SYNC_INTERVAL);
  }

  /**
   * Update duel state
   */
  private updateDuelState(): void {
    this.duelState.participants = Array.from(this.participants.values()).map(
      (participant) => {
        const stats = participant.formTracker.getSessionStats();
        return {
          participantId: participant.id,
          currentReps: stats.validReps,
          formScore: stats.averageScore,
          isValidForm: stats.averageScore >= 70,
          lastRepTimestamp: Date.now(),
          calibrationComplete: !!participant.calibrationData,
        };
      }
    );
  }

  /**
   * Get current duel state
   */
  getDuelState(): DuelPoseState {
    return { ...this.duelState };
  }

  /**
   * Get participant data
   */
  getParticipant(id: string): DuelParticipant | undefined {
    return this.participants.get(id);
  }

  /**
   * Get all participants
   */
  getAllParticipants(): DuelParticipant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Check if duel is ready to start
   */
  isReadyToStart(): boolean {
    return (
      this.participants.size >= 2 &&
      this.duelState.syncedCalibration &&
      Array.from(this.participants.values()).every((p) => p.calibrationData)
    );
  }

  /**
   * Get duel statistics
   */
  getDuelStats(): {
    totalParticipants: number;
    averageFormScore: number;
    totalReps: number;
    duration: number;
    fairnessScore: number;
  } {
    const participants = Array.from(this.participants.values());
    const totalParticipants = participants.length;

    if (totalParticipants === 0) {
      return {
        totalParticipants: 0,
        averageFormScore: 0,
        totalReps: 0,
        duration: 0,
        fairnessScore: 100,
      };
    }

    const stats = participants.map((p) => p.formTracker.getSessionStats());
    const averageFormScore =
      stats.reduce((sum, s) => sum + s.averageScore, 0) / totalParticipants;
    const totalReps = stats.reduce((sum, s) => sum + s.validReps, 0);

    // Calculate fairness score (how close the form scores are)
    const formScores = stats.map((s) => s.averageScore);
    const formVariance = this.calculateVariance(formScores);
    const fairnessScore = Math.max(0, 100 - formVariance);

    return {
      totalParticipants,
      averageFormScore: Math.round(averageFormScore),
      totalReps,
      duration: 0, // Would need to track session duration
      fairnessScore: Math.round(fairnessScore),
    };
  }

  /**
   * Calculate variance for fairness scoring
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;

    return Math.sqrt(variance);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }

    // End all tracking sessions
    for (const [id, participant] of this.participants) {
      if (participant.formTracker.isTracking()) {
        participant.formTracker.endSession();
      }
    }

    this.participants.clear();
    this.isActive = false;
  }
}
