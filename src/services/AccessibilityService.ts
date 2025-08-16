import { Vibration, AccessibilityInfo } from "react-native";
import * as Speech from "expo-speech";
import { Haptics } from "expo-haptics";
import {
  FormFeedback,
  ExerciseType,
  AccessibilitySettings,
  FeedbackCustomization,
} from "../types/pose";

export interface VoicePrompt {
  text: string;
  priority: "low" | "medium" | "high" | "critical";
  category: "rep" | "form" | "encouragement" | "instruction" | "warning";
}

export interface HapticPattern {
  name: string;
  pattern: number[]; // [vibrate, pause, vibrate, pause, ...]
  intensity?: "light" | "medium" | "heavy";
}

export class AccessibilityService {
  private static isScreenReaderEnabled = false;
  private static isReduceMotionEnabled = false;
  private static isHighContrastEnabled = false;
  private static lastVoicePromptTime = 0;
  private static readonly VOICE_PROMPT_COOLDOWN = 2000; // 2 seconds between voice prompts

  // Haptic patterns for different feedback types
  private static readonly HAPTIC_PATTERNS: { [key: string]: HapticPattern } = {
    REP_COUNTED: {
      name: "Rep Counted",
      pattern: [100],
      intensity: "medium",
    },
    GOOD_FORM: {
      name: "Good Form",
      pattern: [50, 50, 50],
      intensity: "light",
    },
    FORM_WARNING: {
      name: "Form Warning",
      pattern: [200, 100, 200],
      intensity: "medium",
    },
    FORM_ERROR: {
      name: "Form Error",
      pattern: [300, 150, 300, 150, 300],
      intensity: "heavy",
    },
    MILESTONE: {
      name: "Milestone",
      pattern: [100, 50, 100, 50, 100, 50, 200],
      intensity: "medium",
    },
    EXERCISE_COMPLETE: {
      name: "Exercise Complete",
      pattern: [200, 100, 200, 100, 400],
      intensity: "heavy",
    },
    CALIBRATION_SUCCESS: {
      name: "Calibration Success",
      pattern: [150, 75, 150],
      intensity: "medium",
    },
    ERROR: {
      name: "Error",
      pattern: [500],
      intensity: "heavy",
    },
  };

  /**
   * Initialize accessibility service
   */
  static async initialize(): Promise<void> {
    try {
      // Check accessibility settings
      this.isScreenReaderEnabled =
        await AccessibilityInfo.isScreenReaderEnabled();
      this.isReduceMotionEnabled =
        await AccessibilityInfo.isReduceMotionEnabled();

      // Listen for accessibility changes
      AccessibilityInfo.addEventListener("screenReaderChanged", (enabled) => {
        this.isScreenReaderEnabled = enabled;
      });

      AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
        this.isReduceMotionEnabled = enabled;
      });

      console.log("AccessibilityService initialized");
    } catch (error) {
      console.error("Error initializing AccessibilityService:", error);
    }
  }

  /**
   * Provide haptic feedback for form corrections and rep counting
   */
  static async provideHapticFeedback(
    feedbackType: keyof typeof AccessibilityService.HAPTIC_PATTERNS,
    settings: AccessibilitySettings
  ): Promise<void> {
    if (!settings.hapticFeedback) return;

    try {
      const pattern = this.HAPTIC_PATTERNS[feedbackType];
      if (!pattern) return;

      // Use Expo Haptics for more precise control
      switch (pattern.intensity) {
        case "light":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "heavy":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // For complex patterns, use Vibration API
      if (pattern.pattern.length > 1) {
        Vibration.vibrate(pattern.pattern);
      }
    } catch (error) {
      console.error("Error providing haptic feedback:", error);
      // Fallback to basic vibration
      Vibration.vibrate(100);
    }
  }

  /**
   * Provide audio feedback with voice prompts
   */
  static async provideAudioFeedback(
    prompt: VoicePrompt,
    settings: AccessibilitySettings,
    customization: FeedbackCustomization
  ): Promise<void> {
    if (!settings.audioFeedback && !settings.voicePrompts) return;

    const now = Date.now();

    // Respect cooldown for non-critical prompts
    if (
      prompt.priority !== "critical" &&
      now - this.lastVoicePromptTime < this.VOICE_PROMPT_COOLDOWN
    ) {
      return;
    }

    try {
      const speechOptions: Speech.SpeechOptions = {
        language: customization.audioFeedback.language || "en-US",
        pitch: 1.0,
        rate: 0.8, // Slightly slower for better comprehension
        volume: customization.audioFeedback.volume || 0.8,
        voice: this.getVoiceIdentifier(customization.audioFeedback.voiceGender),
      };

      // Interrupt previous speech for high priority prompts
      if (prompt.priority === "critical" || prompt.priority === "high") {
        Speech.stop();
      }

      await Speech.speak(prompt.text, speechOptions);
      this.lastVoicePromptTime = now;
    } catch (error) {
      console.error("Error providing audio feedback:", error);
    }
  }

  /**
   * Create voice prompts for form feedback
   */
  static createVoicePrompt(
    feedback: FormFeedback,
    exerciseType: ExerciseType,
    repCount?: number
  ): VoicePrompt {
    let text = "";
    let priority: VoicePrompt["priority"] = "medium";
    let category: VoicePrompt["category"] = "form";

    switch (feedback.type) {
      case "error":
        text = this.createErrorPrompt(feedback, exerciseType);
        priority = "high";
        category = "warning";
        break;
      case "warning":
        text = this.createWarningPrompt(feedback, exerciseType);
        priority = "medium";
        category = "form";
        break;
      case "success":
        text = this.createSuccessPrompt(feedback, exerciseType, repCount);
        priority = "low";
        category = "encouragement";
        break;
      case "encouragement":
        text = feedback.message.replace(/[🔥💪⚡🎯🚀💯🏆⭐]/g, ""); // Remove emojis
        priority = "low";
        category = "encouragement";
        break;
      default:
        text = feedback.message.replace(/[🔥💪⚡🎯🚀💯🏆⭐]/g, "");
        priority = "medium";
        category = "form";
    }

    return { text, priority, category };
  }

  /**
   * Create error voice prompts
   */
  private static createErrorPrompt(
    feedback: FormFeedback,
    exerciseType: ExerciseType
  ): string {
    const bodyPartsText =
      feedback.bodyParts.length > 0
        ? ` Focus on your ${feedback.bodyParts.join(" and ")}.`
        : "";

    const baseMessage = feedback.message.replace(/[⚠️❌🔴]/g, "").trim();

    return `Stop. ${baseMessage}.${bodyPartsText} ${
      feedback.suggestions[0] || "Adjust your form and continue."
    }`;
  }

  /**
   * Create warning voice prompts
   */
  private static createWarningPrompt(
    feedback: FormFeedback,
    exerciseType: ExerciseType
  ): string {
    const baseMessage = feedback.message.replace(/[⚠️⚡🟡]/g, "").trim();

    return `${baseMessage}. ${
      feedback.suggestions[0] || "Keep focusing on proper form."
    }`;
  }

  /**
   * Create success voice prompts
   */
  private static createSuccessPrompt(
    feedback: FormFeedback,
    exerciseType: ExerciseType,
    repCount?: number
  ): string {
    if (repCount !== undefined) {
      const unit = exerciseType === "planks" ? "seconds" : "reps";
      return `${repCount} ${unit}. Great form!`;
    }

    return feedback.message.replace(/[✅🎉💚]/g, "").trim();
  }

  /**
   * Create rep counting voice prompts
   */
  static createRepCountPrompt(
    repCount: number,
    exerciseType: ExerciseType,
    isValidRep: boolean = true
  ): VoicePrompt {
    const unit = exerciseType === "planks" ? "seconds" : "reps";

    let text: string;
    let priority: VoicePrompt["priority"] = "medium";

    if (!isValidRep) {
      text = "Form check needed. Rep not counted.";
      priority = "high";
    } else if (repCount % 10 === 0 && repCount > 0) {
      text = `${repCount} ${unit}! Great milestone!`;
      priority = "medium";
    } else {
      text = `${repCount}`;
      priority = "low";
    }

    return {
      text,
      priority,
      category: "rep",
    };
  }

  /**
   * Create instruction voice prompts
   */
  static createInstructionPrompt(
    instruction: string,
    exerciseType: ExerciseType,
    priority: VoicePrompt["priority"] = "medium"
  ): VoicePrompt {
    return {
      text: instruction,
      priority,
      category: "instruction",
    };
  }

  /**
   * Get voice identifier based on gender preference
   */
  private static getVoiceIdentifier(
    gender?: "male" | "female" | "neutral"
  ): string | undefined {
    // This would need to be implemented based on available voices on the platform
    // For now, return undefined to use system default
    return undefined;
  }

  /**
   * Provide high-contrast visual elements
   */
  static getHighContrastColors(isEnabled: boolean = false): {
    background: string;
    text: string;
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    border: string;
  } {
    if (isEnabled) {
      return {
        background: "#000000",
        text: "#FFFFFF",
        primary: "#FFFF00", // High contrast yellow
        secondary: "#00FFFF", // High contrast cyan
        success: "#00FF00", // Pure green
        warning: "#FFFF00", // Pure yellow
        error: "#FF0000", // Pure red
        border: "#FFFFFF",
      };
    }

    // Standard colors
    return {
      background: "rgba(0,0,0,0.8)",
      text: "#FFFFFF",
      primary: "#00FF88",
      secondary: "#87CEEB",
      success: "#4CAF50",
      warning: "#FFD700",
      error: "#FF6B6B",
      border: "rgba(255,255,255,0.2)",
    };
  }

  /**
   * Get large text sizes for better visibility
   */
  static getLargeTextSizes(isEnabled: boolean = false): {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
  } {
    const multiplier = isEnabled ? 1.5 : 1;

    return {
      small: 12 * multiplier,
      medium: 16 * multiplier,
      large: 20 * multiplier,
      xlarge: 24 * multiplier,
    };
  }

  /**
   * Check if animations should be reduced
   */
  static shouldReduceMotion(): boolean {
    return this.isReduceMotionEnabled;
  }

  /**
   * Check if screen reader is enabled
   */
  static isScreenReaderActive(): boolean {
    return this.isScreenReaderEnabled;
  }

  /**
   * Create accessible announcements for screen readers
   */
  static announceForScreenReader(message: string): void {
    if (this.isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  /**
   * Provide comprehensive feedback for an event
   */
  static async provideComprehensiveFeedback(
    feedback: FormFeedback,
    exerciseType: ExerciseType,
    settings: AccessibilitySettings,
    customization: FeedbackCustomization,
    repCount?: number
  ): Promise<void> {
    try {
      // Haptic feedback
      const hapticType = this.getHapticTypeForFeedback(feedback);
      if (hapticType) {
        await this.provideHapticFeedback(hapticType, settings);
      }

      // Audio feedback
      if (settings.audioFeedback || settings.voicePrompts) {
        const voicePrompt = this.createVoicePrompt(
          feedback,
          exerciseType,
          repCount
        );
        await this.provideAudioFeedback(voicePrompt, settings, customization);
      }

      // Screen reader announcement
      if (settings.screenReaderSupport) {
        const announcement = this.createScreenReaderAnnouncement(
          feedback,
          exerciseType,
          repCount
        );
        this.announceForScreenReader(announcement);
      }
    } catch (error) {
      console.error("Error providing comprehensive feedback:", error);
    }
  }

  /**
   * Get haptic type for feedback
   */
  private static getHapticTypeForFeedback(
    feedback: FormFeedback
  ): keyof typeof AccessibilityService.HAPTIC_PATTERNS | null {
    switch (feedback.type) {
      case "error":
        return feedback.severity === "critical" ? "ERROR" : "FORM_ERROR";
      case "warning":
        return "FORM_WARNING";
      case "success":
        return feedback.message.includes("milestone") ||
          feedback.message.includes("complete")
          ? "MILESTONE"
          : "GOOD_FORM";
      case "encouragement":
        return "GOOD_FORM";
      default:
        return null;
    }
  }

  /**
   * Create screen reader announcement
   */
  private static createScreenReaderAnnouncement(
    feedback: FormFeedback,
    exerciseType: ExerciseType,
    repCount?: number
  ): string {
    let announcement = feedback.message.replace(
      /[🔥💪⚡🎯🚀💯🏆⭐⚠️❌✅🎉]/g,
      ""
    );

    if (repCount !== undefined) {
      const unit = exerciseType === "planks" ? "seconds" : "repetitions";
      announcement = `${repCount} ${unit}. ${announcement}`;
    }

    if (feedback.suggestions.length > 0) {
      announcement += ` Suggestion: ${feedback.suggestions[0]}`;
    }

    return announcement;
  }

  /**
   * Provide rep counting feedback
   */
  static async provideRepCountFeedback(
    repCount: number,
    exerciseType: ExerciseType,
    isValidRep: boolean,
    settings: AccessibilitySettings,
    customization: FeedbackCustomization
  ): Promise<void> {
    try {
      // Haptic feedback
      const hapticType = isValidRep ? "REP_COUNTED" : "FORM_WARNING";
      await this.provideHapticFeedback(hapticType, settings);

      // Audio feedback
      if (settings.audioFeedback || settings.voicePrompts) {
        const voicePrompt = this.createRepCountPrompt(
          repCount,
          exerciseType,
          isValidRep
        );
        await this.provideAudioFeedback(voicePrompt, settings, customization);
      }

      // Screen reader announcement
      if (settings.screenReaderSupport) {
        const unit = exerciseType === "planks" ? "seconds" : "repetitions";
        const announcement = isValidRep
          ? `${repCount} ${unit} completed`
          : `Repetition not counted due to form issues`;
        this.announceForScreenReader(announcement);
      }
    } catch (error) {
      console.error("Error providing rep count feedback:", error);
    }
  }

  /**
   * Provide milestone feedback
   */
  static async provideMilestoneFeedback(
    milestone: string,
    settings: AccessibilitySettings,
    customization: FeedbackCustomization
  ): Promise<void> {
    try {
      // Haptic feedback
      await this.provideHapticFeedback("MILESTONE", settings);

      // Audio feedback
      if (settings.audioFeedback || settings.voicePrompts) {
        const voicePrompt: VoicePrompt = {
          text: milestone.replace(/[🔥💪⚡🎯🚀💯🏆⭐🎉]/g, ""),
          priority: "medium",
          category: "encouragement",
        };
        await this.provideAudioFeedback(voicePrompt, settings, customization);
      }

      // Screen reader announcement
      if (settings.screenReaderSupport) {
        this.announceForScreenReader(`Milestone achieved: ${milestone}`);
      }
    } catch (error) {
      console.error("Error providing milestone feedback:", error);
    }
  }

  /**
   * Provide exercise completion feedback
   */
  static async provideCompletionFeedback(
    exerciseType: ExerciseType,
    finalCount: number,
    formScore: number,
    settings: AccessibilitySettings,
    customization: FeedbackCustomization
  ): Promise<void> {
    try {
      // Haptic feedback
      await this.provideHapticFeedback("EXERCISE_COMPLETE", settings);

      // Audio feedback
      if (settings.audioFeedback || settings.voicePrompts) {
        const unit = exerciseType === "planks" ? "seconds" : "repetitions";
        const gradeText =
          formScore >= 90 ? "Excellent" : formScore >= 75 ? "Good" : "Fair";

        const voicePrompt: VoicePrompt = {
          text: `Exercise complete! ${finalCount} ${unit} with ${gradeText} form. Well done!`,
          priority: "high",
          category: "encouragement",
        };
        await this.provideAudioFeedback(voicePrompt, settings, customization);
      }

      // Screen reader announcement
      if (settings.screenReaderSupport) {
        const unit = exerciseType === "planks" ? "seconds" : "repetitions";
        this.announceForScreenReader(
          `Exercise completed. ${finalCount} ${unit} with ${Math.round(
            formScore
          )}% form accuracy.`
        );
      }
    } catch (error) {
      console.error("Error providing completion feedback:", error);
    }
  }

  /**
   * Cleanup resources
   */
  static cleanup(): void {
    try {
      Speech.stop();
      AccessibilityInfo.removeEventListener("screenReaderChanged", () => {});
      AccessibilityInfo.removeEventListener("reduceMotionChanged", () => {});
    } catch (error) {
      console.error("Error cleaning up AccessibilityService:", error);
    }
  }
}
