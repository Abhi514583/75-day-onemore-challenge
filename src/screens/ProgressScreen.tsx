import React, { useState, useRef, useEffect } from "react";
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
import { LineChart, BarChart, ProgressChart } from "react-native-chart-kit";
import { useAppSelector } from "../store/hooks";

const { width, height } = Dimensions.get("window");

interface ProgressScreenProps {
  onBack: () => void;
}

const ProgressScreen: React.FC<ProgressScreenProps> = ({ onBack }) => {
  const {
    currentDay,
    currentStreak,
    bestStreak,
    totalDaysCompleted,
    dailyProgress,
    baselines,
  } = useAppSelector(
    (state) =>
      state.challenge || {
        currentDay: 1,
        currentStreak: 0,
        bestStreak: 0,
        totalDaysCompleted: 0,
        dailyProgress: {},
        baselines: { pushups: 10, squats: 15, situps: 10, planks: 30 },
      }
  );

  const [selectedTab, setSelectedTab] = useState<
    "overview" | "charts" | "achievements"
  >("overview");

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Calculate progress data
  const progressPercentage = (currentDay / 75) * 100;
  const completionRate =
    totalDaysCompleted > 0 ? (totalDaysCompleted / currentDay) * 100 : 0;

  // Generate chart data
  const generateProgressData = () => {
    const days = Array.from(
      { length: Math.min(currentDay, 30) },
      (_, i) => i + 1
    );
    const pushupData = days.map((day) => baselines.pushups + (day - 1));
    const squatData = days.map((day) => baselines.squats + (day - 1));
    const situpData = days.map((day) => baselines.situps + (day - 1));
    const plankData = days.map((day) => baselines.planks + (day - 1) * 5);

    return {
      labels: days.map((d) => d.toString()),
      datasets: [
        {
          data: pushupData,
          color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`, // Push-ups
          strokeWidth: 3,
        },
        {
          data: squatData,
          color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`, // Squats
          strokeWidth: 3,
        },
        {
          data: situpData,
          color: (opacity = 1) => `rgba(69, 183, 209, ${opacity})`, // Sit-ups
          strokeWidth: 3,
        },
      ],
    };
  };

  const generateWeeklyData = () => {
    const weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10"];
    const completedDays = weeks.map((_, i) => {
      const weekStart = i * 7 + 1;
      const weekEnd = Math.min(weekStart + 6, currentDay);
      return Math.min(7, Math.max(0, weekEnd - weekStart + 1));
    });

    return {
      labels: weeks.slice(0, Math.ceil(currentDay / 7)),
      datasets: [
        {
          data: completedDays.slice(0, Math.ceil(currentDay / 7)),
        },
      ],
    };
  };

  const achievements = [
    {
      id: "first_day",
      title: "First Step",
      description: "Completed your first day!",
      icon: "🎯",
      unlocked: currentDay >= 1,
      color: "#4CAF50",
    },
    {
      id: "week_one",
      title: "Week Warrior",
      description: "Completed 7 days!",
      icon: "🔥",
      unlocked: currentDay >= 7,
      color: "#FF9800",
    },
    {
      id: "streak_master",
      title: "Streak Master",
      description: "10 day streak!",
      icon: "⚡",
      unlocked: bestStreak >= 10,
      color: "#9C27B0",
    },
    {
      id: "month_champion",
      title: "Month Champion",
      description: "Completed 30 days!",
      icon: "🏆",
      unlocked: currentDay >= 30,
      color: "#FFD700",
    },
    {
      id: "halfway_hero",
      title: "Halfway Hero",
      description: "Reached day 37!",
      icon: "🚀",
      unlocked: currentDay >= 37,
      color: "#2196F3",
    },
    {
      id: "final_boss",
      title: "Challenge Conqueror",
      description: "Completed all 75 days!",
      icon: "👑",
      unlocked: currentDay >= 75,
      color: "#E91E63",
    },
  ];

  const chartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFrom: "rgba(255, 255, 255, 0.1)",
    backgroundGradientTo: "rgba(255, 255, 255, 0.1)",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#ffffff",
    },
  };

  const renderOverview = () => (
    <Animated.View
      style={[
        styles.tabContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      {/* Progress Ring */}
      <View style={styles.progressRingContainer}>
        <View style={styles.progressRing}>
          <Text style={styles.progressPercentage}>
            {Math.round(progressPercentage)}%
          </Text>
          <Text style={styles.progressLabel}>Complete</Text>
        </View>
        <Text style={styles.dayCounter}>Day {currentDay} of 75</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: "rgba(255, 107, 107, 0.2)" },
          ]}
        >
          <Text style={styles.statNumber}>{currentStreak}</Text>
          <Text style={styles.statLabel}>🔥 Current Streak</Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: "rgba(78, 205, 196, 0.2)" },
          ]}
        >
          <Text style={styles.statNumber}>{bestStreak}</Text>
          <Text style={styles.statLabel}>⚡ Best Streak</Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: "rgba(69, 183, 209, 0.2)" },
          ]}
        >
          <Text style={styles.statNumber}>{totalDaysCompleted}</Text>
          <Text style={styles.statLabel}>✅ Days Done</Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: "rgba(255, 215, 0, 0.2)" },
          ]}
        >
          <Text style={styles.statNumber}>{Math.round(completionRate)}%</Text>
          <Text style={styles.statLabel}>📊 Success Rate</Text>
        </View>
      </View>

      {/* Current Targets */}
      <View style={styles.targetsContainer}>
        <Text style={styles.sectionTitle}>Today's Targets</Text>
        <View style={styles.targetsList}>
          <View style={styles.targetItem}>
            <Text style={styles.targetEmoji}>💪</Text>
            <Text style={styles.targetText}>
              {baselines.pushups + (currentDay - 1)} push-ups
            </Text>
          </View>
          <View style={styles.targetItem}>
            <Text style={styles.targetEmoji}>🦵</Text>
            <Text style={styles.targetText}>
              {baselines.squats + (currentDay - 1)} squats
            </Text>
          </View>
          <View style={styles.targetItem}>
            <Text style={styles.targetEmoji}>🏋️</Text>
            <Text style={styles.targetText}>
              {baselines.situps + (currentDay - 1)} sit-ups
            </Text>
          </View>
          <View style={styles.targetItem}>
            <Text style={styles.targetEmoji}>⏱️</Text>
            <Text style={styles.targetText}>
              {baselines.planks + (currentDay - 1) * 5} sec plank
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderCharts = () => (
    <Animated.View
      style={[
        styles.tabContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Progress Line Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>📈 Exercise Progression</Text>
        <LineChart
          data={generateProgressData()}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FF6B6B" }]} />
            <Text style={styles.legendText}>Push-ups</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#4ECDC4" }]} />
            <Text style={styles.legendText}>Squats</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#45B7D1" }]} />
            <Text style={styles.legendText}>Sit-ups</Text>
          </View>
        </View>
      </View>

      {/* Weekly Progress Bar Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>📅 Weekly Completion</Text>
        <BarChart
          data={generateWeeklyData()}
          width={width - 40}
          height={200}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      </View>
    </Animated.View>
  );

  const renderAchievements = () => (
    <Animated.View
      style={[
        styles.tabContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>🏆 Achievements</Text>
      <View style={styles.achievementsGrid}>
        {achievements.map((achievement) => (
          <Animated.View
            key={achievement.id}
            style={[
              styles.achievementCard,
              {
                backgroundColor: achievement.unlocked
                  ? `${achievement.color}20`
                  : "rgba(255, 255, 255, 0.1)",
                borderColor: achievement.unlocked
                  ? achievement.color
                  : "rgba(255, 255, 255, 0.2)",
                opacity: achievement.unlocked ? 1 : 0.6,
              },
            ]}
          >
            <Text
              style={[
                styles.achievementIcon,
                { opacity: achievement.unlocked ? 1 : 0.5 },
              ]}
            >
              {achievement.icon}
            </Text>
            <Text
              style={[
                styles.achievementTitle,
                {
                  color: achievement.unlocked
                    ? "#ffffff"
                    : "rgba(255, 255, 255, 0.6)",
                },
              ]}
            >
              {achievement.title}
            </Text>
            <Text
              style={[
                styles.achievementDescription,
                {
                  color: achievement.unlocked
                    ? "rgba(255, 255, 255, 0.9)"
                    : "rgba(255, 255, 255, 0.4)",
                },
              ]}
            >
              {achievement.description}
            </Text>
            {achievement.unlocked && (
              <View style={styles.unlockedBadge}>
                <Text style={styles.unlockedText}>✓ UNLOCKED</Text>
              </View>
            )}
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );

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
          <Text style={styles.headerTitle}>Progress</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          {[
            { key: "overview", label: "Overview", icon: "📊" },
            { key: "charts", label: "Charts", icon: "📈" },
            { key: "achievements", label: "Awards", icon: "🏆" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                selectedTab === tab.key && styles.tabButtonActive,
              ]}
              onPress={() => setSelectedTab(tab.key as any)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  selectedTab === tab.key && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {selectedTab === "overview" && renderOverview()}
          {selectedTab === "charts" && renderCharts()}
          {selectedTab === "achievements" && renderAchievements()}
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
  tabNavigation: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  tabButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  tabLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  progressRingContainer: {
    alignItems: "center",
    marginVertical: 30,
  },
  progressRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 8,
    borderColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  progressPercentage: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  progressLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
  },
  dayCounter: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    marginBottom: 30,
  },
  statCard: {
    width: (width - 55) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    textAlign: "center",
  },
  targetsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 15,
    textAlign: "center",
  },
  targetsList: {
    gap: 12,
  },
  targetItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    borderRadius: 12,
  },
  targetEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  targetText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600",
  },
  chartContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 15,
    textAlign: "center",
  },
  chart: {
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
  },
  achievementsGrid: {
    gap: 15,
  },
  achievementCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    position: "relative",
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 5,
    textAlign: "center",
  },
  achievementDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 18,
  },
  unlockedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unlockedText: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: "700",
  },
});

export default ProgressScreen;
