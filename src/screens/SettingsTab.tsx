import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
} from "react-native";
import { COLORS } from "../config/colors";
import { SafeAreaWrapper } from "../components/SafeAreaWrapper";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { updatePreferences, resetUserData } from "../store/slices/userSlice";
import { resetChallenge } from "../store/slices/challengeSlice";
import { PoseDetectionTest } from "../components/PoseDetectionTest";
import { CameraIntegrationTest } from "../components/CameraIntegrationTest";

const SettingsTab: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dispatch = useAppDispatch();
  const { preferences } = useAppSelector((state) => state.user);
  const [showPoseTest, setShowPoseTest] = useState(false);
  const [showCameraTest, setShowCameraTest] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleResetData = () => {
    Alert.alert(
      "Reset All Data",
      "This will permanently delete all your progress, achievements, and settings. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: () => {
            dispatch(resetUserData());
            dispatch(resetChallenge());
            Alert.alert(
              "Data Reset",
              "All data has been reset. Restart the app to see changes."
            );
          },
        },
      ]
    );
  };

  const settingSections = [
    {
      title: "Notifications",
      items: [
        {
          label: "Daily Reminders",
          value: preferences?.notifications?.enabled,
          type: "toggle",
        },
        {
          label: "Streak Alerts",
          value: preferences?.notifications?.streakReminders,
          type: "toggle",
        },
        {
          label: "Milestone Celebrations",
          value: preferences?.notifications?.milestoneAlerts,
          type: "toggle",
        },
      ],
    },
    {
      title: "Privacy",
      items: [
        {
          label: "Share Progress",
          value: preferences?.privacy?.shareProgress,
          type: "toggle",
        },
        {
          label: "Analytics",
          value: preferences?.privacy?.allowAnalytics,
          type: "toggle",
        },
      ],
    },
    {
      title: "Display",
      items: [
        {
          label: "Theme",
          value: preferences?.display?.theme || "auto",
          type: "select",
        },
        {
          label: "Units",
          value: preferences?.display?.units || "metric",
          type: "select",
        },
      ],
    },
  ];

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Customize your experience</Text>
          </View>

          {/* Settings Sections */}
          {settingSections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>

              {section.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.settingItem}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <View style={styles.settingValue}>
                    <Text style={styles.settingValueText}>
                      {typeof item.value === "boolean"
                        ? item.value
                          ? "On"
                          : "Off"
                        : item.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

          {/* App Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Info</Text>

            <View style={styles.infoCard}>
              <Text style={styles.appName}>OneMore Challenge</Text>
              <Text style={styles.appVersion}>Version 1.0.0</Text>
              <Text style={styles.appDescription}>
                Progressive fitness challenge app with Batman-inspired dark
                theme
              </Text>
            </View>
          </View>

          {/* Development Tools (only in dev mode) */}
          {__DEV__ && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🛠️ Development Tools</Text>

              <TouchableOpacity
                style={styles.devButton}
                onPress={() => setShowPoseTest(true)}
              >
                <Text style={styles.devButtonText}>Test Pose Detection</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.devButton}
                onPress={() => setShowCameraTest(true)}
              >
                <Text style={styles.devButtonText}>
                  Test Camera Integration
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Danger Zone */}
          <View style={styles.section}>
            <Text style={styles.dangerTitle}>⚠️ Danger Zone</Text>

            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleResetData}
            >
              <Text style={styles.dangerButtonText}>Reset All Data</Text>
            </TouchableOpacity>
          </View>

          {/* Coming Soon */}
          <View style={styles.section}>
            <View style={styles.comingSoonCard}>
              <Text style={styles.comingSoonEmoji}>🚧</Text>
              <Text style={styles.comingSoonTitle}>
                More Settings Coming Soon!
              </Text>
              <Text style={styles.comingSoonText}>
                • Notification scheduling{"\n"}• Theme customization{"\n"}• Data
                export/import{"\n"}• Account sync{"\n"}• Advanced preferences
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Pose Detection Test Modal */}
      <Modal
        visible={showPoseTest}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPoseTest(false)}
            >
              <Text style={styles.closeButtonText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <PoseDetectionTest />
        </View>
      </Modal>

      {/* Camera Integration Test Modal */}
      <Modal
        visible={showCameraTest}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCameraTest(false)}
            >
              <Text style={styles.closeButtonText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <CameraIntegrationTest />
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.TEXT.PRIMARY,
    textShadowColor: COLORS.EFFECTS.OVERLAY,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT.TERTIARY,
    marginTop: 4,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 16,
  },
  settingItem: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.TEXT.PRIMARY,
    flex: 1,
  },
  settingValue: {
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settingValueText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    fontWeight: "500",
  },
  infoCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 20,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.ACCENT.ERROR,
    marginBottom: 16,
  },
  dangerButton: {
    backgroundColor: COLORS.ACCENT.ERROR,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  dangerButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  comingSoonCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  comingSoonEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 20,
  },
  devButton: {
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  devButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY[0],
  },
  modalHeader: {
    padding: 20,
    paddingTop: 60,
    alignItems: "flex-end",
  },
  closeButton: {
    backgroundColor: COLORS.ACCENT.ERROR,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SettingsTab;
