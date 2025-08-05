import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

interface ExerciseTarget {
  type: 'pushups' | 'squats' | 'situps' | 'planks';
  name: string;
  emoji: string;
  target: number;
  unit: string;
  completed: boolean;
}

interface DashboardProps {
  baselines?: {
    pushups: number;
    squats: number;
    situps: number;
    planks: number;
  };
}

const DashboardScreen: React.FC<DashboardProps> = ({ 
  baselines = { pushups: 10, squats: 15, situps: 10, planks: 30 } 
}) => {
  const [currentDay, setCurrentDay] = useState(27); // Example day
  const [currentStreak, setCurrentStreak] = useState(27);
  const [exercises, setExercises] = useState<ExerciseTarget[]>([]);

  useEffect(() => {
    // Calculate today's targets based on baselines and current day
    const todaysExercises: ExerciseTarget[] = [
      {
        type: 'pushups',
        name: 'Push-ups',
        emoji: '💪',
        target: baselines.pushups + (currentDay - 1),
        unit: 'reps',
        completed: false,
      },
      {
        type: 'squats',
        name: 'Squats',
        emoji: '🦵',
        target: baselines.squats + (currentDay - 1),
        unit: 'reps',
        completed: false,
      },
      {
        type: 'situps',
        name: 'Sit-ups',
        emoji: '🏋️',
        target: baselines.situps + (currentDay - 1),
        unit: 'reps',
        completed: false,
      },
      {
        type: 'planks',
        name: 'Planks',
        emoji: '⏱️',
        target: baselines.planks + (currentDay - 1) * 5, // +5 seconds per day
        unit: 'seconds',
        completed: false,
      },
    ];
    setExercises(todaysExercises);
  }, [currentDay, baselines]);

  const handleStartExercise = (exerciseType: string) => {
    console.log(`Starting ${exerciseType} exercise`);
  };

  const dayProgressPercentage = (currentDay / 75) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dayText}>Day {currentDay} / 75</Text>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${dayProgressPercentage}%` }]} 
            />
          </View>
          <Text style={styles.streakText}>🔥 {currentStreak} day streak</Text>
        </View>

        {/* Today's Challenge */}
        <View style={styles.challengeContainer}>
          <Text style={styles.challengeTitle}>Today's Challenge</Text>
          
          {exercises.map((exercise) => (
            <View key={exercise.type} style={styles.exerciseCard}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseEmoji}>{exercise.emoji}</Text>
                <View style={styles.exerciseDetails}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseTarget}>
                    {exercise.target} {exercise.unit}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => handleStartExercise(exercise.type)}
              >
                <Text style={styles.startButtonText}>Start</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton}>
          <Text style={styles.shareButtonText}>📱 Share "Day {currentDay} / 75 done!"</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  dayText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  streakText: {
    fontSize: 18,
    color: '#666666',
  },
  challengeContainer: {
    marginBottom: 32,
  },
  challengeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  exerciseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  exerciseTarget: {
    fontSize: 16,
    color: '#666666',
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default DashboardScreen;