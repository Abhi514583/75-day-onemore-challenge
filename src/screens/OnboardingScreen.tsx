import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';

interface ExerciseBaseline {
  pushups: number;
  squats: number;
  situps: number;
  planks: number; // in seconds
}

interface OnboardingScreenProps {
  onComplete?: (baselines: ExerciseBaseline) => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [baselines, setBaselines] = useState<ExerciseBaseline>({
    pushups: 10,
    squats: 15,
    situps: 10,
    planks: 30,
  });

  const [currentStep, setCurrentStep] = useState(0);

  const exercises = [
    {
      key: 'pushups' as keyof ExerciseBaseline,
      name: 'Push-ups',
      emoji: '💪',
      description: 'Upper body strength exercise',
      instruction: 'How many push-ups can you do comfortably?',
      unit: 'reps',
      min: 1,
      max: 100,
      defaultValue: 10,
    },
    {
      key: 'squats' as keyof ExerciseBaseline,
      name: 'Squats',
      emoji: '🦵',
      description: 'Lower body strength exercise',
      instruction: 'How many squats can you do comfortably?',
      unit: 'reps',
      min: 1,
      max: 100,
      defaultValue: 15,
    },
    {
      key: 'situps' as keyof ExerciseBaseline,
      name: 'Sit-ups',
      emoji: '🏋️',
      description: 'Core strength exercise',
      instruction: 'How many sit-ups can you do comfortably?',
      unit: 'reps',
      min: 1,
      max: 100,
      defaultValue: 10,
    },
    {
      key: 'planks' as keyof ExerciseBaseline,
      name: 'Planks',
      emoji: '⏱️',
      description: 'Core endurance exercise',
      instruction: 'How long can you hold a plank comfortably?',
      unit: 'seconds',
      min: 10,
      max: 300,
      defaultValue: 30,
    },
  ];

  const currentExercise = exercises[currentStep];

  const handleValueChange = (value: string) => {
    const numValue = parseInt(value) || currentExercise.defaultValue;
    const clampedValue = Math.max(currentExercise.min, Math.min(currentExercise.max, numValue));
    
    setBaselines(prev => ({
      ...prev,
      [currentExercise.key]: clampedValue,
    }));
  };

  const handleNext = () => {
    if (currentStep < exercises.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    // Validate all baselines
    const isValid = Object.values(baselines).every(value => value > 0);
    
    if (!isValid) {
      Alert.alert('Invalid Input', 'Please ensure all exercise values are greater than 0.');
      return;
    }

    console.log('Baselines set:', baselines);
    Alert.alert(
      'Baselines Set!',
      `Your 75-day challenge starts with:\n• ${baselines.pushups} push-ups\n• ${baselines.squats} squats\n• ${baselines.situps} sit-ups\n• ${baselines.planks} second plank\n\nReady to begin your transformation?`,
      [
        { 
          text: 'Start Challenge!', 
          onPress: () => {
            if (onComplete) {
              onComplete(baselines);
            }
          }
        }
      ]
    );
  };

  const adjustValue = (delta: number) => {
    const currentValue = baselines[currentExercise.key];
    const newValue = Math.max(currentExercise.min, Math.min(currentExercise.max, currentValue + delta));
    
    setBaselines(prev => ({
      ...prev,
      [currentExercise.key]: newValue,
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of {exercises.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentStep + 1) / exercises.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Exercise Card */}
        <View style={styles.exerciseCard}>
          <Text style={styles.exerciseEmoji}>{currentExercise.emoji}</Text>
          <Text style={styles.exerciseName}>{currentExercise.name}</Text>
          <Text style={styles.exerciseDescription}>{currentExercise.description}</Text>
          
          <Text style={styles.instruction}>{currentExercise.instruction}</Text>

          {/* Value Input Section */}
          <View style={styles.inputSection}>
            <View style={styles.valueContainer}>
              <TouchableOpacity 
                style={styles.adjustButton}
                onPress={() => adjustValue(-1)}
              >
                <Text style={styles.adjustButtonText}>−</Text>
              </TouchableOpacity>
              
              <View style={styles.valueDisplay}>
                <TextInput
                  style={styles.valueInput}
                  value={baselines[currentExercise.key].toString()}
                  onChangeText={handleValueChange}
                  keyboardType="numeric"
                  textAlign="center"
                />
                <Text style={styles.unitText}>{currentExercise.unit}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.adjustButton}
                onPress={() => adjustValue(1)}
              >
                <Text style={styles.adjustButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Select Buttons */}
            <View style={styles.quickSelectContainer}>
              <Text style={styles.quickSelectLabel}>Quick select:</Text>
              <View style={styles.quickSelectButtons}>
                {[
                  currentExercise.key === 'planks' ? 15 : 5,
                  currentExercise.defaultValue,
                  currentExercise.key === 'planks' ? 60 : 20,
                  currentExercise.key === 'planks' ? 90 : 30,
                ].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.quickSelectButton,
                      baselines[currentExercise.key] === value && styles.quickSelectButtonActive
                    ]}
                    onPress={() => setBaselines(prev => ({ ...prev, [currentExercise.key]: value }))}
                  >
                    <Text style={[
                      styles.quickSelectButtonText,
                      baselines[currentExercise.key] === value && styles.quickSelectButtonTextActive
                    ]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tip:</Text>
            <Text style={styles.tipsText}>
              Choose a number you can do comfortably. Remember, you'll be adding +1 every day for 75 days!
            </Text>
          </View>
        </View>

        {/* Preview of Final Challenge */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Your Day 75 Target:</Text>
          <Text style={styles.previewText}>
            {currentExercise.key === 'planks' 
              ? `${baselines[currentExercise.key] + 74 * 5} seconds` 
              : `${baselines[currentExercise.key] + 74} ${currentExercise.unit}`
            }
          </Text>
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity 
          style={[styles.navButton, styles.backButton, currentStep === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentStep === 0}
        >
          <Text style={[styles.navButtonText, styles.backButtonText]}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, styles.nextButton]}
          onPress={handleNext}
        >
          <Text style={styles.navButtonText}>
            {currentStep === exercises.length - 1 ? 'Start Challenge!' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 20,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  exerciseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  exerciseEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
  },
  instruction: {
    fontSize: 18,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  adjustButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  valueDisplay: {
    alignItems: 'center',
    marginHorizontal: 32,
  },
  valueInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    minWidth: 100,
  },
  unitText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  quickSelectContainer: {
    alignItems: 'center',
  },
  quickSelectLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  quickSelectButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickSelectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickSelectButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  quickSelectButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  quickSelectButtonTextActive: {
    color: '#ffffff',
  },
  tipsContainer: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  previewContainer: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d5a2d',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d5a2d',
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#f8f9fa',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  backButtonText: {
    color: '#666666',
  },
});

export default OnboardingScreen;