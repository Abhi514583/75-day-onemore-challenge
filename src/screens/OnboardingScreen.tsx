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
import { LinearGradient } from 'expo-linear-gradient';

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
      instruction: 'How many push-ups can you do comfortably? (Type any number!)',
      unit: 'reps',
      min: 1,
      defaultValue: 10,
    },
    {
      key: 'squats' as keyof ExerciseBaseline,
      name: 'Squats',
      emoji: '🦵',
      description: 'Lower body strength exercise',
      instruction: 'How many squats can you do comfortably? (Type any number!)',
      unit: 'reps',
      min: 1,
      defaultValue: 15,
    },
    {
      key: 'situps' as keyof ExerciseBaseline,
      name: 'Sit-ups',
      emoji: '🏋️',
      description: 'Core strength exercise',
      instruction: 'How many sit-ups can you do comfortably? (Type any number!)',
      unit: 'reps',
      min: 1,
      defaultValue: 10,
    },
    {
      key: 'planks' as keyof ExerciseBaseline,
      name: 'Planks',
      emoji: '⏱️',
      description: 'Core endurance exercise',
      instruction: 'How long can you hold a plank comfortably? (Type any number!)',
      unit: 'seconds',
      min: 10,
      defaultValue: 30,
    },
  ];

  const currentExercise = exercises[currentStep];

  const handleValueChange = (value: string) => {
    // Allow empty string for better UX while typing
    if (value === '') {
      setBaselines(prev => ({
        ...prev,
        [currentExercise.key]: 0,
      }));
      return;
    }
    
    const numValue = parseInt(value);
    if (isNaN(numValue)) return;
    
    // Allow much higher values - remove the max constraint for flexibility
    const clampedValue = Math.max(currentExercise.min, numValue);
    
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
    // Allow much higher values, remove max constraint
    const newValue = Math.max(currentExercise.min, currentValue + delta);
    
    setBaselines(prev => ({
      ...prev,
      [currentExercise.key]: newValue,
    }));
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
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
                  currentExercise.key === 'planks' ? 60 : 25,
                  currentExercise.key === 'planks' ? 120 : 50,
                  currentExercise.key === 'planks' ? 180 : 100,
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
            <Text style={styles.tipsTitle}>💡 Pro Tip:</Text>
            <Text style={styles.tipsText}>
              You can type any number! Whether you're starting at 5 or 100, choose what feels right for your current fitness level. You'll add +1 every day for 75 days!
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
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  exerciseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  exerciseEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  exerciseDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
  },
  instruction: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontWeight: '600',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  adjustButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  valueDisplay: {
    alignItems: 'center',
    marginHorizontal: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 140,
  },
  valueInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    minWidth: 100,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  unitText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '600',
  },
  quickSelectContainer: {
    alignItems: 'center',
  },
  quickSelectLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
    fontWeight: '600',
  },
  quickSelectButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  quickSelectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  quickSelectButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderColor: '#FFD700',
  },
  quickSelectButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  quickSelectButtonTextActive: {
    color: '#FFD700',
    fontWeight: '700',
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    fontWeight: '500',
  },
  previewContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  nextButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default OnboardingScreen;