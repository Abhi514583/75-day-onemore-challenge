import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";
import { SafeAreaWrapper } from "../components/SafeAreaWrapper";

const { width } = Dimensions.get("window");

interface Exercise {
  id: string;
  name: string;
  emoji: string;
  description: string;
  targetMuscles: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  type: "pushups" | "squats" | "situps" | "planks";
}

interface ExerciseSelectionScreenProps {
  baselines: {
    pushups: number;
    squats: number;
    situps: number;
    planks: number;
  };
  onSelectExercise: (
    exerciseType: "pushups" | "squats" | "situps" | "planks",
    target: number
  ) => void;
  onBack: () => void;
}

const ExerciseSelectionScreen: React.FC<ExerciseSelectionScreenProps> = ({
  baselines,
  onSelectExercise,
  onBack,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const exercises: Exercise[] = [
    {
      id: "1",
      name: "Push-ups",
      emoji: "💪",
      description: "Build upper body strength",
      targetMuscles: "Chest, Arms, Shoulders",
      difficulty: "Beginner",
      type: "pushups",
    },
    {
      id: "2",
      name: "Squats",
      emoji: "🦵",
      description: "Strengthen your lower body",
      targetMuscles: "Legs, Glutes, Core",
      difficulty: "Beginner",
      type: "squats",
    },
    {
      id: "3",
      name: "Sit-ups",
      emoji: "🔥",
      description: "Core strengthening exercise",
      targetMuscles: "Abs, Core",
      difficulty: "Beginner",
      type: "situps",
    },
    {
      id: "4",
      name: "Planks",
      emoji: "⏱️",
      description: "Full body stability",
      targetMuscles: "Core, Shoulders, Back",
      difficulty: "Intermediate",
      type: "planks",
    },
  ];

  const handleExerciseSelect = (exercise: Exercise) => {
    const target = baselines[exercise.type];
    console.log(`Selected ${exercise.name} with target: ${target}`);
    onSelectExercise(exercise.type, target);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return COLORS.STATUS.COMPLETED;
      case "Intermediate":
        return COLORS.ACCENT.WARNING;
      case "Advanced":
        return COLORS.ACCENT.ERROR;
      default:
        return COLORS.STATUS.COMPLETED;
    }
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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Choose Your Exercise</Text>
              <Text style={styles.subtitle}>
                Select an exercise to start your daily challenge
              </Text>
            </View>

            {/* Exercise Cards */}
            <View style={styles.exerciseGrid}>
              {exercises.map((exercise, index) => (
                <Animated.View
                  key={exercise.id}
                  style={[
                    styles.exerciseCardContainer,
                    {
                      transform: [
                        {
                          translateY: slideAnim.interpolate({
                            inputRange: [0, 30],
                            outputRange: [0, 30 + index * 10],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.exerciseCard}
                    onPress={() => handleExerciseSelect(exercise)}
                  >
                    <LinearGradient
                      colors={[
                        COLORS.BACKGROUND.CARD,
                        COLORS.UI.BUTTON_SECONDARY,
                      ]}
                      style={styles.cardGradient}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.exerciseEmoji}>
                          {exercise.emoji}
                        </Text>
                        <View
                          style={[
                            styles.difficultyBadge,
                            {
                              backgroundColor: getDifficultyColor(
                                exercise.difficulty
                              ),
                            },
                          ]}
                        >
                          <Text style={styles.difficultyText}>
                            {exercise.difficulty}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseDescription}>
                        {exercise.description}
                      </Text>
                      <Text style={styles.targetMuscles}>
                        {exercise.targetMuscles}
                      </Text>

                      <View style={styles.targetInfo}>
                        <Text style={styles.targetLabel}>Today's Target:</Text>
                        <Text style={styles.targetValue}>
                          {baselines[exercise.type]}{" "}
                          {exercise.type === "planks" ? "seconds" : "reps"}
                        </Text>
                      </View>

                      <View style={styles.startButton}>
                        <Text style={styles.startButtonText}>
                          Start Exercise →
                        </Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>

            {/* Progress Info */}
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>💡 Pro Tip</Text>
              <Text style={styles.progressText}>
                Complete all 4 exercises to finish your daily challenge. Each
                day adds +1 rep to build your strength progressively!
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
    textShadowColor: COLORS.EFFECTS.OVERLAY,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 22,
  },
  exerciseGrid: {
    marginBottom: 30,
  },
  exerciseCardContainer: {
    marginBottom: 16,
  },
  exerciseCard: {
    borderRadius: 16,
    shadowColor: COLORS.UI.SHADOW,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseEmoji: {
    fontSize: 32,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 12,
    fontWeight: "600",
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 6,
  },
  exerciseDescription: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 8,
  },
  targetMuscles: {
    fontSize: 12,
    color: COLORS.TEXT.MUTED,
    marginBottom: 16,
  },
  targetInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    borderRadius: 8,
  },
  targetLabel: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
  },
  targetValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.ACCENT.PRIMARY,
  },
  startButton: {
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  startButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  progressInfo: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ExerciseSelectionScreen;
