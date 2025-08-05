import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
} from 'react-native';

interface WelcomeScreenProps {
  onStartChallenge?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartChallenge }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleStartChallenge = () => {
    console.log('Starting 75-Day Challenge!');
    if (onStartChallenge) {
      onStartChallenge();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>75-Day OneMore Challenge</Text>
          <Text style={styles.subtitle}>
            Transform your fitness with progressive daily challenges
          </Text>
        </View>
        
        <View style={styles.challengeInfo}>
          <View style={styles.infoItem}>
            <Text style={styles.emoji}>🏋️</Text>
            <Text style={styles.infoText}>Push-ups, Squats, Sit-ups, Planks</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.emoji}>📈</Text>
            <Text style={styles.infoText}>Add +1 rep every day for 75 days</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.emoji}>📱</Text>
            <Text style={styles.infoText}>AI-powered form tracking</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.emoji}>🏆</Text>
            <Text style={styles.infoText}>Earn milestone badges</Text>
          </View>
        </View>

        <View style={styles.progressConcept}>
          <Text style={styles.conceptTitle}>The "One More" Concept</Text>
          <Text style={styles.conceptText}>
            Start with your baseline. Each day, do just ONE MORE rep. 
            By day 75, you'll be amazed at your transformation!
          </Text>
          <View style={styles.exampleProgress}>
            <Text style={styles.exampleText}>Day 1: 10 push-ups</Text>
            <Text style={styles.exampleText}>Day 2: 11 push-ups</Text>
            <Text style={styles.exampleText}>Day 3: 12 push-ups</Text>
            <Text style={styles.exampleDots}>...</Text>
            <Text style={styles.exampleText}>Day 75: 84 push-ups! 🎉</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.startButton}
          onPress={handleStartChallenge}
        >
          <Text style={styles.startButtonText}>Start Your Challenge</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Join thousands completing the 75-day journey
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  challengeInfo: {
    marginVertical: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  emoji: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },
  infoText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  progressConcept: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 16,
    marginVertical: 20,
  },
  conceptTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  conceptText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  exampleProgress: {
    alignItems: 'center',
  },
  exampleText: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
    fontWeight: '500',
  },
  exampleDots: {
    fontSize: 14,
    color: '#999999',
    marginVertical: 4,
  },
  startButton: {
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
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default WelcomeScreen;