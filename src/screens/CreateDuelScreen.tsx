import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { createDuel } from "../store/slices/duelsSlice";
import {
  ExerciseType,
  TimeWindow,
  DuelSettings,
  Duel,
  getTimeWindowLabel,
  getTimeWindowMs,
  getExerciseLabel,
  getExerciseEmoji,
} from "../types/duels";

interface CreateDuelScreenProps {
  onBack: () => void;
  onDuelCreated: (duel: Duel) => void;
}

const CreateDuelScreen: React.FC<CreateDuelScreenProps> = ({
  onBack,
  onDuelCreated,
}) => {
  const dispatch = useAppDispatch();
  const { username, userId } = useAppSelector((state) => state.duels);

  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseType>("pushups");
  const [selectedTimeWindow, setSelectedTimeWindow] =
    useState<TimeWindow>("30min");
  const [isPublic, setIsPublic] = useState(true);
  const [friendCode, setFriendCode] = useState("");

  const exercises: {
    type: ExerciseType;
    label: string;
    emoji: string;
    duelType: "max_reps" | "max_hold";
  }[] = [
    { type: "pushups", label: "Push-ups", emoji: "💪", duelType: "max_reps" },
    { type: "squats", label: "Squats", emoji: "🦵", duelType: "max_reps" },
    { type: "situps", label: "Sit-ups", emoji: "🔥", duelType: "max_reps" },
    { type: "planks", label: "Plank", emoji: "⏱️", duelType: "max_hold" },
  ];

  const timeWindows: { value: TimeWindow; label: string }[] = [
    { value: "10min", label: "10 minutes" },
    { value: "30min", label: "30 minutes" },
    { value: "24hours", label: "24 hours" },
  ];

  const handleCreateDuel = () => {
    const selectedExerciseData = exercises.find(
      (e) => e.type === selectedExercise
    )!;

    const settings: DuelSettings = {
      exercise: selectedExercise,
      type: selectedExerciseData.duelType,
      timeWindow: selectedTimeWindow,
      isPublic,
      friendCode: isPublic ? undefined : friendCode,
    };

    const duel: Duel = {
      id: "duel_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      hostId: userId,
      hostUsername: username,
      settings,
      status: "waiting",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(
        Date.now() + getTimeWindowMs(selectedTimeWindow)
      ).toISOString(),
    };

    dispatch(createDuel(duel));

    Alert.alert(
      "Duel Created!",
      isPublic
        ? "Your duel is now available for public matchmaking."
        : `Share this code with your friend: ${duel.id
            .slice(-6)
            .toUpperCase()}`,
      [{ text: "OK", onPress: () => onDuelCreated(duel) }]
    );
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Create Duel</Text>
            <Text style={styles.subtitle}>
              Challenge someone to a fitness duel
            </Text>
          </View>

          {/* Exercise Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Exercise</Text>
            <View style={styles.exerciseGrid}>
              {exercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.type}
                  style={[
                    styles.exerciseCard,
                    selectedExercise === exercise.type && styles.selectedCard,
                  ]}
                  onPress={() => setSelectedExercise(exercise.type)}
                >
                  <Text style={styles.exerciseEmoji}>{exercise.emoji}</Text>
                  <Text style={styles.exerciseLabel}>{exercise.label}</Text>
                  <Text style={styles.exerciseType}>
                    {exercise.duelType === "max_reps" ? "Max Reps" : "Max Hold"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Time Window */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Window</Text>
            <Text style={styles.sectionSubtitle}>
              How long opponents have to join and complete
            </Text>
            <View style={styles.timeWindowGrid}>
              {timeWindows.map((window) => (
                <TouchableOpacity
                  key={window.value}
                  style={[
                    styles.timeWindowCard,
                    selectedTimeWindow === window.value && styles.selectedCard,
                  ]}
                  onPress={() => setSelectedTimeWindow(window.value)}
                >
                  <Text style={styles.timeWindowLabel}>{window.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Match Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Match Type</Text>
            <View style={styles.matchTypeContainer}>
              <TouchableOpacity
                style={[styles.matchTypeCard, isPublic && styles.selectedCard]}
                onPress={() => setIsPublic(true)}
              >
                <Text style={styles.matchTypeEmoji}>🌍</Text>
                <Text style={styles.matchTypeLabel}>Public Matchmaking</Text>
                <Text style={styles.matchTypeDescription}>
                  Anyone can join your duel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.matchTypeCard, !isPublic && styles.selectedCard]}
                onPress={() => setIsPublic(false)}
              >
                <Text style={styles.matchTypeEmoji}>👥</Text>
                <Text style={styles.matchTypeLabel}>Friends Only</Text>
                <Text style={styles.matchTypeDescription}>
                  Share a code with your friend
                </Text>
              </TouchableOpacity>
            </View>

            {!isPublic && (
              <View style={styles.friendCodeContainer}>
                <Text style={styles.friendCodeLabel}>
                  Friend's Username (Optional)
                </Text>
                <TextInput
                  style={styles.friendCodeInput}
                  value={friendCode}
                  onChangeText={setFriendCode}
                  placeholder="Enter friend's username"
                  placeholderTextColor={COLORS.TEXT.MUTED}
                />
              </View>
            )}
          </View>

          {/* Rules Preview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Duel Rules</Text>
            <View style={styles.rulesCard}>
              <Text style={styles.rulesText}>
                • One set only - no multiple tries per duel{"\n"}• Must start
                attempt within the time window{"\n"}• AI will verify reps/form
                (manual for now){"\n"}• Ties resolved by quality, then speed
                {"\n"}• OMR rating changes after completion
              </Text>
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateDuel}
          >
            <LinearGradient
              colors={[COLORS.UI.BUTTON_PRIMARY, COLORS.UI.BUTTON_SECONDARY]}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>⚔️ Create Duel</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    paddingTop: 20,
    paddingBottom: 40,
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
    fontSize: 16,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "center",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
    marginBottom: 16,
  },
  exerciseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  exerciseCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  selectedCard: {
    borderColor: COLORS.ACCENT.PRIMARY,
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
  },
  exerciseEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  exerciseLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  exerciseType: {
    fontSize: 12,
    color: COLORS.TEXT.TERTIARY,
  },
  timeWindowGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeWindowCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flex: 0.3,
    borderWidth: 2,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  timeWindowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    textAlign: "center",
  },
  matchTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  matchTypeCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flex: 0.48,
    borderWidth: 2,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  matchTypeEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  matchTypeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
    textAlign: "center",
  },
  matchTypeDescription: {
    fontSize: 12,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "center",
  },
  friendCodeContainer: {
    marginTop: 16,
  },
  friendCodeLabel: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 8,
  },
  friendCodeInput: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  rulesCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  rulesText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    lineHeight: 20,
  },
  createButton: {
    borderRadius: 20,
    marginTop: 20,
  },
  createButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  createButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: "700",
  },
});

export default CreateDuelScreen;
