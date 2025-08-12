import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppSelector } from "../store/hooks";
import ShareCard from "../components/ShareCard";
import SocialSharingService, {
  ShareCardData,
} from "../services/SocialSharingService";

interface SocialSharingScreenProps {
  onBack: () => void;
}

const SocialSharingScreen: React.FC<SocialSharingScreenProps> = ({
  onBack,
}) => {
  const { currentDay, currentStreak, baselines, totalDaysCompleted } =
    useAppSelector(
      (state) =>
        state.challenge || {
          currentDay: 1,
          currentStreak: 0,
          baselines: { pushups: 10, squats: 15, situps: 10, planks: 30 },
          totalDaysCompleted: 0,
        }
    );

  const [selectedTemplate, setSelectedTemplate] = useState<
    "daily" | "milestone" | "achievement" | "completion"
  >("daily");
  const [isSharing, setIsSharing] = useState(false);

  const shareCardRef = useRef<View>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Calculate today's exercises
  const todaysExercises = {
    pushups: baselines.pushups + (currentDay - 1),
    squats: baselines.squats + (currentDay - 1),
    situps: baselines.situps + (currentDay - 1),
    planks: baselines.planks + (currentDay - 1) * 5,
  };

  // Sample achievement for demo
  const sampleAchievement = {
    title: "Week Warrior",
    icon: "🔥",
    description: "Completed 7 consecutive days!",
  };

  const shareCardData: ShareCardData = {
    currentDay,
    totalDays: 100,
    currentStreak,
    todaysExercises,
    achievement:
      selectedTemplate === "achievement" ? sampleAchievement : undefined,
  };

  const templates = [
    {
      key: "daily" as const,
      name: "Daily Progress",
      icon: "📊",
      description: "Share your daily progress",
      color: "#667eea",
    },
    {
      key: "milestone" as const,
      name: "Milestone",
      icon: "🏆",
      description: "Celebrate achievements",
      color: "#FFD700",
    },
    {
      key: "achievement" as const,
      name: "Achievement",
      icon: "🎖️",
      description: "Show off badges",
      color: "#FF6B6B",
    },
    {
      key: "completion" as const,
      name: "Completion",
      icon: "👑",
      description: "Challenge complete!",
      color: "#4CAF50",
    },
  ];

  const handleShare = async (
    platform?: "instagram" | "twitter" | "facebook"
  ) => {
    if (!shareCardRef.current) return;

    setIsSharing(true);

    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const success = await SocialSharingService.captureAndShare(
        shareCardRef.current,
        shareCardData,
        {
          saveToGallery: true,
          shareToSocial: true,
          platform,
        }
      );

      if (success) {
        Alert.alert(
          "🎉 Shared Successfully!",
          "Your progress card has been saved to your gallery and is ready to share!",
          [{ text: "Awesome!", style: "default" }]
        );
      }
    } catch (error) {
      console.error("Share failed:", error);
      Alert.alert(
        "Share Failed",
        "Unable to share your progress. Please try again."
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleQuickShare = async () => {
    try {
      await SocialSharingService.shareQuickProgress(shareCardData);
    } catch (error) {
      console.error("Quick share failed:", error);
    }
  };

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#f093fb"]}
      locations={[0, 0.6, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Progress</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Template Selection */}
          <View style={styles.templatesContainer}>
            <Text style={styles.sectionTitle}>Choose Template</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.templatesScroll}
            >
              {templates.map((template) => (
                <TouchableOpacity
                  key={template.key}
                  style={[
                    styles.templateCard,
                    selectedTemplate === template.key &&
                      styles.templateCardActive,
                    { borderColor: template.color },
                  ]}
                  onPress={() => setSelectedTemplate(template.key)}
                >
                  <Text style={styles.templateIcon}>{template.icon}</Text>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateDescription}>
                    {template.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Share Card Preview */}
          <View style={styles.previewContainer}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.cardContainer}>
              <ShareCard
                ref={shareCardRef}
                currentDay={currentDay}
                totalDays={100}
                currentStreak={currentStreak}
                todaysExercises={todaysExercises}
                achievement={
                  selectedTemplate === "achievement"
                    ? sampleAchievement
                    : undefined
                }
                template={selectedTemplate}
                userName="Fitness Warrior"
              />
            </View>
          </View>

          {/* Share Options */}
          <View style={styles.shareOptionsContainer}>
            <Text style={styles.sectionTitle}>Share Options</Text>

            {/* Platform-specific sharing */}
            <View style={styles.platformButtons}>
              <TouchableOpacity
                style={[
                  styles.platformButton,
                  { backgroundColor: "rgba(225, 48, 108, 0.2)" },
                ]}
                onPress={() => handleShare("instagram")}
                disabled={isSharing}
              >
                <Text style={styles.platformEmoji}>📷</Text>
                <Text style={styles.platformText}>Instagram</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.platformButton,
                  { backgroundColor: "rgba(29, 161, 242, 0.2)" },
                ]}
                onPress={() => handleShare("twitter")}
                disabled={isSharing}
              >
                <Text style={styles.platformEmoji}>🐦</Text>
                <Text style={styles.platformText}>Twitter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.platformButton,
                  { backgroundColor: "rgba(24, 119, 242, 0.2)" },
                ]}
                onPress={() => handleShare("facebook")}
                disabled={isSharing}
              >
                <Text style={styles.platformEmoji}>📘</Text>
                <Text style={styles.platformText}>Facebook</Text>
              </TouchableOpacity>
            </View>

            {/* General sharing */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => handleShare()}
                disabled={isSharing}
              >
                <LinearGradient
                  colors={[
                    "rgba(255, 255, 255, 0.3)",
                    "rgba(255, 255, 255, 0.1)",
                  ]}
                  style={styles.shareButtonGradient}
                >
                  <Text style={styles.shareButtonText}>
                    {isSharing ? "📸 Creating Card..." : "🚀 Share Everywhere"}
                  </Text>
                  <Text style={styles.shareButtonSubtext}>
                    Save to gallery & share
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Quick text share */}
            <TouchableOpacity
              style={styles.quickShareButton}
              onPress={handleQuickShare}
            >
              <Text style={styles.quickShareText}>📝 Share Text Only</Text>
            </TouchableOpacity>
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Sharing Tips</Text>
            <Text style={styles.tipsText}>
              • Use daily cards to show consistent progress{"\n"}• Share
              milestones to celebrate achievements{"\n"}• Tag friends to
              motivate them to join{"\n"}• Use #OneMoreChallenge to connect with
              others
            </Text>
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  templatesContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 15,
    textAlign: "center",
  },
  templatesScroll: {
    paddingVertical: 10,
  },
  templateCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 16,
    marginRight: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    width: 120,
  },
  templateCardActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 3,
  },
  templateIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  templateName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 14,
  },
  previewContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  cardContainer: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  shareOptionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  platformButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  platformButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  platformEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  platformText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  shareButton: {
    borderRadius: 25,
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    marginBottom: 15,
  },
  shareButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  shareButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  shareButtonSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  quickShareButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  quickShareText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  tipsContainer: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFD700",
    marginBottom: 10,
  },
  tipsText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
});

export default SocialSharingScreen;
