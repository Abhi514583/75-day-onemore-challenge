import React, { forwardRef } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";
import { Duel, getExerciseLabel, getExerciseEmoji } from "../types/duels";

interface DuelShareCardProps {
  duel: Duel;
  isWinner: boolean;
  myScore: number;
  opponentScore: number;
  ratingChange: number;
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

const DuelShareCard = forwardRef<View, DuelShareCardProps>(
  ({ duel, isWinner, myScore, opponentScore, ratingChange }, ref) => {
    const getResultText = () => {
      if (myScore === opponentScore) return "TIE";
      return isWinner ? "VICTORY" : "DEFEAT";
    };

    const getResultEmoji = () => {
      if (myScore === opponentScore) return "🤝";
      return isWinner ? "🏆" : "💪";
    };

    const getResultColor = () => {
      if (myScore === opponentScore) return COLORS.TEXT.SECONDARY;
      return isWinner ? COLORS.ACCENT.PRIMARY : COLORS.ACCENT.ERROR;
    };

    return (
      <View ref={ref} style={styles.container}>
        <LinearGradient
          colors={COLORS.BACKGROUND.PRIMARY}
          locations={[0, 0.5, 1]}
          style={styles.card}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>OneMore</Text>
            <Text style={styles.duelLabel}>DUEL RESULT</Text>
          </View>

          {/* Result */}
          <View style={styles.resultSection}>
            <Text style={styles.resultEmoji}>{getResultEmoji()}</Text>
            <Text style={[styles.resultText, { color: getResultColor() }]}>
              {getResultText()}
            </Text>
          </View>

          {/* Exercise Info */}
          <View style={styles.exerciseSection}>
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

          {/* Score */}
          <View style={styles.scoreSection}>
            <View style={styles.scoreRow}>
              <View style={styles.playerScore}>
                <Text style={styles.playerName}>You</Text>
                <Text
                  style={[styles.scoreValue, isWinner && styles.winnerScore]}
                >
                  {myScore}
                </Text>
              </View>

              <Text style={styles.vsText}>VS</Text>

              <View style={styles.playerScore}>
                <Text style={styles.playerName}>{duel.guestUsername}</Text>
                <Text
                  style={[
                    styles.scoreValue,
                    !isWinner &&
                      myScore !== opponentScore &&
                      styles.winnerScore,
                  ]}
                >
                  {opponentScore}
                </Text>
              </View>
            </View>

            <Text style={styles.scoreUnit}>
              {duel.settings.exercise === "planks" ? "seconds" : "reps"}
            </Text>
          </View>

          {/* Rating Change */}
          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>OMR Rating Change</Text>
            <Text
              style={[
                styles.ratingChange,
                {
                  color:
                    ratingChange >= 0
                      ? COLORS.STATUS.COMPLETED
                      : COLORS.ACCENT.ERROR,
                },
              ]}
            >
              {ratingChange >= 0 ? "+" : ""}
              {ratingChange}
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.hashtag}>#OneMoreChallenge #DuelComplete</Text>
            <Text style={styles.appPromo}>Download OneMore Challenge</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    padding: 24,
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  header: {
    alignItems: "center",
  },
  appName: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.ACCENT.PRIMARY,
    letterSpacing: 1,
    marginBottom: 4,
  },
  duelLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.TEXT.TERTIARY,
    letterSpacing: 2,
  },
  resultSection: {
    alignItems: "center",
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
  },
  exerciseSection: {
    alignItems: "center",
  },
  exerciseEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  exerciseType: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
  },
  scoreSection: {
    alignItems: "center",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  playerScore: {
    alignItems: "center",
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.TEXT.PRIMARY,
  },
  winnerScore: {
    color: COLORS.ACCENT.PRIMARY,
  },
  vsText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.TEXT.TERTIARY,
    paddingHorizontal: 16,
  },
  scoreUnit: {
    fontSize: 14,
    color: COLORS.TEXT.MUTED,
  },
  ratingSection: {
    alignItems: "center",
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  ratingLabel: {
    fontSize: 12,
    color: COLORS.TEXT.MUTED,
    marginBottom: 4,
  },
  ratingChange: {
    fontSize: 24,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
  },
  hashtag: {
    fontSize: 12,
    color: COLORS.TEXT.TERTIARY,
    marginBottom: 4,
  },
  appPromo: {
    fontSize: 10,
    color: COLORS.TEXT.MUTED,
  },
});

export default DuelShareCard;
