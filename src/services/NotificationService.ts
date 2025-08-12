import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

export interface NotificationSettings {
  dailyReminder: {
    enabled: boolean;
    time: string; // HH:MM format
  };
  streakReminders: {
    enabled: boolean;
    threshold: number; // Days before sending streak warning
  };
  milestoneAlerts: {
    enabled: boolean;
  };
  achievementCelebrations: {
    enabled: boolean;
  };
}

class NotificationService {
  private expoPushToken: string | null = null;
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn("Notification permissions not granted");
        return false;
      }

      // Get push token
      this.expoPushToken = await this.registerForPushNotificationsAsync();
      console.log(
        "📱 Notification service initialized with token:",
        this.expoPushToken
      );

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize notifications:", error);
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  }

  private async registerForPushNotificationsAsync(): Promise<string | null> {
    let token = null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "OneMore Challenge",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#667eea",
        sound: "default",
      });
    }

    if (Device.isDevice) {
      const { data } = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      token = data;
    } else {
      console.warn("Must use physical device for Push Notifications");
    }

    return token;
  }

  // Schedule daily reminder notification
  async scheduleDailyReminder(
    settings: NotificationSettings["dailyReminder"]
  ): Promise<string | null> {
    if (!settings.enabled) return null;

    try {
      // Cancel existing daily reminders
      await this.cancelNotificationsByType("daily");

      const [hours, minutes] = settings.time.split(":").map(Number);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "💪 Time for Your OneMore Challenge!",
          body: "Don't break your streak! Complete today's exercises and keep growing stronger.",
          data: { type: "daily" },
          sound: "default",
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      console.log(
        `📅 Daily reminder scheduled for ${settings.time}:`,
        notificationId
      );
      return notificationId;
    } catch (error) {
      console.error("Failed to schedule daily reminder:", error);
      return null;
    }
  }

  // Schedule milestone celebration
  async scheduleMilestoneCelebration(day: number): Promise<string | null> {
    const milestones = {
      7: {
        title: "🔥 Week Warrior!",
        body: "Amazing! You've completed your first week of the challenge!",
      },
      14: {
        title: "💪 Two Week Champion!",
        body: "You're building incredible momentum! Keep it up!",
      },
      30: {
        title: "🏆 Month Master!",
        body: "WOW! 30 days of dedication. You're officially unstoppable!",
      },
      37: {
        title: "🚀 Halfway Hero!",
        body: "You're halfway there! The finish line is in sight!",
      },
      50: {
        title: "⚡ 50-Day Superstar!",
        body: "Incredible discipline! You're in the final stretch!",
      },
      60: {
        title: "🎖️ 60-Day Legend!",
        body: "You're so close! Just 15 more days to complete the challenge!",
      },
      75: {
        title: "🚀 Fitness Warrior!",
        body: "75 days complete! You're unstoppable! 🔥",
      },
      100: {
        title: "👑 Challenge Conqueror!",
        body: "100 DAYS COMPLETE! You are absolutely AMAZING! 🎉",
      },
    };

    const milestone = milestones[day as keyof typeof milestones];
    if (!milestone) return null;

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: milestone.title,
          body: milestone.body,
          data: { type: "milestone", day },
          sound: "default",
        },
        trigger: {
          seconds: 5, // Send immediately after completion
        },
      });

      console.log(
        `🎉 Milestone celebration scheduled for day ${day}:`,
        notificationId
      );
      return notificationId;
    } catch (error) {
      console.error("Failed to schedule milestone celebration:", error);
      return null;
    }
  }

  // Schedule achievement unlock notification
  async scheduleAchievementUnlock(achievement: {
    title: string;
    description: string;
    icon: string;
  }): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🏆 Achievement Unlocked: ${achievement.title}!`,
          body: `${achievement.icon} ${achievement.description}`,
          data: { type: "achievement", achievement },
          sound: "default",
        },
        trigger: {
          seconds: 3, // Send shortly after unlock
        },
      });

      console.log(`🎖️ Achievement notification scheduled:`, notificationId);
      return notificationId;
    } catch (error) {
      console.error("Failed to schedule achievement notification:", error);
      return null;
    }
  }

  // Send immediate motivational notification
  async sendMotivationalPush(message: {
    title: string;
    body: string;
    type?: string;
  }): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { type: message.type || "motivation" },
          sound: "default",
        },
        trigger: {
          seconds: 1,
        },
      });

      console.log("💬 Motivational notification sent:", notificationId);
      return notificationId;
    } catch (error) {
      console.error("Failed to send motivational notification:", error);
      return null;
    }
  }

  // Cancel notifications by type
  async cancelNotificationsByType(type: string): Promise<void> {
    try {
      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync();
      const notificationsToCancel = scheduledNotifications
        .filter((notification) => notification.content.data?.type === type)
        .map((notification) => notification.identifier);

      await Promise.all(
        notificationsToCancel.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id)
        )
      );

      console.log(
        `🗑️ Cancelled ${notificationsToCancel.length} notifications of type: ${type}`
      );
    } catch (error) {
      console.error("Failed to cancel notifications:", error);
    }
  }

  // Check if notifications are enabled
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  }

  // Get push token for server-side notifications
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

export default new NotificationService();
