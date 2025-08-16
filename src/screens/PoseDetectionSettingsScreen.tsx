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
  Slider,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  PoseDetectionSettings,
  AccessibilitySettings,
  FeedbackCustomization,
  ExerciseType,
} from "../types/pose";
import { AccessibilityService } from "../services/AccessibilityService";

interface PoseDetectionSettingsScreenProps {
  onBack: () => void;
  onSettingsChange?: (settings: PoseDetectionSettings) => void;
}

export const PoseDetectionSettingsScreen: React.FC<
  PoseDetectionSettingsScreenProps
> = ({ onBack, onSettingsChange }) => {
  // Settings state
  const [poseSettings, setPoseSettings] = useState<PoseDetectionSettings>({
    enabled: true,
    exerciseType: "pushups",
    difficultyLevel: "intermediate",
    showSkeleton: true,
    skeletonOpacity: 0.8,
    renderMode: "full",
    feedbackStyle: "all",
    confidenceThreshold: 0.6,
    formStrictness: 0.7,
    feedbackFrequency: "medium",
    autoCalibrate: true,
    persistCalibration: true,
    recalibrateOnLightingChange: true,
    targetFrameRate: 24,
    enablePerformanceMode: true,
    reducedQualityThreshold: 15,
  });

  const [accessibilitySettings, setAccessibilitySettings] =
    useState<AccessibilitySettings>({
      colorBlindFriendly: false,
      highContrast: false,
      largeText: false,
      hapticFeedback: true,
      audioFeedback: false,
      voicePrompts: false,
      reducedMotion: false,
      screenReaderSupport: false,
    });

  const [feedbackCustomization, setFeedbackCustomization] =
    useState<FeedbackCustomization>({
      visualFeedback: {
        colors: { good: "#00FF88", warning: "#FFD700", error: "#FF6B6B" },
        animations: true,
        intensity: "normal",
      },
      audioFeedback: {
        enabled: false,
        volume: 0.8,
        voiceGender: "neutral",
        language: "en-US",
      },
      hapticFeedback: {
        enabled: true,
        intensity: "medium",
        patterns: {},
      },
    });

  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (!isLoading) {
      saveSettings();
      if (onSettingsChange) {
        onSettingsChange(poseSettings);
      }
    }
  }, [poseSettings, accessibilitySettings, feedbackCustomization, isLoading]);

  // Load settings from storage
  const loadSettings = async () => {
    try {
      const [poseData, accessibilityData, feedbackData] = await Promise.all([
        AsyncStorage.getItem("pose_detection_settings"),
        AsyncStorage.getItem("accessibility_settings"),
        AsyncStorage.getItem("feedback_customization"),
      ]);

      if (poseData) {
        setPoseSettings({ ...poseSettings, ...JSON.parse(poseData) });
      }
      if (accessibilityData) {
        setAccessibilitySettings({
          ...accessibilitySettings,
          ...JSON.parse(accessibilityData),
        });
      }
      if (feedbackData) {
        setFeedbackCustomization({
          ...feedbackCustomization,
          ...JSON.parse(feedbackData),
        });
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading settings:", error);
      setIsLoading(false);
    }
  };

  // Save settings to storage
  const saveSettings = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(
          "pose_detection_settings",
          JSON.stringify(poseSettings)
        ),
        AsyncStorage.setItem(
          "accessibility_settings",
          JSON.stringify(accessibilitySettings)
        ),
        AsyncStorage.setItem(
          "feedback_customization",
          JSON.stringify(feedbackCustomization)
        ),
      ]);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to their default values?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setPoseSettings({
              enabled: true,
              exerciseType: "pushups",
              difficultyLevel: "intermediate",
              showSkeleton: true,
              skeletonOpacity: 0.8,
              renderMode: "full",
              feedbackStyle: "all",
              confidenceThreshold: 0.6,
              formStrictness: 0.7,
              feedbackFrequency: "medium",
              autoCalibrate: true,
              persistCalibration: true,
              recalibrateOnLightingChange: true,
              targetFrameRate: 24,
              enablePerformanceMode: true,
              reducedQualityThreshold: 15,
            });

            setAccessibilitySettings({
              colorBlindFriendly: false,
              highContrast: false,
              largeText: false,
              hapticFeedback: true,
              audioFeedback: false,
              voicePrompts: false,
              reducedMotion: false,
              screenReaderSupport: false,
            });

            setFeedbackCustomization({
              visualFeedback: {
                colors: {
                  good: "#00FF88",
                  warning: "#FFD700",
                  error: "#FF6B6B",
                },
                animations: true,
                intensity: "normal",
              },
              audioFeedback: {
                enabled: false,
                volume: 0.8,
                voiceGender: "neutral",
                language: "en-US",
              },
              hapticFeedback: {
                enabled: true,
                intensity: "medium",
                patterns: {},
              },
            });
          },
        },
      ]
    );
  };

  // Test feedback
  const testFeedback = async () => {
    try {
      await AccessibilityService.provideComprehensiveFeedback(
        {
          type: "success",
          message: "Great form! This is a test.",
          bodyParts: ["arms"],
          severity: "low",
          suggestions: ["Keep it up!"],
          priority: 5,
          timestamp: Date.now(),
          exerciseType: "pushups",
        },
        "pushups",
        accessibilitySettings,
        feedbackCustomization
      );
    } catch (error) {
      console.error("Error testing feedback:", error);
    }
  };

  // Render section header
  const renderSectionHeader = (title: string, subtitle?: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );

  // Render switch setting
  const renderSwitchSetting = (
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    disabled: boolean = false
  ) => (
    <View style={[styles.settingRow, disabled && styles.disabledRow]}>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text style={[styles.settingSubtitle, disabled && styles.disabledText]}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#767577", true: "#00FF88" }}
        thumbColor={value ? "#ffffff" : "#f4f3f4"}
      />
    </View>
  );

  // Render slider setting
  const renderSliderSetting = (
    title: string,
    subtitle: string,
    value: number,
    onValueChange: (value: number) => void,
    minimumValue: number = 0,
    maximumValue: number = 1,
    step: number = 0.1,
    disabled: boolean = false
  ) => (
    <View style={[styles.settingRow, disabled && styles.disabledRow]}>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text style={[styles.settingSubtitle, disabled && styles.disabledText]}>
          {subtitle} ({Math.round(value * 100)}%)
        </Text>
      </View>
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          value={value}
          onValueChange={onValueChange}
          minimumValue={minimumValue}
          maximumValue={maximumValue}
          step={step}
          disabled={disabled}
          minimumTrackTintColor="#00FF88"
          maximumTrackTintColor="rgba(255,255,255,0.3)"
          thumbStyle={{ backgroundColor: "#00FF88" }}
        />
      </View>
    </View>
  );

  // Render option setting
  const renderOptionSetting = (
    title: string,
    subtitle: string,
    options: { label: string; value: any }[],
    selectedValue: any,
    onValueChange: (value: any) => void,
    disabled: boolean = false
  ) => (
    <View style={[styles.settingColumn, disabled && styles.disabledRow]}>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text style={[styles.settingSubtitle, disabled && styles.disabledText]}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedValue === option.value && styles.selectedOption,
              disabled && styles.disabledOption,
            ]}
            onPress={() => !disabled && onValueChange(option.value)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.optionText,
                selectedValue === option.value && styles.selectedOptionText,
                disabled && styles.disabledText,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pose Detection Settings</Text>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetToDefaults}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* General Settings */}
          {renderSectionHeader("General", "Basic pose detection settings")}

          {renderSwitchSetting(
            "Enable Pose Detection",
            "Use AI to track your form and count reps",
            poseSettings.enabled,
            (value) => setPoseSettings((prev) => ({ ...prev, enabled: value }))
          )}

          {renderOptionSetting(
            "Difficulty Level",
            "Adjust form strictness based on your experience",
            [
              { label: "Beginner", value: "beginner" },
              { label: "Intermediate", value: "intermediate" },
              { label: "Advanced", value: "advanced" },
            ],
            poseSettings.difficultyLevel,
            (value) =>
              setPoseSettings((prev) => ({ ...prev, difficultyLevel: value })),
            !poseSettings.enabled
          )}

          {renderSliderSetting(
            "Form Strictness",
            "How strict should form validation be?",
            poseSettings.formStrictness,
            (value) =>
              setPoseSettings((prev) => ({ ...prev, formStrictness: value })),
            0.3,
            1.0,
            0.1,
            !poseSettings.enabled
          )}

          {/* Visual Settings */}
          {renderSectionHeader(
            "Visual Feedback",
            "Customize the visual overlay and feedback"
          )}

          {renderSwitchSetting(
            "Show Skeleton Overlay",
            "Display pose landmarks and connections",
            poseSettings.showSkeleton,
            (value) =>
              setPoseSettings((prev) => ({ ...prev, showSkeleton: value })),
            !poseSettings.enabled
          )}

          {renderSliderSetting(
            "Skeleton Opacity",
            "Adjust visibility of the pose overlay",
            poseSettings.skeletonOpacity,
            (value) =>
              setPoseSettings((prev) => ({ ...prev, skeletonOpacity: value })),
            0.2,
            1.0,
            0.1,
            !poseSettings.enabled || !poseSettings.showSkeleton
          )}

          {renderOptionSetting(
            "Render Mode",
            "Choose level of detail for pose visualization",
            [
              { label: "Full", value: "full" },
              { label: "Minimal", value: "minimal" },
              { label: "Markers Only", value: "markers-only" },
            ],
            poseSettings.renderMode,
            (value) =>
              setPoseSettings((prev) => ({ ...prev, renderMode: value })),
            !poseSettings.enabled || !poseSettings.showSkeleton
          )}

          {/* Feedback Settings */}
          {renderSectionHeader(
            "Feedback",
            "Configure how you receive form corrections"
          )}

          {renderOptionSetting(
            "Feedback Style",
            "Choose how to receive feedback",
            [
              { label: "Visual Only", value: "visual" },
              { label: "Audio Only", value: "audio" },
              { label: "Haptic Only", value: "haptic" },
              { label: "All Types", value: "all" },
            ],
            poseSettings.feedbackStyle,
            (value) =>
              setPoseSettings((prev) => ({ ...prev, feedbackStyle: value })),
            !poseSettings.enabled
          )}

          {renderOptionSetting(
            "Feedback Frequency",
            "How often should you receive feedback?",
            [
              { label: "High", value: "high" },
              { label: "Medium", value: "medium" },
              { label: "Low", value: "low" },
            ],
            poseSettings.feedbackFrequency,
            (value) =>
              setPoseSettings((prev) => ({
                ...prev,
                feedbackFrequency: value,
              })),
            !poseSettings.enabled
          )}

          {/* Performance Settings */}
          {renderSectionHeader(
            "Performance",
            "Optimize for your device capabilities"
          )}

          {renderSwitchSetting(
            "Performance Mode",
            "Automatically adjust quality for better performance",
            poseSettings.enablePerformanceMode,
            (value) =>
              setPoseSettings((prev) => ({
                ...prev,
                enablePerformanceMode: value,
              })),
            !poseSettings.enabled
          )}

          {renderSliderSetting(
            "Target Frame Rate",
            "Higher rates use more battery but are more responsive",
            poseSettings.targetFrameRate / 30,
            (value) =>
              setPoseSettings((prev) => ({
                ...prev,
                targetFrameRate: Math.round(value * 30),
              })),
            0.5,
            1.0,
            0.1,
            !poseSettings.enabled
          )}

          {renderSliderSetting(
            "Confidence Threshold",
            "Minimum confidence required for pose detection",
            poseSettings.confidenceThreshold,
            (value) =>
              setPoseSettings((prev) => ({
                ...prev,
                confidenceThreshold: value,
              })),
            0.3,
            0.9,
            0.1,
            !poseSettings.enabled
          )}

          {/* Calibration Settings */}
          {renderSectionHeader(
            "Calibration",
            "Camera and positioning settings"
          )}

          {renderSwitchSetting(
            "Auto Calibration",
            "Automatically calibrate when starting exercises",
            poseSettings.autoCalibrate,
            (value) =>
              setPoseSettings((prev) => ({ ...prev, autoCalibrate: value })),
            !poseSettings.enabled
          )}

          {renderSwitchSetting(
            "Persist Calibration",
            "Remember calibration between sessions",
            poseSettings.persistCalibration,
            (value) =>
              setPoseSettings((prev) => ({
                ...prev,
                persistCalibration: value,
              })),
            !poseSettings.enabled
          )}

          {renderSwitchSetting(
            "Recalibrate on Lighting Change",
            "Automatically recalibrate when lighting conditions change",
            poseSettings.recalibrateOnLightingChange,
            (value) =>
              setPoseSettings((prev) => ({
                ...prev,
                recalibrateOnLightingChange: value,
              })),
            !poseSettings.enabled
          )}

          {/* Accessibility Settings */}
          {renderSectionHeader(
            "Accessibility",
            "Make the app more accessible for everyone"
          )}

          {renderSwitchSetting(
            "Colorblind Friendly",
            "Use patterns and shapes instead of just colors",
            accessibilitySettings.colorBlindFriendly,
            (value) =>
              setAccessibilitySettings((prev) => ({
                ...prev,
                colorBlindFriendly: value,
              }))
          )}

          {renderSwitchSetting(
            "High Contrast",
            "Use high contrast colors for better visibility",
            accessibilitySettings.highContrast,
            (value) =>
              setAccessibilitySettings((prev) => ({
                ...prev,
                highContrast: value,
              }))
          )}

          {renderSwitchSetting(
            "Large Text",
            "Increase text size for better readability",
            accessibilitySettings.largeText,
            (value) =>
              setAccessibilitySettings((prev) => ({
                ...prev,
                largeText: value,
              }))
          )}

          {renderSwitchSetting(
            "Haptic Feedback",
            "Feel vibrations for reps and form corrections",
            accessibilitySettings.hapticFeedback,
            (value) =>
              setAccessibilitySettings((prev) => ({
                ...prev,
                hapticFeedback: value,
              }))
          )}

          {renderSwitchSetting(
            "Audio Feedback",
            "Hear sounds for reps and form corrections",
            accessibilitySettings.audioFeedback,
            (value) =>
              setAccessibilitySettings((prev) => ({
                ...prev,
                audioFeedback: value,
              }))
          )}

          {renderSwitchSetting(
            "Voice Prompts",
            "Receive spoken instructions and feedback",
            accessibilitySettings.voicePrompts,
            (value) =>
              setAccessibilitySettings((prev) => ({
                ...prev,
                voicePrompts: value,
              }))
          )}

          {renderSwitchSetting(
            "Reduced Motion",
            "Minimize animations and transitions",
            accessibilitySettings.reducedMotion,
            (value) =>
              setAccessibilitySettings((prev) => ({
                ...prev,
                reducedMotion: value,
              }))
          )}

          {/* Audio Customization */}
          {(accessibilitySettings.audioFeedback ||
            accessibilitySettings.voicePrompts) && (
            <>
              {renderSectionHeader(
                "Audio Customization",
                "Customize voice and audio feedback"
              )}

              {renderSliderSetting(
                "Audio Volume",
                "Adjust volume for audio feedback",
                feedbackCustomization.audioFeedback.volume,
                (value) =>
                  setFeedbackCustomization((prev) => ({
                    ...prev,
                    audioFeedback: { ...prev.audioFeedback, volume: value },
                  })),
                0.1,
                1.0,
                0.1
              )}

              {renderOptionSetting(
                "Voice Gender",
                "Choose voice gender for prompts",
                [
                  { label: "Neutral", value: "neutral" },
                  { label: "Male", value: "male" },
                  { label: "Female", value: "female" },
                ],
                feedbackCustomization.audioFeedback.voiceGender,
                (value) =>
                  setFeedbackCustomization((prev) => ({
                    ...prev,
                    audioFeedback: {
                      ...prev.audioFeedback,
                      voiceGender: value,
                    },
                  }))
              )}
            </>
          )}

          {/* Test Feedback */}
          {renderSectionHeader("Test", "Try out your feedback settings")}

          <TouchableOpacity style={styles.testButton} onPress={testFeedback}>
            <Text style={styles.testButtonText}>🎯 Test Feedback</Text>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
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
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  resetButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginTop: 30,
    marginBottom: 15,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "500",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingColumn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  disabledRow: {
    opacity: 0.5,
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingSubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    fontWeight: "500",
  },
  disabledText: {
    opacity: 0.5,
  },
  sliderContainer: {
    width: 120,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  selectedOption: {
    backgroundColor: "#00FF88",
    borderColor: "#00FF88",
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  selectedOptionText: {
    color: "#000000",
  },
  testButton: {
    backgroundColor: "#00FF88",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  testButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
  bottomPadding: {
    height: 40,
  },
});

export default PoseDetectionSettingsScreen;
