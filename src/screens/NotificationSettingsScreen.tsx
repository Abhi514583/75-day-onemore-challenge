import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { updatePreferences } from "../store/slices/userSlice";
import NotificationService, {
  NotificationSettings,
} from "../services/NotificationService";

interface NotificationSettingsScreenProps {
  onBack: () => void;
}

const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({
  onBack,
}) => {
  const dispatch = useAppDispatch();
  const { preferences } = useAppSelector(
    (state) =>
      state.user || {
        preferences: {
          notifications: {
            enabled: true,
            reminderTime: "09:00",
            streakReminders: true,
            milestoneAlerts: true,
          },
        },
      }
  );

  const [settings, setSettings] = useState<NotificationSettings>({
    dailyReminder: {
      enabled: preferences.notifications.enabled,
      time: preferences.notifications.reminderTime,
    },
    streakReminders: {
      enabled: preferences.notifications.streakReminders,
      threshold: 1, // Days
    },
    milestoneAlerts: {
      enabled: preferences.notifications.milestoneAlerts,
    },
    achievementCelebrations: {
      enabled: true,
    },
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "unknown"
  >("unknown");

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      const initialized = await NotificationService.initialize();
      setIsInitialized(initialized);

      const hasPermission = await NotificationService.areNotificationsEnabled();
      setPermissionStatus(hasPermission ? "granted" : "denied");

      if (initialized && hasPermission) {
        // Schedule notifications based on current settings
        await applyNotificationSettings();
      }
    } catch (error) {
      console.error("Failed to initialize notifications:", error);
      setPermissionStatus("denied");
    }
  };

  const applyNotificationSettings = async () => {
    try {
      // Schedule daily reminder
      if (settings.dailyReminder.enabled) {
        await NotificationService.scheduleDailyReminder(settings.dailyReminder);
      } else {
        await NotificationService.cancelNotificationsByType("daily");
      }

      console.log("✅ Notification settings applied");
    } catch (error) {
      console.error("Failed to apply notification settings:", error);
    }
  };

  const handleSettingChange = async (
    key: keyof NotificationSettings,
    value: any
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Update Redux store
    if (key === "dailyReminder") {
      dispatch(
        updatePreferences({
          notifications: {
            ...preferences.notifications,
            enabled: value.enabled,
            reminderTime: value.time,
          },
        })
      );
    } else if (key === "streakReminders") {
      dispatch(
        updatePreferences({
          notifications: {
            ...preferences.notifications,
            streakReminders: value.enabled,
          },
        })
      );
    } else if (key === "milestoneAlerts") {
      dispatch(
        updatePreferences({
          notifications: {
            ...preferences.notifications,
            milestoneAlerts: value.enabled,
          },
        })
      );
    }

    // Apply changes immediately
    if (permissionStatus === "granted") {
      await applyNotificationSettings();
    }
  };

  const testNotification = async () => {
    if (permissionStatus !== "granted") {
      Alert.alert(
        "Permissions Required",
        "Please enable notifications to test this feature."
      );
      return;
    }

    await NotificationService.sendMotivationalPush({
      title: "🧪 Test Notification",
      body: "This is a test notification from OneMore Challenge! Your notifications are working perfectly! 🎉",
      type: "test",
    });

    Alert.alert(
      "Test Sent!",
      "Check your notification panel in a few seconds."
    );
  };

  const requestPermissions = async () => {
    const initialized = await NotificationService.initialize();
    if (initialized) {
      setPermissionStatus("granted");
      setIsInitialized(true);
      await applyNotificationSettings();
      Alert.alert(
        "Success!",
        "Notifications are now enabled. You'll receive daily reminders and milestone celebrations!"
      );
    } else {
      Alert.alert(
        "Permission Denied",
        "Please enable notifications in your device settings to receive reminders."
      );
    }
  };

  const timeOptions = [
    { label: "6:00 AM", value: "06:00" },
    { label: "7:00 AM", value: "07:00" },
    { label: "8:00 AM", value: "08:00" },
    { label: "9:00 AM", value: "09:00" },
    { label: "10:00 AM", value: "10:00" },
    { label: "6:00 PM", value: "18:00" },
    { label: "7:00 PM", value: "19:00" },
    { label: "8:00 PM", value: "20:00" },
    { label: "9:00 PM", value: "21:00" },
  ];

  if (permissionStatus === "denied") {
    return (
      <LinearGradient
        colors={["#667eea", "#764ba2", "#f093fb"]}
        locations={[0, 0.6, 1]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.permissionContainer}>
            <Text style={styles.permissionIcon}>🔔</Text>
            <Text style={styles.permissionTitle}>Enable Notifications</Text>
            <Text style={styles.permissionText}>
              Stay motivated with daily reminders, streak alerts, and milestone
              celebrations!
            </Text>

            <TouchableOpacity
              style={styles.enableButton}
              onPress={requestPermissions}
            >
              <LinearGradient
                colors={[
                  "rgba(255, 255, 255, 0.3)",
                  "rgba(255, 255, 255, 0.1)",
                ]}
                style={styles.enableButtonGradient}
              >
                <Text style={styles.enableButtonText}>
                  🚀 Enable Notifications
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#f093fb"]}
      locations={[0, 0.6, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={testNotification}
          >
            <Text style={styles.testButtonText}>Test</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Daily Reminders */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>📅 Daily Reminders</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Daily Workout Reminder</Text>
                <Text style={styles.settingDescription}>
                  Get reminded to complete your daily challenge
                </Text>
              </View>
              <Switch
                value={settings.dailyReminder.enabled}
                onValueChange={(value) =>
                  handleSettingChange("dailyReminder", {
                    ...settings.dailyReminder,
                    enabled: value,
                  })
                }
                trackColor={{
                  false: "rgba(255, 255, 255, 0.3)",
                  true: "#FFD700",
                }}
                thumbColor={
                  settings.dailyReminder.enabled ? "#ffffff" : "#f4f3f4"
                }
              />
            </View>

            {settings.dailyReminder.enabled && (
              <View style={styles.timeSelector}>
                <Text style={styles.timeSelectorTitle}>Reminder Time</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.timeOptions}
                >
                  {timeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.timeOption,
                        settings.dailyReminder.time === option.value &&
                          styles.timeOptionActive,
                      ]}
                      onPress={() =>
                        handleSettingChange("dailyReminder", {
                          ...settings.dailyReminder,
                          time: option.value,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          settings.dailyReminder.time === option.value &&
                            styles.timeOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Other Settings */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>🏆 Celebrations</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>Milestone Celebrations</Text>
                <Text style={styles.settingDescription}>
                  Celebrate when you reach Day 7, 30, 100, etc.
                </Text>
              </View>
              <Switch
                value={settings.milestoneAlerts.enabled}
                onValueChange={(value) =>
                  handleSettingChange("milestoneAlerts", {
                    enabled: value,
                  })
                }
                trackColor={{
                  false: "rgba(255, 255, 255, 0.3)",
                  true: "#4CAF50",
                }}
                thumbColor={
                  settings.milestoneAlerts.enabled ? "#ffffff" : "#f4f3f4"
                }
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  testButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  testButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  enableButton: {
    borderRadius: 25,
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  enableButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  enableButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },
  timeSelector: {
    marginTop: 16,
  },
  timeSelectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 12,
  },
  timeOptions: {
    paddingVertical: 8,
  },
  timeOption: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  timeOptionActive: {
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    borderColor: "#FFD700",
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
  },
  timeOptionTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
});

export default NotificationSettingsScreen;
