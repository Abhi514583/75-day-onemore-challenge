import { Alert, Vibration } from "react-native";
import {
  PoseDetectionError,
  RecoveryAction,
  ExerciseType,
  CameraError,
} from "../types/pose";
import { AccessibilityService } from "./AccessibilityService";

export interface ErrorContext {
  exerciseType?: ExerciseType;
  sessionId?: string;
  timestamp: number;
  userAction?: string;
  deviceInfo?: {
    platform: string;
    model: string;
    osVersion: string;
  };
}

export interface ErrorRecoveryState {
  isRecovering: boolean;
  currentError: PoseDetectionError | null;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  fallbackMode: boolean;
  lastRecoveryTime: number;
}

export interface UserGuidance {
  title: string;
  message: string;
  steps: string[];
  visualAid?: string; // Could be an image or animation reference
  priority: "low" | "medium" | "high" | "critical";
}

export class ErrorRecoveryService {
  private recoveryState: ErrorRecoveryState;
  private errorHistory: PoseDetectionError[] = [];
  private recoveryCallbacks: Map<string, (success: boolean) => void> =
    new Map();
  private readonly MAX_ERROR_HISTORY = 50;
  private readonly RECOVERY_COOLDOWN = 2000; // 2 seconds between recovery attempts

  constructor() {
    this.recoveryState = {
      isRecovering: false,
      currentError: null,
      recoveryAttempts: 0,
      maxRecoveryAttempts: 3,
      fallbackMode: false,
      lastRecoveryTime: 0,
    };
  }

  /**
   * Handle pose detection error with automatic recovery
   */
  async handleError(
    error: PoseDetectionError,
    context: ErrorContext,
    onRecovery?: (success: boolean) => void
  ): Promise<boolean> {
    try {
      // Add to error history
      this.addToErrorHistory(error, context);

      // Check if we're already recovering
      if (this.recoveryState.isRecovering) {
        console.log("Recovery already in progress, queuing error");
        return false;
      }

      // Update recovery state
      this.recoveryState.isRecovering = true;
      this.recoveryState.currentError = error;
      this.recoveryState.recoveryAttempts = 0;

      // Register recovery callback
      if (onRecovery) {
        const callbackId = `${Date.now()}_${Math.random()}`;
        this.recoveryCallbacks.set(callbackId, onRecovery);
      }

      // Attempt automatic recovery
      const recoverySuccess = await this.attemptRecovery(error, context);

      // Update state
      this.recoveryState.isRecovering = false;
      this.recoveryState.currentError = null;
      this.recoveryState.lastRecoveryTime = Date.now();

      // Notify callbacks
      this.recoveryCallbacks.forEach((callback) => callback(recoverySuccess));
      this.recoveryCallbacks.clear();

      return recoverySuccess;
    } catch (recoveryError) {
      console.error("Error during recovery process:", recoveryError);
      this.recoveryState.isRecovering = false;
      return false;
    }
  }

  /**
   * Attempt automatic recovery based on error type
   */
  private async attemptRecovery(
    error: PoseDetectionError,
    context: ErrorContext
  ): Promise<boolean> {
    const now = Date.now();

    // Respect cooldown period
    if (now - this.recoveryState.lastRecoveryTime < this.RECOVERY_COOLDOWN) {
      console.log("Recovery cooldown active, skipping attempt");
      return false;
    }

    // Get recovery actions for this error type
    const recoveryActions = this.getRecoveryActions(error);

    // Try each recovery action
    for (const action of recoveryActions) {
      if (
        this.recoveryState.recoveryAttempts >=
        this.recoveryState.maxRecoveryAttempts
      ) {
        console.log("Max recovery attempts reached");
        break;
      }

      this.recoveryState.recoveryAttempts++;
      console.log(
        `Recovery attempt ${this.recoveryState.recoveryAttempts}: ${action.type}`
      );

      const success = await this.executeRecoveryAction(action, error, context);

      if (success) {
        console.log(`Recovery successful with action: ${action.type}`);
        return true;
      }

      // Wait before next attempt
      await this.delay(1000);
    }

    // If all automatic recovery failed, show user guidance
    await this.showUserGuidance(error, context);

    return false;
  }

  /**
   * Execute a specific recovery action
   */
  private async executeRecoveryAction(
    action: RecoveryAction,
    error: PoseDetectionError,
    context: ErrorContext
  ): Promise<boolean> {
    try {
      switch (action.type) {
        case "retry":
          return await this.retryOperation(error, context);

        case "recalibrate":
          return await this.triggerRecalibration(error, context);

        case "reduce_quality":
          return await this.reduceQuality(error, context);

        case "fallback_manual":
          return await this.enableFallbackMode(error, context);

        case "restart_camera":
          return await this.restartCamera(error, context);

        default:
          console.warn(`Unknown recovery action: ${action.type}`);
          return false;
      }
    } catch (actionError) {
      console.error(
        `Error executing recovery action ${action.type}:`,
        actionError
      );
      return false;
    }
  }

  /**
   * Get appropriate recovery actions for error type
   */
  private getRecoveryActions(error: PoseDetectionError): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (error.type) {
      case "camera":
        actions.push(
          {
            type: "restart_camera",
            description: "Restart camera",
            automatic: true,
            priority: 1,
          },
          {
            type: "reduce_quality",
            description: "Reduce camera quality",
            automatic: true,
            priority: 2,
          },
          {
            type: "fallback_manual",
            description: "Switch to manual mode",
            automatic: true,
            priority: 3,
          }
        );
        break;

      case "ml_kit":
        actions.push(
          {
            type: "retry",
            description: "Retry ML Kit operation",
            automatic: true,
            priority: 1,
          },
          {
            type: "reduce_quality",
            description: "Reduce processing quality",
            automatic: true,
            priority: 2,
          },
          {
            type: "fallback_manual",
            description: "Switch to manual mode",
            automatic: true,
            priority: 3,
          }
        );
        break;

      case "processing":
        actions.push(
          {
            type: "reduce_quality",
            description: "Reduce processing load",
            automatic: true,
            priority: 1,
          },
          {
            type: "retry",
            description: "Retry processing",
            automatic: true,
            priority: 2,
          },
          {
            type: "fallback_manual",
            description: "Switch to manual mode",
            automatic: true,
            priority: 3,
          }
        );
        break;

      case "calibration":
        actions.push(
          {
            type: "recalibrate",
            description: "Recalibrate pose detection",
            automatic: true,
            priority: 1,
          },
          {
            type: "reduce_quality",
            description: "Use default calibration",
            automatic: true,
            priority: 2,
          },
          {
            type: "fallback_manual",
            description: "Skip calibration",
            automatic: true,
            priority: 3,
          }
        );
        break;

      case "validation":
        actions.push(
          {
            type: "reduce_quality",
            description: "Reduce validation strictness",
            automatic: true,
            priority: 1,
          },
          {
            type: "retry",
            description: "Retry validation",
            automatic: true,
            priority: 2,
          }
        );
        break;

      default:
        actions.push(
          {
            type: "retry",
            description: "Retry operation",
            automatic: true,
            priority: 1,
          },
          {
            type: "fallback_manual",
            description: "Switch to manual mode",
            automatic: true,
            priority: 2,
          }
        );
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Retry the failed operation
   */
  private async retryOperation(
    error: PoseDetectionError,
    context: ErrorContext
  ): Promise<boolean> {
    // This would trigger a retry of the specific operation that failed
    // Implementation depends on the specific error context
    console.log("Retrying operation for error:", error.type);

    // Simulate retry delay
    await this.delay(500);

    // For now, return success for non-critical errors
    return error.severity !== "critical";
  }

  /**
   * Trigger recalibration
   */
  private async triggerRecalibration(
    error: PoseDetectionError,
    context: ErrorContext
  ): Promise<boolean> {
    console.log("Triggering recalibration for error:", error.type);

    // This would trigger the calibration process
    // Implementation would depend on having access to CalibrationManager

    return true; // Assume success for now
  }

  /**
   * Reduce quality settings
   */
  private async reduceQuality(
    error: PoseDetectionError,
    context: ErrorContext
  ): Promise<boolean> {
    console.log("Reducing quality for error:", error.type);

    // This would reduce various quality settings:
    // - Lower frame rate
    // - Reduce render mode
    // - Lower confidence thresholds
    // - Disable non-essential features

    return true; // Assume success for now
  }

  /**
   * Enable fallback manual mode
   */
  private async enableFallbackMode(
    error: PoseDetectionError,
    context: ErrorContext
  ): Promise<boolean> {
    console.log("Enabling fallback mode for error:", error.type);

    this.recoveryState.fallbackMode = true;

    // Notify user about fallback mode
    await this.notifyFallbackMode(context);

    return true;
  }

  /**
   * Restart camera
   */
  private async restartCamera(
    error: PoseDetectionError,
    context: ErrorContext
  ): Promise<boolean> {
    console.log("Restarting camera for error:", error.type);

    // This would restart the camera component
    // Implementation would depend on having access to camera controls

    await this.delay(1000); // Simulate restart time

    return true; // Assume success for now
  }

  /**
   * Show user guidance for manual intervention
   */
  private async showUserGuidance(
    error: PoseDetectionError,
    context: ErrorContext
  ): Promise<void> {
    const guidance = this.getUserGuidance(error, context);

    // Provide haptic feedback for critical errors
    if (error.severity === "critical") {
      Vibration.vibrate([200, 100, 200]);
    }

    // Show alert with guidance
    Alert.alert(guidance.title, guidance.message, [
      {
        text: "Try Again",
        onPress: () => this.handleError(error, context),
      },
      {
        text: "Manual Mode",
        onPress: () => this.enableFallbackMode(error, context),
      },
      {
        text: "Help",
        onPress: () => this.showDetailedHelp(guidance),
      },
    ]);

    // Announce for screen readers
    await AccessibilityService.announceForScreenReader(
      `${guidance.title}. ${guidance.message}`
    );
  }

  /**
   * Get user guidance for specific error
   */
  private getUserGuidance(
    error: PoseDetectionError,
    context: ErrorContext
  ): UserGuidance {
    switch (error.type) {
      case "camera":
        return {
          title: "📷 Camera Issue",
          message: "There's a problem with your camera. Let's fix it together.",
          steps: [
            "Make sure no other apps are using the camera",
            "Check that the camera lens is clean and unobstructed",
            "Try closing and reopening the app",
            "Restart your device if the problem persists",
          ],
          priority: "high",
        };

      case "ml_kit":
        return {
          title: "🤖 AI Processing Issue",
          message:
            "The AI pose detection is having trouble. Here's what to try:",
          steps: [
            "Make sure you have good lighting",
            "Position yourself fully in the camera frame",
            "Try moving to a less cluttered background",
            "Restart the app if issues continue",
          ],
          priority: "medium",
        };

      case "processing":
        return {
          title: "⚡ Performance Issue",
          message: "Your device is working hard. Let's optimize performance:",
          steps: [
            "Close other apps to free up memory",
            "Make sure your device isn't overheating",
            "Try reducing the visual quality in settings",
            "Consider using manual mode for better performance",
          ],
          priority: "medium",
        };

      case "calibration":
        return {
          title: "📐 Calibration Problem",
          message:
            "We need to set up your camera position. Follow these steps:",
          steps: [
            "Stand 6-8 feet away from your device",
            "Make sure your whole body is visible",
            "Ensure you have good, even lighting",
            "Stand with your arms at your sides",
            "Keep the background clear and uncluttered",
          ],
          priority: "high",
        };

      case "validation":
        return {
          title: "✅ Form Detection Issue",
          message: "Having trouble detecting your movements. Try this:",
          steps: [
            "Make sure you're performing the exercise correctly",
            "Move more slowly and deliberately",
            "Ensure your whole body is visible in the frame",
            "Check that lighting is adequate",
          ],
          priority: "low",
        };

      default:
        return {
          title: "⚠️ Technical Issue",
          message:
            "Something unexpected happened. Here are some general solutions:",
          steps: [
            "Try restarting the exercise",
            "Check your internet connection",
            "Make sure the app is up to date",
            "Restart the app if problems continue",
          ],
          priority: "medium",
        };
    }
  }

  /**
   * Show detailed help
   */
  private showDetailedHelp(guidance: UserGuidance): void {
    const stepsText = guidance.steps
      .map((step, index) => `${index + 1}. ${step}`)
      .join("\n\n");

    Alert.alert(
      `${guidance.title} - Detailed Help`,
      `${guidance.message}\n\nStep-by-step guide:\n\n${stepsText}`,
      [
        { text: "Got it", style: "default" },
        {
          text: "Contact Support",
          onPress: () => this.contactSupport(guidance),
        },
      ]
    );
  }

  /**
   * Contact support (placeholder)
   */
  private contactSupport(guidance: UserGuidance): void {
    // This would open a support ticket or email
    console.log("Contacting support for:", guidance.title);
  }

  /**
   * Notify user about fallback mode
   */
  private async notifyFallbackMode(context: ErrorContext): Promise<void> {
    Alert.alert(
      "📱 Manual Mode Activated",
      "Don't worry! We've switched to manual counting so you can continue your workout. You can tap to count your reps manually.",
      [{ text: "Continue", style: "default" }]
    );

    await AccessibilityService.announceForScreenReader(
      "Manual mode activated. You can now count reps manually by tapping the screen."
    );
  }

  /**
   * Add error to history
   */
  private addToErrorHistory(
    error: PoseDetectionError,
    context: ErrorContext
  ): void {
    const enhancedError = {
      ...error,
      context,
    };

    this.errorHistory.push(enhancedError);

    // Keep history size manageable
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory.shift();
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: { [type: string]: number };
    errorsBySeverity: { [severity: string]: number };
    recoverySuccessRate: number;
    mostCommonError: string;
  } {
    const totalErrors = this.errorHistory.length;
    const errorsByType: { [type: string]: number } = {};
    const errorsBySeverity: { [severity: string]: number } = {};

    this.errorHistory.forEach((error) => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] =
        (errorsBySeverity[error.severity] || 0) + 1;
    });

    const mostCommonError =
      Object.entries(errorsByType).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "none";

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      recoverySuccessRate: 0.8, // Would need to track actual success rate
      mostCommonError,
    };
  }

  /**
   * Check if currently in fallback mode
   */
  isInFallbackMode(): boolean {
    return this.recoveryState.fallbackMode;
  }

  /**
   * Exit fallback mode
   */
  exitFallbackMode(): void {
    this.recoveryState.fallbackMode = false;
  }

  /**
   * Get current recovery state
   */
  getRecoveryState(): ErrorRecoveryState {
    return { ...this.recoveryState };
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.recoveryCallbacks.clear();
    this.recoveryState.isRecovering = false;
    this.recoveryState.currentError = null;
  }
}
