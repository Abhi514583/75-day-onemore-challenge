import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";
import { useAppDispatch } from "../store/hooks";
import { createDuel } from "../store/slices/duelsSlice";
import {
  Duel,
  getExerciseLabel,
  getExerciseEmoji,
  DuelSettings,
} from "../types/duels";

interface DuelResultsScreenProps {
  duel: Duel;
  onBack: () => void;
  onRematch: () => void;
  onShare: () => void;
}

const DuelResultsScreen: React.FC<DuelResultsScreenProps> = ({
  duel,
  onBack,
  onRematch,
  onShare,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const dispatch = useAppDispatch();

  const isWinner = duel.winnerId === duel.hostId; // Assuming we're always the host for now
  const myScore = duel.hostAttempt?.score || 0;
  const opponentScore = duel.guestAttempt?.score || 0;
  const myRatingChange = duel.ratingChanges?.host || 0;
  const opponentRatingChange = duel.ratingChanges?.guest || 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRematch = () => {
    Alert.alert(
      "Create Rematch",
      `Challenge ${duel.guestUsername} to another ${getExerciseLabel(
        duel.settings.exercise
      )} duel?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create Rematch",
          onPress: () => {
            // Create a new duel with same settings
            const rematchDuel: Duel = {
              id:
                "duel_" +
                Date.now() +
                "_" +
                Math.random().toString(36).substr(2, 9),
              hostId: duel.hostId,
              hostUsername: duel.hostUsername,
              guestId: duel.guestId,
              guestUsername: duel.guestUsername,
              settings: { ...duel.settings },
              status: "waiting",
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min default
            };

            dispatch(createDuel(rematchDuel));
            onRematch();
          },
        },
      ]
    );
  };

  const getResultEmoji = () => {
    if (myScore === opponentScore) return "🤝";
    return isWinner ? "🏆" : "💪";
  };

  const getResultTitle = () => {
    if (myScore === opponentScore) return "Tie Game!";
    return isWinner ? "Victory!" : "Good Fight!";
  };

  const getResultSubtitle = () => {
    if (myScore === opponentScore) return "Resolved by tie-breaker";
    return isWinner
      ? "You dominated this duel"
      : "Keep training, comeback awaits";
  };

  const getTieBreakReason = () => {
    if (myScore !== opponentScore) return null;

    // Simulate tie-break reason (in real app, this would come from the duel result)
    const reasons = [
      "Better form quality",
      "Faster completion time",
      "Coin toss advantage",
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  return (
    <LinearGradient
      colors={COLORS.BACKGROUND.PRIMARY}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Result Header */}
          <View style={styles.resultHeader}>
            <Text style={styles.resultEmoji}>{getResultEmoji()}</Text>
            <Text style={styles.resultTitle}>{getResultTitle()}</Text>
            <Text style={styles.resultSubtitle}>{getResultSubtitle()}</Text>
          </View>

          {/* Exercise Info */}
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseEmoji}>
              {getExerciseEmoji(duel.settings.exercise)}
            </Text>
            <Text style={styles.exerciseName}>
              {getExerciseLabel(duel.settings.exercise)}
            </Text>
            <Text style={styles.exerciseType}>
              {duel.settings.type === "max_reps" ? "Max Reps" : "Max Hold"}
            </Text>
          </View>

          {/* Score Comparison */}
          <View style={styles.scoreSection}>
            <View style={styles.scoreCard}>
              <View
                style={[styles.playerScore, isWinner && styles.winnerScore]}
              >
                <Text style={styles.playerName}>You</Text>
                <Text
                  style={[
                    styles.scoreValue,
                    isWinner && styles.winnerScoreValue,
                  ]}
                >
                  {myScore}
                </Text>
                <Text style={styles.scoreUnit}>
                  {duel.settings.exercise === "planks" ? "seconds" : "reps"}
                </Text>
              </View>

              <View style={styles.vsContainer}>
                <Text style={styles.vsText}>VS</Text>
              </View>

              <View
                style={[
                  styles.playerScore,
                  !isWinner && myScore !== opponentScore && styles.winnerScore,
                ]}
              >
                <Text style={styles.playerName}>{duel.guestUsername}</Text>
                <Text
                  style={[
                    styles.scoreValue,
                    !isWinner &&
                      myScore !== opponentScore &&
                      styles.winnerScoreValue,
                  ]}
                >
                  {opponentScore}
                </Text>
                <Text style={styles.scoreUnit}>
                  {duel.settings.exercise === "planks" ? "seconds" : "reps"}
                </Text>
              </View>
            </View>

            {/* Tie-breaker Info */}
            {myScore === opponentScore && (
              <View style={styles.tieBreakCard}>
                <Text style={styles.tieBreakTitle}>🎯 Tie-breaker</Text>
                <Text style={styles.tieBreakReason}>
                  Winner determined by: {getTieBreakReason()}
                </Text>
              </View>
            )}
          </View>

          {/* Rating Changes */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingSectionTitle}>OMR Rating Changes</Text>
            <View style={styles.ratingChanges}>
              <View style={styles.ratingChange}>
                <Text style={styles.ratingPlayer}>You</Text>
                <Text
                  style={[
                    styles.ratingChangeValue,
                    {
                      color:
                        myRatingChange >= 0
                          ? COLORS.STATUS.COMPLETED
                          : COLORS.ACCENT.ERROR,
                    },
                  ]}
                >
                  {myRatingChange >= 0 ? "+" : ""}
                  {myRatingChange}
                </Text>
              </View>
              <View style={styles.ratingChange}>
                <Text style={styles.ratingPlayer}>{duel.guestUsername}</Text>
                <Text
                  style={[
                    styles.ratingChangeValue,
                    {
                      color:
                        opponentRatingChange >= 0
                          ? COLORS.STATUS.COMPLETED
                          : COLORS.ACCENT.ERROR,
                    },
                  ]}
                >
                  {opponentRatingChange >= 0 ? "+" : ""}
                  {opponentRatingChange}
                </Text>
              </View>
            </View>
          </View>

          {/* Performance Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>Performance Details</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Your Time</Text>
                <Text style={styles.statValue}>
                  {Math.floor((duel.hostAttempt?.duration || 0) / 1000)}s
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Opponent Time</Text>
                <Text style={styles.statValue}>
                  {Math.floor((duel.guestAttempt?.duration || 0) / 1000)}s
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Form Quality</Text>
                <Text style={styles.statValue}>
                  {duel.hostAttempt?.quality
                    ? `${Math.round(duel.hostAttempt.quality * 100)}%`
                    : "N/A"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Verified</Text>
                <Text style={styles.statValue}>
                  {duel.hostAttempt?.verified ? "✅" : "⏳"}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.rematchButton}
              onPress={handleRematch}
            >
              <LinearGradient
                colors={[COLORS.ACCENT.PRIMARY, COLORS.ACCENT.SECONDARY]}
                style={styles.rematchButtonGradient}
              >
                <Text style={styles.rematchButtonText}>⚔️ Rematch</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} onPress={onShare}>
              <LinearGradient
                colors={[COLORS.UI.BUTTON_PRIMARY, COLORS.UI.BUTTON_SECONDARY]}
                style={styles.shareButtonGradient}
              >
                <Text style={styles.shareButtonText}>📱 Share Result</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back to Duels</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  resultHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.TEXT.PRIMARY,
    textAlign: "center",
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 16,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "center",
  },
  exerciseInfo: {
    alignItems: "center",
    marginBottom: 30,
  },
  exerciseEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  exerciseType: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
  },
  scoreSection: {
    marginBottom: 30,
  },
  scoreCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  playerScore: {
    flex: 1,
    alignItems: "center",
  },
  winnerScore: {
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
    borderRadius: 16,
    padding: 16,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: "800",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  winnerScoreValue: {
    color: COLORS.ACCENT.PRIMARY,
  },
  scoreUnit: {
    fontSize: 14,
    color: COLORS.TEXT.MUTED,
  },
  vsContainer: {
    paddingHorizontal: 20,
  },
  vsText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.TEXT.TERTIARY,
  },
  tieBreakCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.ACCENT.WARNING,
  },
  tieBreakTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  tieBreakReason: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
  },
  ratingSection: {
    marginBottom: 30,
  },
  ratingSectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 16,
    textAlign: "center",
  },
  ratingChanges: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  ratingChange: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingPlayer: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
  },
  ratingChangeValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statsSection: {
    marginBottom: 30,
  },
  statsSectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 16,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.TEXT.MUTED,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
  },
  actionSection: {
    gap: 16,
  },
  rematchButton: {
    borderRadius: 20,
    shadowColor: COLORS.UI.SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  rematchButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  rematchButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: "700",
  },
  shareButton: {
    borderRadius: 16,
  },
  shareButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  shareButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  backButtonText: {
    color: COLORS.TEXT.TERTIARY,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default DuelResultsScreen;
