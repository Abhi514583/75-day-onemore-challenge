import React, { forwardRef } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = CARD_WIDTH * 1.2; // 5:6 aspect ratio for social media

interface ShareCardProps {
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
  template?: "daily" | "milestone" | "achievement" | "completion";
  userName?: string;
}

const ShareCard = forwardRef<View, ShareCardProps>(
  (
    {
      currentDay,
      totalDays,
      currentStreak,
      todaysExercises,
      achievement,
      template = "daily",
      userName = "Fitness Warrior",
    },
    ref
  ) => {
    const getGradientColors = () => {
      switch (template) {
        case "milestone":
          return ["#FFD700", "#FFA500", "#FF8C00"];
        case "achievement":
          return ["#FF6B6B", "#4ECDC4", "#45B7D1"];
        case "completion":
          return ["#667eea", "#764ba2", "#f093fb"];
        default:
          return ["#667eea", "#764ba2"];
      }
    };

    const getTitle = () => {
      switch (template) {
        case "milestone":
          if (currentDay === 7) return "🔥 Week Warrior!";
          if (currentDay === 30) return "🏆 Month Champion!";
          if (currentDay === 37) return "🚀 Halfway Hero!";
          if (currentDay === 75) return "🚀 Fitness Warrior!";
          if (currentDay === 100) return "👑 Challenge Conqueror!";
          return `💪 Day ${currentDay} Milestone!`;
        case "achievement":
          return achievement
            ? `🏆 ${achievement.title}!`
            : "🏆 Achievement Unlocked!";
        case "completion":
          return "👑 Challenge Complete!";
        default:
          return `💪 Day ${currentDay} / ${totalDays}`;
      }
    };

    const progressPercentage = (currentDay / totalDays) * 100;

    return (
      <View ref={ref} style={styles.container}>
        <LinearGradient
          colors={getGradientColors()}
          locations={template === "completion" ? [0, 0.5, 1] : [0, 1]}
          style={styles.card}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>OneMore Challenge</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={styles.title}>{getTitle()}</Text>

            {template === "daily" && (
              <>
                <View style={styles.progressContainer}>
                  <View style={styles.progressRing}>
                    <Text style={styles.progressPercentage}>
                      {Math.round(progressPercentage)}%
                    </Text>
                    <Text style={styles.progressLabel}>Complete</Text>
                  </View>
                </View>

                <View style={styles.exercisesContainer}>
                  <Text style={styles.exercisesTitle}>Today's Targets</Text>
                  <View style={styles.exercisesList}>
                    <View style={styles.exerciseRow}>
                      <View style={styles.exerciseItem}>
                        <Text style={styles.exerciseEmoji}>💪</Text>
                        <Text style={styles.exerciseText}>
                          {todaysExercises.pushups}
                        </Text>
                      </View>
                      <View style={styles.exerciseItem}>
                        <Text style={styles.exerciseEmoji}>🦵</Text>
                        <Text style={styles.exerciseText}>
                          {todaysExercises.squats}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.exerciseRow}>
                      <View style={styles.exerciseItem}>
                        <Text style={styles.exerciseEmoji}>🏋️</Text>
                        <Text style={styles.exerciseText}>
                          {todaysExercises.situps}
                        </Text>
                      </View>
                      <View style={styles.exerciseItem}>
                        <Text style={styles.exerciseEmoji}>⏱️</Text>
                        <Text style={styles.exerciseText}>
                          {todaysExercises.planks}s
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            {template === "achievement" && achievement && (
              <View style={styles.achievementContainer}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDescription}>
                  {achievement.description}
                </Text>
              </View>
            )}

            {(template === "milestone" || template === "completion") && (
              <View style={styles.milestoneContainer}>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{currentDay}</Text>
                    <Text style={styles.statLabel}>Days</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{currentStreak}</Text>
                    <Text style={styles.statLabel}>Streak</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {Math.round(progressPercentage)}%
                    </Text>
                    <Text style={styles.statLabel}>Complete</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Streak Badge */}
            {currentStreak > 1 && template !== "achievement" && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>
                  🔥 {currentStreak} Day Streak!
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.hashtag}>
              #OneMoreChallenge #FitnessJourney
            </Text>
            <Text style={styles.appPromo}>
              📱 Download OneMore Challenge App
            </Text>
          </View>

          {/* Decorative Elements */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeCircle3} />
        </LinearGradient>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    padding: 30,
    position: "relative",
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  appName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  userName: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 30,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 6,
    borderColor: "#FFD700",
    justifyContent: "center",
    alignItems: "center",
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
  },
  exercisesContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  exercisesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 15,
  },
  exercisesList: {
    gap: 10,
  },
  exerciseRow: {
    flexDirection: "row",
    gap: 40,
  },
  exerciseItem: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    minWidth: 80,
  },
  exerciseEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  exerciseText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  achievementContainer: {
    alignItems: "center",
  },
  achievementIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  achievementTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 10,
  },
  achievementDescription: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 22,
  },
  milestoneContainer: {
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 30,
  },
  statItem: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    minWidth: 70,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    marginTop: 4,
  },
  streakBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.3)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFD700",
    marginTop: 20,
  },
  streakText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  hashtag: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    marginBottom: 8,
  },
  appPromo: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "700",
  },
  // Decorative elements
  decorativeCircle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  decorativeCircle3: {
    position: "absolute",
    top: "50%",
    right: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
});

export default ShareCard;
