import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";
import { UnifiedDuel } from "../types/unified";
import {
  getExerciseDisplayName,
  getExerciseUnit,
  formatTimeWindow,
} from "../utils/firebase";
import { SafeAreaWrapper } from "../components/SafeAreaWrapper";
import { DuelDataAdapterFactory } from "../services/DuelDataAdapter";
import useAuth from "../hooks/useAuth";

interface DuelReadyScreenProps {
  duelId: string;
  onStartAttempt: (duel: UnifiedDuel) => void;
  onBack: () => void;
}

const DuelReadyScreen: React.FC<DuelReadyScreenProps> = ({
  duelId,
  onStartAttempt,
  onBack,
}) => {
  const [duel, setDuel] = useState<UnifiedDuel | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const duelAdapter = DuelDataAdapterFactory.getAdapter();

  // Subscribe to real-time duel updates
  useEffect(() => {
    if (!duelId || typeof duelId !== "string") {
      console.warn("DuelReadyScreen: Invalid duelId:", duelId);
      setError("Invalid duel ID provided");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = duelAdapter.subscribeToDuel(duelId, (updatedDuel) => {
      if (updatedDuel) {
        setDuel(updatedDuel);
        setError(null);
      } else {
        setError("Duel not found or has been removed");
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, [duelId, duelAdapter]);

  // Update time remaining every second
  useEffect(() => {
    if (!duel) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((duel.expiresAt - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [duel]);

  if (!duelId || typeof duelId !== "string") {
    return (
      <LinearGradient
        colors={COLORS.BACKGROUND.PRIMARY}
        locations={[0, 0.5, 1]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No duel selected</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (isLoading) {
    return (
      <LinearGradient
        colors={COLORS.BACKGROUND.PRIMARY}
        locations={[0, 0.5, 1]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading duel...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error || !duel) {
    return (
      <LinearGradient
        colors={COLORS.BACKGROUND.PRIMARY}
        locations={[0, 0.5, 1]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error || "Duel not found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setIsLoading(true);
              // Trigger re-subscription by updating a dependency
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const exercise = duel.exercise;
  const isPlank = exercise === "planks";
  const isHost = duel.host.uid === user?.uid;
  const opponent = isHost ? duel.guest : duel.host;
  const userScore = isHost ? duel.hostScore : duel.guestScore;
  const opponentScore = isHost ? duel.guestScore : duel.hostScore;

  const formTips = {
    pushups: [
      "Keep your body in a straight line",
      "Lower chest to floor, push back up",
      "Full range of motion counts",
      "No knee push-ups in duels",
    ],
    squats: [
      "Feet shoulder-width apart",
      "Lower until thighs parallel to floor",
      "Keep chest up, knees behind toes",
      "Full depth required",
    ],
    situps: [
      "Lie flat, knees bent, feet on floor",
      "Touch elbows to knees",
      "Lower shoulder blades to floor",
      "No assistance allowed",
    ],
    planks: [
      "Forearms and toes only",
      "Body in straight line",
      "No sagging or piking",
      "Hold as long as possible",
    ],
  };

  const hoursRemaining = Math.floor(timeRemaining / 3600);
  const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
  const secondsRemaining = timeRemaining % 60;

  const handleStartAttempt = () => {
    if (timeRemaining <= 0) {
      Alert.alert(
        "Duel Expired",
        "This duel has expired and can no longer be completed."
      );
      return;
    }

    if (userScore !== null) {
      Alert.alert(
        "Already Completed",
        "You have already submitted your score for this duel."
      );
      return;
    }

    onStartAttempt(duel);
  };

  const handleForfeit = () => {
    Alert.alert(
      "Forfeit Duel",
      "Are you sure you want to forfeit this duel? This will count as a loss.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Forfeit",
          style: "destructive",
          onPress: async () => {
            const result = await duelAdapter.forfeitDuel(duelId);
            if (result.success) {
              Alert.alert("Duel Forfeited", "You have forfeited this duel.");
              onBack();
            } else {
              Alert.alert("Error", result.error || "Failed to forfeit duel");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaWrapper>
      <LinearGradient
        colors={COLORS.BACKGROUND.PRIMARY}
        locations={[0, 0.5, 1]}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>
                {duel.status === "pending"
                  ? "Waiting for Opponent"
                  : "Ready for Duel?"}
              </Text>
              <Text style={styles.subtitle}>
                {getExerciseDisplayName(exercise)} •{" "}
                {duel.matchType === "friend" ? "Friend Duel" : "Public Duel"}
              </Text>

              {/* Status Indicator */}
              <View
                style={[
                  styles.statusIndicator,
                  duel.status === "active"
                    ? styles.statusActive
                    : duel.status === "pending"
                    ? styles.statusPending
                    : styles.statusCompleted,
                ]}
              >
                <Text style={styles.statusText}>
                  {duel.status === "pending" && "⏳ Waiting"}
                  {duel.status === "active" && "⚔️ Active"}
                  {duel.status === "completed" && "✅ Completed"}
                  {duel.status === "forfeit" && "❌ Forfeited"}
                </Text>
              </View>
            </View>

            {/* Duel Info */}
            <View style={styles.section}>
              <View style={styles.duelInfoCard}>
                <View style={styles.duelInfoRow}>
                  <Text style={styles.duelInfoLabel}>Opponent:</Text>
                  <Text style={styles.duelInfoValue}>
                    {opponent ? opponent.username : "Waiting for opponent..."}
                  </Text>
                </View>
                <View style={styles.duelInfoRow}>
                  <Text style={styles.duelInfoLabel}>Time Window:</Text>
                  <Text style={styles.duelInfoValue}>
                    {formatTimeWindow(duel.windowSec)}
                  </Text>
                </View>
                <View style={styles.duelInfoRow}>
                  <Text style={styles.duelInfoLabel}>Time Remaining:</Text>
                  <Text
                    style={[
                      styles.duelInfoValue,
                      timeRemaining < 300 && styles.timeUrgent,
                    ]}
                  >
                    {timeRemaining > 0
                      ? `${hoursRemaining}h ${minutesRemaining}m ${secondsRemaining}s`
                      : "EXPIRED"}
                  </Text>
                </View>
                <View style={styles.duelInfoRow}>
                  <Text style={styles.duelInfoLabel}>Type:</Text>
                  <Text style={styles.duelInfoValue}>
                    {isPlank
                      ? "Longest continuous hold"
                      : "Maximum reps in one set"}
                  </Text>
                </View>

                {/* Scores */}
                {(userScore !== null || opponentScore !== null) && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.duelInfoRow}>
                      <Text style={styles.duelInfoLabel}>Your Score:</Text>
                      <Text style={styles.duelInfoValue}>
                        {userScore !== null
                          ? `${userScore} ${getExerciseUnit(exercise)}`
                          : "Not submitted"}
                      </Text>
                    </View>
                    <View style={styles.duelInfoRow}>
                      <Text style={styles.duelInfoLabel}>Opponent Score:</Text>
                      <Text style={styles.duelInfoValue}>
                        {opponentScore !== null
                          ? `${opponentScore} ${getExerciseUnit(exercise)}`
                          : "Not submitted"}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Rules */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚔️ Duel Rules</Text>
              <View style={styles.rulesCard}>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleNumber}>1</Text>
                  <Text style={styles.ruleText}>
                    One set only - no multiple tries per duel
                  </Text>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleNumber}>2</Text>
                  <Text style={styles.ruleText}>
                    Must start attempt within the duel window
                  </Text>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleNumber}>3</Text>
                  <Text style={styles.ruleText}>
                    AI will verify reps/form (manual entry for now)
                  </Text>
                </View>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleNumber}>4</Text>
                  <Text style={styles.ruleText}>
                    Ties resolved by: quality → {isPlank ? "N/A" : "speed →"}{" "}
                    coin toss
                  </Text>
                </View>
              </View>
            </View>

            {/* Form Tips */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Form Tips</Text>
              <View style={styles.tipsCard}>
                {formTips[exercise].map((tip, index) => (
                  <View key={index} style={styles.tipItem}>
                    <Text style={styles.tipBullet}>•</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Anti-Cheat Notice */}
            <View style={styles.section}>
              <View style={styles.antiCheatCard}>
                <Text style={styles.antiCheatTitle}>📹 Recording Required</Text>
                <Text style={styles.antiCheatText}>
                  • Camera permission required{"\n"}• Face/torso must be visible
                  {"\n"}• Attempt recorded within app{"\n"}• Manual verification
                  for now
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {duel.status === "pending" && !opponent && (
                <View style={styles.waitingContainer}>
                  <Text style={styles.waitingText}>
                    ⏳ Waiting for an opponent to join...
                  </Text>
                  <TouchableOpacity
                    style={styles.forfeitButton}
                    onPress={handleForfeit}
                  >
                    <Text style={styles.forfeitButtonText}>Cancel Duel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {duel.status === "active" &&
                userScore === null &&
                timeRemaining > 0 && (
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={handleStartAttempt}
                  >
                    <LinearGradient
                      colors={[COLORS.ACCENT.PRIMARY, COLORS.ACCENT.SECONDARY]}
                      style={styles.startButtonGradient}
                    >
                      <Text style={styles.startButtonText}>
                        🚀 Start Attempt
                      </Text>
                      <Text style={styles.startButtonSubtext}>
                        One chance only!
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

              {userScore !== null && (
                <View style={styles.completedContainer}>
                  <Text style={styles.completedText}>✅ Score Submitted!</Text>
                  <Text style={styles.completedSubtext}>
                    {opponentScore === null
                      ? "Waiting for opponent..."
                      : "Duel completed!"}
                  </Text>
                </View>
              )}

              {timeRemaining <= 0 && userScore === null && (
                <View style={styles.expiredContainer}>
                  <Text style={styles.expiredText}>⏰ Duel Expired</Text>
                  <Text style={styles.expiredSubtext}>
                    Time window has closed
                  </Text>
                </View>
              )}

              {duel.status === "active" && userScore === null && (
                <TouchableOpacity
                  style={styles.forfeitButton}
                  onPress={handleForfeit}
                >
                  <Text style={styles.forfeitButtonText}>Forfeit Duel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaWrapper>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: "600",
  },
  errorText: {
    color: COLORS.ACCENT.ERROR,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    borderColor: COLORS.ACCENT.PRIMARY,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 15,
  },
  retryButtonText: {
    color: COLORS.ACCENT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  backButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.TEXT.PRIMARY,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 12,
  },
  duelInfoCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  duelInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  duelInfoLabel: {
    fontSize: 16,
    color: COLORS.TEXT.TERTIARY,
  },
  duelInfoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
  },
  rulesCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  ruleNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.ACCENT.PRIMARY,
    marginRight: 12,
    minWidth: 20,
  },
  ruleText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    flex: 1,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 16,
    color: COLORS.ACCENT.PRIMARY,
    marginRight: 12,
    minWidth: 20,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    flex: 1,
    lineHeight: 20,
  },
  antiCheatCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.ACCENT.WARNING,
  },
  antiCheatTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  antiCheatText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    lineHeight: 20,
  },
  startButton: {
    borderRadius: 20,
    marginTop: 20,
    shadowColor: COLORS.UI.SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  startButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  startButtonSubtext: {
    color: COLORS.TEXT.TERTIARY,
    fontSize: 14,
  },
  statusIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: "center",
  },
  statusActive: {
    backgroundColor: COLORS.STATUS.COMPLETED,
  },
  statusPending: {
    backgroundColor: COLORS.ACCENT.WARNING,
  },
  statusCompleted: {
    backgroundColor: COLORS.STATUS.COMPLETED,
  },
  statusText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.UI.DIVIDER,
    marginVertical: 12,
  },
  timeUrgent: {
    color: COLORS.ACCENT.ERROR,
    fontWeight: "bold",
  },
  actionButtons: {
    marginTop: 20,
  },
  waitingContainer: {
    alignItems: "center",
    padding: 20,
  },
  waitingText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  completedContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.UI.CARD_BACKGROUND,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.STATUS.COMPLETED,
  },
  completedText: {
    color: COLORS.STATUS.COMPLETED,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  completedSubtext: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 14,
    textAlign: "center",
  },
  expiredContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.UI.CARD_BACKGROUND,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.ACCENT.ERROR,
  },
  expiredText: {
    color: COLORS.ACCENT.ERROR,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  expiredSubtext: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 14,
    textAlign: "center",
  },
  forfeitButton: {
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    borderColor: COLORS.ACCENT.ERROR,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 15,
  },
  forfeitButtonText: {
    color: COLORS.ACCENT.ERROR,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default DuelReadyScreen;
