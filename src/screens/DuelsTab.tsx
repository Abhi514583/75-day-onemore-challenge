import React, { useEffect, useRef, useState } from "react";
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
import { SafeAreaWrapper } from "../components/SafeAreaWrapper";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { updatePersonalBest } from "../store/slices/userSlice";
import CreateDuelScreen from "./CreateDuelScreen";
import DuelReadyScreen from "./DuelReadyScreen";
import { DuelDataAdapterFactory } from "../services/DuelDataAdapter";
import { UnifiedDuel, ExerciseType } from "../types/unified";
import {
  Duel,
  getExerciseLabel,
  getExerciseEmoji,
  getTimeWindowLabel,
} from "../types/duels";
import { formatTimeWindow } from "../utils/firebase";

interface PersonalBest {
  type: ExerciseType;
  name: string;
  emoji: string;
  value: number;
  unit: string;
  lastUpdated: string;
}

interface DuelsTabProps {
  onStartAttempt: (exerciseType: string, isPB: boolean) => void;
}

type ScreenState = "main" | "create" | "ready";

const DuelsTab: React.FC<DuelsTabProps> = ({ onStartAttempt }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dispatch = useAppDispatch();

  const { personalBests } = useAppSelector((state) => state.user);
  const { omrRating, duelHistory } = useAppSelector((state) => state.duels);

  const [currentScreen, setCurrentScreen] = useState<ScreenState>("main");
  const [selectedDuel, setSelectedDuel] = useState<UnifiedDuel | null>(null);
  const [activeDuels, setActiveDuels] = useState<UnifiedDuel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const duelAdapter = DuelDataAdapterFactory.getAdapter();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Load active duels
  useEffect(() => {
    const loadDuels = async () => {
      setIsLoading(true);
      try {
        const duels = await duelAdapter.getUserDuels();
        setActiveDuels(duels);
      } catch (error) {
        console.error("Error loading duels:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDuels();
  }, [duelAdapter]);

  // Format personal bests data
  const personalBestsList: PersonalBest[] = [
    {
      type: "pushups",
      name: "Push-ups",
      emoji: "💪",
      value: personalBests?.pushups || 0,
      unit: "reps",
      lastUpdated: personalBests?.pushupsDate || "Never",
    },
    {
      type: "squats",
      name: "Squats",
      emoji: "🦵",
      value: personalBests?.squats || 0,
      unit: "reps",
      lastUpdated: personalBests?.squatsDate || "Never",
    },
    {
      type: "situps",
      name: "Sit-ups",
      emoji: "🔥",
      value: personalBests?.situps || 0,
      unit: "reps",
      lastUpdated: personalBests?.situpsDate || "Never",
    },
    {
      type: "planks",
      name: "Plank",
      emoji: "⏱️",
      value: personalBests?.planks || 0,
      unit: "seconds",
      lastUpdated: personalBests?.planksDate || "Never",
    },
  ];

  const handleStartAttempt = (pb: PersonalBest) => {
    Alert.alert(
      `${pb.name} Personal Best Attempt`,
      `Current PB: ${pb.value} ${pb.unit}\nReady to give it your all?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Attempt",
          onPress: () => onStartAttempt(pb.type, true),
        },
      ]
    );
  };

  const handleCreateDuel = () => {
    setCurrentScreen("create");
  };

  const handleDuelCreated = (duel: UnifiedDuel) => {
    setSelectedDuel(duel);
    setCurrentScreen("ready");
    // Refresh duels list
    duelAdapter.getUserDuels().then(setActiveDuels);
  };

  const handleJoinDuel = (duel: UnifiedDuel) => {
    setSelectedDuel(duel);
    setCurrentScreen("ready");
  };

  const handleStartDuelAttempt = () => {
    if (selectedDuel) {
      onStartAttempt(selectedDuel.exercise, false);
    }
  };

  const handleBackToMain = () => {
    setCurrentScreen("main");
    setSelectedDuel(null);
  };

  const formatDate = (dateString: string): string => {
    if (dateString === "Never") return "Never";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() !== new Date().getFullYear()
            ? "numeric"
            : undefined,
      });
    } catch {
      return "Unknown";
    }
  };

  const getGlobalOMR = (): number => {
    const ratings = [
      omrRating.pushups,
      omrRating.squats,
      omrRating.situps,
      omrRating.planks,
    ];
    return Math.round(
      ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    );
  };

  const getTotalWins = (): number => {
    return duelHistory.filter((h) => h.won).length;
  };

  const getTotalLosses = (): number => {
    return duelHistory.filter((h) => !h.won).length;
  };

  if (currentScreen === "create") {
    return (
      <CreateDuelScreen
        onBack={handleBackToMain}
        onDuelCreated={(localDuel) => {
          // Convert local duel to unified duel for now
          // This is a temporary adapter until we update CreateDuelScreen
          const unifiedDuel: UnifiedDuel = {
            id: localDuel.id,
            exercise: localDuel.settings.exercise,
            status:
              localDuel.status === "waiting"
                ? "pending"
                : localDuel.status === "active"
                ? "active"
                : localDuel.status === "completed"
                ? "completed"
                : "expired",
            host: {
              uid: localDuel.hostId,
              username: localDuel.hostUsername,
            },
            guest: localDuel.guestId
              ? {
                  uid: localDuel.guestId,
                  username: localDuel.guestUsername || "Unknown",
                }
              : undefined,
            hostScore: localDuel.hostAttempt?.score,
            guestScore: localDuel.guestAttempt?.score,
            winnerUid: localDuel.winnerId,
            windowSec:
              localDuel.settings.timeWindow === "10min"
                ? 600
                : localDuel.settings.timeWindow === "30min"
                ? 1800
                : 86400,
            matchType: localDuel.settings.isPublic ? "public" : "friend",
            createdAt: new Date(localDuel.createdAt).getTime(),
            activatedAt: localDuel.activatedAt
              ? new Date(localDuel.activatedAt).getTime()
              : undefined,
            completedAt: localDuel.completedAt
              ? new Date(localDuel.completedAt).getTime()
              : undefined,
            expiresAt:
              new Date(localDuel.createdAt).getTime() +
              (localDuel.settings.timeWindow === "10min"
                ? 600000
                : localDuel.settings.timeWindow === "30min"
                ? 1800000
                : 86400000),
          };
          handleDuelCreated(unifiedDuel);
        }}
      />
    );
  }

  if (currentScreen === "ready" && selectedDuel) {
    return (
      <DuelReadyScreen
        duelId={selectedDuel.id}
        onStartAttempt={(duel) => {
          // Navigate to exercise tracking with the duel data
          onStartAttempt(selectedDuel.exercise, false);
        }}
        onBack={handleBackToMain}
      />
    );
  }

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Duels & Personal Bests</Text>
            <Text style={styles.subtitle}>Challenge yourself and others</Text>
          </View>

          {/* OMR Rating Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚔️ Your OMR Rating</Text>
            <View style={styles.omrCard}>
              <View style={styles.globalOMR}>
                <Text style={styles.globalOMRValue}>{getGlobalOMR()}</Text>
                <Text style={styles.globalOMRLabel}>Global OMR</Text>
              </View>
              <View style={styles.omrBreakdown}>
                {personalBestsList.map((pb) => (
                  <View key={pb.type} style={styles.omrItem}>
                    <Text style={styles.omrEmoji}>{pb.emoji}</Text>
                    <Text style={styles.omrValue}>{omrRating[pb.type]}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.recordCard}>
              <Text style={styles.recordText}>
                {getTotalWins()}W - {getTotalLosses()}L ({duelHistory.length}{" "}
                total)
              </Text>
            </View>
          </View>

          {/* Active Duels */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⚡ Active Duels</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateDuel}
              >
                <Text style={styles.createButtonText}>+ Create</Text>
              </TouchableOpacity>
            </View>

            {activeDuels.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>⚔️</Text>
                <Text style={styles.emptyTitle}>No Active Duels</Text>
                <Text style={styles.emptyText}>
                  Create a duel to challenge someone!
                </Text>
              </View>
            ) : (
              activeDuels.map((duel) => (
                <TouchableOpacity
                  key={duel.id}
                  style={styles.duelCard}
                  onPress={() => handleJoinDuel(duel)}
                >
                  <View style={styles.duelHeader}>
                    <Text style={styles.duelExercise}>
                      {getExerciseEmoji(duel.exercise)}{" "}
                      {getExerciseLabel(duel.exercise)}
                    </Text>
                    <Text style={styles.duelStatus}>{duel.status}</Text>
                  </View>
                  <Text style={styles.duelOpponent}>
                    vs {duel.guest?.username || "Waiting for opponent..."}
                  </Text>
                  <Text style={styles.duelTime}>
                    {formatTimeWindow(duel.windowSec)} window
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Personal Bests Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Personal Bests</Text>
            <Text style={styles.sectionSubtitle}>Your all-time records</Text>

            {personalBestsList.map((pb) => (
              <View key={pb.type} style={styles.pbCard}>
                <View style={styles.pbHeader}>
                  <View style={styles.pbInfo}>
                    <Text style={styles.pbEmoji}>{pb.emoji}</Text>
                    <View style={styles.pbDetails}>
                      <Text style={styles.pbName}>{pb.name}</Text>
                      <Text style={styles.pbUpdated}>
                        Updated: {formatDate(pb.lastUpdated)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.pbValueContainer}>
                    <Text style={styles.pbValue}>
                      {pb.value} {pb.unit}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.attemptButton}
                  onPress={() => handleStartAttempt(pb)}
                >
                  <LinearGradient
                    colors={[
                      COLORS.UI.BUTTON_PRIMARY,
                      COLORS.UI.BUTTON_SECONDARY,
                    ]}
                    style={styles.attemptButtonGradient}
                  >
                    <Text style={styles.attemptButtonText}>Start Attempt</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Recent Duels */}
          {duelHistory.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📜 Recent Duels</Text>
              {duelHistory.slice(0, 5).map((history, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyExercise}>
                      {getExerciseEmoji(history.exercise)}{" "}
                      {getExerciseLabel(history.exercise)}
                    </Text>
                    <Text
                      style={[
                        styles.historyResult,
                        {
                          color: history.won
                            ? COLORS.STATUS.COMPLETED
                            : COLORS.ACCENT.ERROR,
                        },
                      ]}
                    >
                      {history.won ? "WIN" : "LOSS"}
                    </Text>
                  </View>
                  <Text style={styles.historyOpponent}>
                    vs {history.opponentUsername}
                  </Text>
                  <View style={styles.historyStats}>
                    <Text style={styles.historyScore}>
                      {history.myScore} - {history.opponentScore}
                    </Text>
                    <Text
                      style={[
                        styles.historyRating,
                        {
                          color:
                            history.ratingChange >= 0
                              ? COLORS.STATUS.COMPLETED
                              : COLORS.ACCENT.ERROR,
                        },
                      ]}
                    >
                      {history.ratingChange >= 0 ? "+" : ""}
                      {history.ratingChange}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
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
    paddingBottom: 100, // Space for bottom navigation
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: COLORS.ACCENT.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  omrCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  globalOMR: {
    alignItems: "center",
    marginBottom: 16,
  },
  globalOMRValue: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.ACCENT.PRIMARY,
  },
  globalOMRLabel: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
  },
  omrBreakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  omrItem: {
    alignItems: "center",
  },
  omrEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  omrValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.SECONDARY,
  },
  recordCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  recordText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    fontWeight: "500",
  },
  emptyCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "center",
  },
  duelCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  duelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  duelExercise: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
  },
  duelStatus: {
    fontSize: 12,
    color: COLORS.ACCENT.PRIMARY,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  duelOpponent: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 4,
  },
  duelTime: {
    fontSize: 12,
    color: COLORS.TEXT.MUTED,
  },
  pbCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  pbHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pbInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pbEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  pbDetails: {
    flex: 1,
  },
  pbName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  pbUpdated: {
    fontSize: 12,
    color: COLORS.TEXT.MUTED,
  },
  pbValueContainer: {
    alignItems: "flex-end",
  },
  pbValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.ACCENT.PRIMARY,
  },
  attemptButton: {
    borderRadius: 12,
  },
  attemptButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  attemptButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  historyCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyExercise: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
  },
  historyResult: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  historyOpponent: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 8,
  },
  historyStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyScore: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
  },
  historyRating: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default DuelsTab;
