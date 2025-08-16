import { Alert } from "react-native";
import {
  CameraError,
  PoseDetectionError,
  RecoveryAction,
} from "../../types/pose";

export interface ErrorRecoveryOptions {
  enableManualMode: () => void;
  retryCamera: () => Promise<void>;
  reduceQuality: () => void;
  restartPoseDetection: () => Promise<void>;
  showTroubleshooting: () => void;
}

export class CameraErrorHandler {
  private static errorCount = 0;
  private static lastErrorTime = 0;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly ERROR_COOLDOWN = 5000; // 5 seconds

  /**
   * Handle camera-related errors with appropriate recovery actions
   */
  static handleCameraError(
    error: CameraError,
    recoveryOptions: ErrorRecoveryOptions
  ): void {
    console.error("📸 Camera Error:", error);

    // Track error frequency to prevent spam
    const now = Date.now();
    if (now - this.lastErrorTime < this.ERROR_COOLDOWN) {
      this.errorCount++;
    } else {
      this.errorCount = 1;
    }
    this.lastErrorTime = now;

    // If too many errors in short time, suggest manual mode
    if (this.errorCount >= this.MAX_RETRY_ATTEMPTS) {
      this.handleRepeatedErrors(error, recoveryOptions);
      return;
    }

    // Handle specific error types
    switch (error.type) {
      case "permission":
        this.handlePermissionError(error, recoveryOptions);
        break;
      case "unavailable":
        this.handleUnavailableError(error, recoveryOptions);
        break;
      case "initialization":
        this.handleInitializationError(error, recoveryOptions);
        break;
      case "processing":
        this.handleProcessingError(error, recoveryOptions);
        break;
      default:
        this.handleGenericError(error, recoveryOptions);
    }
  }

  /**
   * Handle pose detection errors
   */
  static handlePoseDetectionError(
    error: PoseDetectionError,
    recoveryOptions: ErrorRecoveryOptions
  ): void {
    console.error("🤖 Pose Detection Error:", error);

    const recoveryActions = this.getRecoveryActions(error);

    // Try automatic recovery first
    const automaticAction = recoveryActions.find((action) => action.automatic);
    if (automaticAction) {
      this.executeRecoveryAction(automaticAction, recoveryOptions);
      return;
    }

    // Show user recovery options
    this.showRecoveryDialog(error, recoveryActions, recoveryOptions);
  }

  private static handlePermissionError(
    error: CameraError,
    recoveryOptions: ErrorRecoveryOptions
  ): void {
    Alert.alert(
      "Camera Permission Required",
      "This app needs camera access to track your workout form automatically. You can still use manual counting if you prefer.",
      [
        {
          text: "Use Manual Mode",
          onPress: recoveryOptions.enableManualMode,
        },
        {
          text: "Open Settings",
          onPress: () => {
            // TODO: Open device settings
            console.log("Opening device settings...");
          },
        },
        {
          text: "Try Again",
          onPress: recoveryOptions.retryCamera,
        },
      ]
    );
  }

  private static handleUnavailableError(
    error: CameraError,
    recoveryOptions: ErrorRecoveryOptions
  ): void {
    Alert.alert(
      "Camera Unavailable",
      "The camera is currently unavailable. This might be because another app is using it or there's a hardware issue.",
      [
        {
          text: "Use Manual Mode",
          onPress: recoveryOptions.enableManualMode,
        },
        {
          text: "Troubleshooting",
          onPress: recoveryOptions.showTroubleshooting,
        },
        {
          text: "Try Again",
          onPress: recoveryOptions.retryCamera,
        },
      ]
    );
  }

  private static handleInitializationError(
    error: CameraError,
    recoveryOptions: ErrorRecoveryOptions
  ): void {
    Alert.alert(
      "Camera Setup Failed",
      "There was a problem setting up the camera for pose detection. You can try again or use manual counting.",
      [
        {
          text: "Use Manual Mode",
          onPress: recoveryOptions.enableManualMode,
        },
        {
          text: "Reduce Quality",
          onPress: () => {
            recoveryOptions.reduceQuality();
            recoveryOptions.retryCamera();
          },
        },
        {
          text: "Try Again",
          onPress: recoveryOptions.retryCamera,
        },
      ]
    );
  }

  private static handleProcessingError(
    error: CameraError,
    recoveryOptions: ErrorRecoveryOptions
  ): void {
    Alert.alert(
      "Processing Issue",
      "There's an issue processing the camera feed. This might be due to low device performance or poor lighting.",
      [
        {
          text: "Use Manual Mode",
          onPress: recoveryOptions.enableManualMode,
        },
        {
          text: "Reduce Quality",
          onPress: recoveryOptions.reduceQuality,
        },
        {
          text: "Restart Detection",
          onPress: recoveryOptions.restartPoseDetection,
        },
      ]
    );
  }

  private static handleGenericError(
    error: CameraError,
    recoveryOptions: ErrorRecoveryOptions
  ): void {
    Alert.alert(
      "Camera Error",
      error.message || "An unexpected camera error occurred.",
      [
        {
          text: "Use Manual Mode",
          onPress: recoveryOptions.enableManualMode,
        },
        {
          text: "Try Again",
          onPress: recoveryOptions.retryCamera,
        },
      ]
    );
  }

  private static handleRepeatedErrors(
    error: CameraError,
    recoveryOptions: ErrorRecoveryOptions
  ): void {
    Alert.alert(
      "Multiple Camera Issues",
      "We're having trouble with the camera. Let's switch to manual counting so you can continue your workout.",
      [
        {
          text: "Use Manual Mode",
          onPress: () => {
            this.errorCount = 0; // Reset error count
            recoveryOptions.enableManualMode();
          },
        },
        {
          text: "Troubleshooting Guide",
          onPress: recoveryOptions.showTroubleshooting,
        },
      ]
    );
  }

  private static getRecoveryActions(
    error: PoseDetectionError
  ): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (error.type) {
      case "ml_kit":
        actions.push({
          type: "restart_camera",
          description: "Restart ML Kit pose detection",
          automatic: true,
          priority: 8,
        });
        break;

      case "camera":
        actions.push({
          type: "retry",
          description: "Retry camera initialization",
          automatic: false,
          priority: 7,
        });
        break;

      case "processing":
        if (error.context.frameRate && error.context.frameRate < 15) {
          actions.push({
            type: "reduce_quality",
            description: "Reduce processing quality to improve performance",
            automatic: true,
            priority: 6,
          });
        }
        break;

      case "calibration":
        actions.push({
          type: "recalibrate",
          description: "Restart calibration process",
          automatic: false,
          priority: 5,
        });
        break;

      case "validation":
        actions.push({
          type: "fallback_manual",
          description: "Switch to manual counting",
          automatic: false,
          priority: 3,
        });
        break;
    }

    // Always add manual fallback as last resort
    actions.push({
      type: "fallback_manual",
      description: "Use manual counting mode",
      automatic: false,
      priority: 1,
    });

    return actions.sort((a, b) => b.priority - a.priority);
  }

  private static executeRecoveryAction(
    action: RecoveryAction,
    recoveryOptions: ErrorRecoveryOptions
  ): void {
    console.log(`🔧 Executing recovery action: ${action.type}`);

    switch (action.type) {
      case "retry":
        recoveryOptions.retryCamera();
        break;
      case "recalibrate":
        // TODO: Implement recalibration
        console.log("Recalibration not implemented yet");
        break;
      case "reduce_quality":
        recoveryOptions.reduceQuality();
        break;
      case "fallback_manual":
        recoveryOptions.enableManualMode();
        break;
      case "restart_camera":
        recoveryOptions.restartPoseDetection();
        break;
    }
  }

  private static showRecoveryDialog(
    error: PoseDetectionError,
    actions: RecoveryAction[],
    recoveryOptions: ErrorRecoveryOptions
  ): void {
    const buttons = actions.slice(0, 3).map((action) => ({
      text: action.description,
      onPress: () => this.executeRecoveryAction(action, recoveryOptions),
    }));

    Alert.alert("Pose Detection Issue", error.message, buttons);
  }

  /**
   * Get user-friendly troubleshooting tips
   */
  static getTroubleshootingTips(): string[] {
    return [
      "🔆 Ensure good lighting - avoid backlighting or shadows",
      "📏 Position camera 6-8 feet away for full body visibility",
      "🧹 Clean camera lens if image appears blurry",
      "📱 Close other apps that might be using the camera",
      "🔄 Restart the app if issues persist",
      "⚡ Check device performance - close background apps",
      "🎯 Make sure you're fully visible in the camera frame",
      "🏠 Use a clear background without distracting patterns",
      "👕 Wear contrasting colors to your background",
      "🔇 Disable other camera apps or video calls",
    ];
  }

  /**
   * Check if device meets minimum requirements
   */
  static checkDeviceCapability(): {
    isSupported: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // TODO: Implement actual device capability checks
    // For now, assume all devices are supported

    return {
      isSupported: issues.length === 0,
      issues,
      recommendations:
        issues.length > 0
          ? [
              "Consider using manual counting mode",
              "Try reducing pose detection quality in settings",
              "Ensure good lighting conditions",
            ]
          : [],
    };
  }

  /**
   * Reset error tracking (call when user successfully uses camera)
   */
  static resetErrorTracking(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }

  /**
   * Get current error statistics
   */
  static getErrorStats(): {
    errorCount: number;
    lastErrorTime: number;
    isInCooldown: boolean;
  } {
    return {
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime,
      isInCooldown: Date.now() - this.lastErrorTime < this.ERROR_COOLDOWN,
    };
  }
}
