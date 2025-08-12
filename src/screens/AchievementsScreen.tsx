import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppSelector } from "../store/hooks";
import AchievementService from "../services/AchievementService";
import {
  Achievement,
  Badge,
  ACHIEVEMENTS,
  BADGES,
} from "../types/achievements";

interface AchievementsScreenProps {
  onBack: () => void;
}

const { width } = Dimensions.get("window");

const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ onBack }) => {
  const { currentDay, currentStreak, totalDaysCompleted } = useAppSelector(
    (state) => state.challenge
  );

  const [selectedTab, setSelectedTab] = useState<"achievements" | "badges">(
    "achievements"
  );
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "milestone" | "streak" | "consistency" | "special"
  >("all");
  const [pulseAnim] = useState(new Animated.Value(1));
  const [glowAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Initialize achievement service
    AchievementService.initialize();

    // Start pulse animation for unlocked items
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Start glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const unlockedAchievements = AchievementService.getUnlockedAchievements();
  const unlockedBadges = AchievementService.getUnlockedBadges();
  const totalPoints = AchievementService.getTotalPoints();
  const completionPercentage = AchievementService.getCompletionPercentage();
  const rarityStats = AchievementService.getRarityStats();

  const filteredAchievements =
    selectedCategory === "all"
      ? ACHIEVEMENTS
      : ACHIEVEMENTS.filter(
          (achievement) => achievement.category === selectedCategory
        );

  const getRarityColor = (rarity: Achievement["rarity"]) => {
    switch (rarity) {
      case "common":
        return "#95A5A6";
      case "rare":
        return "#3498DB";
      case "epic":
        return "#9B59B6";
      case "legendary":
        return "#F39C12";
      default:
        return "#95A5A6";
    }
  };

  const getRarityGradient = (rarity: Achievement["rarity"]) => {
    switch (rarity) {
      case "common":
        return ["#BDC3C7", "#95A5A6"];
      case "rare":
        return ["#5DADE2", "#3498DB"];
      case "epic":
        return ["#BB8FCE", "#9B59B6"];
      case "legendary":
        return ["#F7DC6F", "#F39C12"];
      default:
        return ["#BDC3C7", "#95A5A6"];
    }
  };

  const renderAchievementCard = (achievement: Achievement) => {
    const isUnlocked = unlockedAchievements.some(
      (a) => a.id === achievement.id
    );
    const rarityColors = getRarityGradient(achievement.rarity);

    return (
      <Animated.View
        key={achievement.id}
        style={[
          styles.achievementCard,
          isUnlocked && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <LinearGradient
          colors={
            isUnlocked
              ? rarityColors
              : ["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]
          }
          style={styles.achievementCardGradient}
        >
          <View style={styles.achievementHeader}>
            <Text
              style={[styles.achievementIcon, !isUnlocked && styles.lockedIcon]}
            >
              {isUnlocked ? achievement.icon : "🔒"}
            </Text>
            <View style={styles.achievementInfo}>
              <Text
                style={[
                  styles.achievementTitle,
                  !isUnlocked && styles.lockedText,
                ]}
              >
                {isUnlocked ? achievement.title : "???"}
              </Text>
              <Text
                style={[
                  styles.achievementDescription,
                  !isUnlocked && styles.lockedText,
                ]}
              >
                {isUnlocked
                  ? achievement.description
                  : "Complete the requirement to unlock"}
              </Text>
            </View>
            <View style={styles.achievementMeta}>
              <Text
                style={[
                  styles.achievementPoints,
                  { color: getRarityColor(achievement.rarity) },
                ]}
              >
                {achievement.points}pts
              </Text>
              <Text
                style={[
                  styles.achievementRarity,
                  { color: getRarityColor(achievement.rarity) },
                ]}
              >
                {achievement.rarity.toUpperCase()}
              </Text>
            </View>
          </View>

          {isUnlocked && achievement.unlockedAt && (
            <Text style={styles.unlockedDate}>
              Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
            </Text>
          )}

          {!isUnlocked && (
            <View style={styles.requirementContainer}>
              <Text style={styles.requirementText}>
                Requirement: {getRequirementText(achievement)}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${getProgressPercentage(achievement)}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderBadgeCard = (badge: Badge) => {
    const isUnlocked = unlockedBadges.some((b) => b.id === badge.id);

    return (
      <Animated.View
        key={badge.id}
        style={[
          styles.badgeCard,
          isUnlocked && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <LinearGradient
          colors={
            isUnlocked
              ? [badge.color, badge.glowColor]
              : ["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]
          }
          style={styles.badgeCardGradient}
        >
          <Text style={[styles.badgeIcon, !isUnlocked && styles.lockedIcon]}>
            {isUnlocked ? badge.icon : "🔒"}
          </Text>
          <Text style={[styles.badgeName, !isUnlocked && styles.lockedText]}>
            {isUnlocked ? badge.name : "???"}
          </Text>
          <Text
            style={[styles.badgeDescription, !isUnlocked && styles.lockedText]}
          >
            {isUnlocked ? badge.description : "Locked"}
          </Text>

          {isUnlocked && badge.unlockedAt && (
            <Text style={styles.badgeUnlockedDate}>
              {new Date(badge.unlockedAt).toLocaleDateString()}
            </Text>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

  const getRequirementText = (achievement: Achievement): string => {
    switch (achievement.requirement.type) {
      case "days_completed":
        return `Complete ${achievement.requirement.value} days`;
      case "streak_length":
        return `Achieve ${achievement.requirement.value}-day streak`;
      case "special_condition":
        return `Special requirement: ${achievement.requirement.condition}`;
      default:
        return "Unknown requirement";
    }
  };

  const getProgressPercentage = (achievement: Achievement): number => {
    switch (achievement.requirement.type) {
      case "days_completed":
        return Math.min(
          (totalDaysCompleted / achievement.requirement.value) * 100,
          100
        );
      case "streak_length":
        return Math.min(
          (currentStreak / achievement.requirement.value) * 100,
          100
        );
      default:
        return 0;
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
          <Text style={styles.headerTitle}>Achievements</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalPoints}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completionPercentage}%</Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{unlockedAchievements.length}</Text>
            <Text style={styles.statLabel}>Unlocked</Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === "achievements" && styles.activeTab,
            ]}
            onPress={() => setSelectedTab("achievements")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "achievements" && styles.activeTabText,
              ]}
            >
              🏆 Achievements
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === "badges" && styles.activeTab]}
            onPress={() => setSelectedTab("badges")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "badges" && styles.activeTabText,
              ]}
            >
              🏅 Badges
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter (for achievements) */}
        {selectedTab === "achievements" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryContainer}
          >
            {["all", "milestone", "streak", "consistency", "special"].map(
              (category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category &&
                      styles.activeCategoryButton,
                  ]}
                  onPress={() => setSelectedCategory(category as any)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      selectedCategory === category &&
                        styles.activeCategoryButtonText,
                    ]}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>
        )}

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {selectedTab === "achievements" ? (
            <View style={styles.achievementsGrid}>
              {filteredAchievements.map(renderAchievementCard)}
            </View>
          ) : (
            <View style={styles.badgesGrid}>{BADGES.map(renderBadgeCard)}</View>
          )}

          {/* Rarity Stats */}
          {selectedTab === "achievements" && (
            <View style={styles.rarityStatsContainer}>
              <Text style={styles.rarityStatsTitle}>🌟 Rarity Collection</Text>
              {Object.entries(rarityStats).map(([rarity, stats]) => (
                <View key={rarity} style={styles.rarityStatRow}>
                  <Text
                    style={[
                      styles.rarityStatLabel,
                      { color: getRarityColor(rarity as any) },
                    ]}
                  >
                    {rarity.toUpperCase()}
                  </Text>
                  <Text style={styles.rarityStatValue}>
                    {stats.unlocked} / {stats.total}
                  </Text>
                  <View style={styles.rarityProgressBar}>
                    <View
                      style={[
                        styles.rarityProgressFill,
                        {
                          width: `${(stats.unlocked / stats.total) * 100}%`,
                          backgroundColor: getRarityColor(rarity as any),
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Achievement Suggestions */}
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>💡 Next Goals</Text>
            {AchievementService.getAchievementSuggestions({
              currentDay,
              currentStreak,
              totalDaysCompleted,
            }).map((suggestion, index) => (
              <Text key={index} style={styles.suggestionText}>
                {suggestion}
              </Text>
            ))}
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
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  tabText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  categoryContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    marginRight: 10,
  },
  activeCategoryButton: {
    backgroundColor: "rgba(255, 215, 0, 0.3)",
  },
  categoryButtonText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  activeCategoryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  achievementsGrid: {
    paddingHorizontal: 20,
  },
  badgesGrid: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  achievementCard: {
    marginBottom: 15,
    borderRadius: 16,
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  achievementCardGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  achievementHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  lockedIcon: {
    opacity: 0.5,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },
  lockedText: {
    opacity: 0.6,
  },
  achievementMeta: {
    alignItems: "flex-end",
  },
  achievementPoints: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  achievementRarity: {
    fontSize: 10,
    fontWeight: "600",
  },
  unlockedDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontStyle: "italic",
  },
  requirementContainer: {
    marginTop: 10,
  },
  requirementText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 2,
  },
  badgeCard: {
    width: (width - 60) / 2,
    marginBottom: 15,
    borderRadius: 16,
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  badgeCardGradient: {
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  badgeIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 8,
  },
  badgeUnlockedDate: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.6)",
    fontStyle: "italic",
  },
  rarityStatsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  rarityStatsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 15,
  },
  rarityStatRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rarityStatLabel: {
    fontSize: 14,
    fontWeight: "600",
    width: 80,
  },
  rarityStatValue: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
    width: 50,
  },
  rarityProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 3,
    marginLeft: 10,
    overflow: "hidden",
  },
  rarityProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  suggestionsContainer: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFD700",
    marginBottom: 10,
  },
  suggestionText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
    marginBottom: 8,
  },
});
export default AchievementsScreen;
