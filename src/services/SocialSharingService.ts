import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import { Alert } from "react-native";

export interface ShareCardData {
  currentDay: number;
  totalDays: number;
  currentStreak: number;
  todaysExercises: {
    pushups: number;
    squats: number;
    situps: number;
    planks: number;
  };
  achievement?: {
    title: string;
    icon: string;
    description: string;
  };
}

export interface ShareOptions {
  saveToGallery?: boolean;
  shareToSocial?: boolean;
  platform?: "instagram" | "twitter" | "facebook" | "general";
}

class SocialSharingService {
  private async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Permission request failed:", error);
      return false;
    }
  }

  async captureAndShare(
    viewRef: any,
    data: ShareCardData,
    options: ShareOptions = {}
  ): Promise<boolean> {
    try {
      console.log("📸 Capturing share card...");

      // Capture the view as an image
      const uri = await captureRef(viewRef, {
        format: "png",
        quality: 1.0,
        result: "tmpfile",
      });

      console.log("✅ Share card captured:", uri);

      // Save to gallery if requested
      if (options.saveToGallery) {
        const hasPermission = await this.requestPermissions();
        if (hasPermission) {
          await MediaLibrary.saveToLibraryAsync(uri);
          console.log("💾 Saved to gallery");
        }
      }

      // Share to social media
      if (options.shareToSocial) {
        await this.shareToSocial(uri, data, options.platform);
      }

      return true;
    } catch (error) {
      console.error("Share failed:", error);
      Alert.alert(
        "Share Failed",
        "Unable to create share card. Please try again."
      );
      return false;
    }
  }

  private async shareToSocial(
    imageUri: string,
    data: ShareCardData,
    platform?: string
  ): Promise<void> {
    const shareText = this.generateShareText(data, platform);

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        "Sharing Not Available",
        "Sharing is not available on this device."
      );
      return;
    }

    await Sharing.shareAsync(imageUri, {
      mimeType: "image/png",
      dialogTitle: shareText,
    });
  }

  private generateShareText(data: ShareCardData, platform?: string): string {
    const {
      currentDay,
      totalDays,
      currentStreak,
      todaysExercises,
      achievement,
    } = data;

    const baseText = `💪 Day ${currentDay} of my OneMore Challenge! 🔥`;
    const streakText =
      currentStreak > 1 ? ` ${currentStreak}-day streak going strong! ⚡` : "";
    const exerciseText = `\n\nToday's targets:\n• ${todaysExercises.pushups} push-ups 💪\n• ${todaysExercises.squats} squats 🦵\n• ${todaysExercises.situps} sit-ups 🏋️\n• ${todaysExercises.planks}s plank ⏱️`;

    let achievementText = "";
    if (achievement) {
      achievementText = `\n\n🏆 Achievement Unlocked: ${achievement.title}! ${achievement.icon}`;
    }

    const appPromo =
      "\n\n#OneMoreChallenge #FitnessJourney #ProgressiveTraining";

    switch (platform) {
      case "instagram":
        return `${baseText}${streakText}${exerciseText}${achievementText}\n\n📱 Join me on the OneMore Challenge app!${appPromo}`;

      case "twitter":
        return `${baseText}${streakText}${achievementText}\n\n📱 OneMore Challenge app${appPromo}`;

      case "facebook":
        return `${baseText}${streakText}${exerciseText}${achievementText}\n\nI'm using the OneMore Challenge app to track my progress. Who wants to join me? 💪${appPromo}`;

      default:
        return `${baseText}${streakText}${exerciseText}${achievementText}\n\n📱 OneMore Challenge app${appPromo}`;
    }
  }

  generateMilestoneText(day: number): string {
    const milestones = {
      1: "🎯 Started my OneMore transformation journey!",
      7: "🔥 One week down, feeling stronger already!",
      14: "💪 Two weeks of consistency - the habit is forming!",
      30: "🏆 30 days completed - I'm officially a month champion!",
      37: "🚀 Halfway there! 37 days of pure dedication!",
      50: "⚡ 50 days strong - nothing can stop me now!",
      60: "🎖️ 60 days of discipline - the finish line is in sight!",
      75: "🚀 75 days complete - I'm a fitness warrior!",
      100: "👑 100 DAYS COMPLETE! I am a Challenge Conqueror! 🎉",
    };

    return (
      milestones[day as keyof typeof milestones] ||
      `💪 Day ${day} complete - still going strong!`
    );
  }

  async shareQuickProgress(data: ShareCardData): Promise<void> {
    const text = this.generateShareText(data);

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync("", {
          dialogTitle: text,
        });
      } else {
        // Fallback to copying to clipboard or other method
        Alert.alert("Share", text);
      }
    } catch (error) {
      console.error("Quick share failed:", error);
    }
  }

  // Pre-defined share card templates
  getShareCardTemplate(
    type: "daily" | "milestone" | "achievement" | "completion"
  ): any {
    const templates = {
      daily: {
        backgroundColor: ["#667eea", "#764ba2"],
        title: "Daily Progress",
        subtitle: "OneMore Challenge",
        showExercises: true,
        showStreak: true,
      },
      milestone: {
        backgroundColor: ["#FFD700", "#FFA500"],
        title: "Milestone Reached!",
        subtitle: "OneMore Challenge",
        showExercises: false,
        showStreak: true,
        showCelebration: true,
      },
      achievement: {
        backgroundColor: ["#FF6B6B", "#4ECDC4"],
        title: "Achievement Unlocked!",
        subtitle: "OneMore Challenge",
        showExercises: false,
        showStreak: false,
        showBadge: true,
      },
      completion: {
        backgroundColor: ["#667eea", "#764ba2", "#f093fb"],
        title: "Challenge Complete!",
        subtitle: "Challenge Conqueror",
        showExercises: false,
        showStreak: true,
        showCelebration: true,
        showStats: true,
      },
    };

    return templates[type];
  }
}

export default new SocialSharingService();
