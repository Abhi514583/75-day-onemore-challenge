import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onStartChallenge?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStartChallenge }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleStartChallenge = () => {
    console.log('Starting 75-Day Challenge!');
    if (onStartChallenge) {
      onStartChallenge();
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      locations={[0, 0.6, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Floating background elements */}
        <Animated.View style={[styles.floatingElement, styles.element1, { transform: [{ translateY: floatAnim }] }]} />
        <Animated.View style={[styles.floatingElement, styles.element2, { transform: [{ translateY: floatAnim }] }]} />
        <Animated.View style={[styles.floatingElement, styles.element3, { transform: [{ translateY: floatAnim }] }]} />
        
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
          <Animated.View style={[styles.titleContainer, { transform: [{ translateY: floatAnim }] }]}>
            <Text style={styles.title}>75-Day</Text>
            <Text style={styles.titleAccent}>OneMore</Text>
            <Text style={styles.title}>Challenge</Text>
          </Animated.View>
          <Text style={styles.subtitle}>
            Transform your fitness with progressive daily challenges
          </Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🏆 Premium Experience</Text>
            </View>
          </View>
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

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartChallenge}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>🚀 Start Your Challenge</Text>
              <Text style={styles.startButtonSubtext}>Begin your transformation</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.footerText}>
          Join thousands completing the 75-day journey
        </Text>
        </Animated.View>
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
  floatingElement: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
  },
  element1: {
    width: 100,
    height: 100,
    top: height * 0.1,
    left: width * 0.1,
  },
  element2: {
    width: 60,
    height: 60,
    top: height * 0.3,
    right: width * 0.15,
  },
  element3: {
    width: 80,
    height: 80,
    bottom: height * 0.2,
    left: width * 0.2,
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
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  titleAccent: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFD700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 2,
    marginVertical: -5,
  },
  badgeContainer: {
    marginTop: 10,
  },
  badge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  badgeText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
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
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  progressConcept: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 16,
    marginVertical: 20,
    backdropFilter: 'blur(10px)',
  },
  conceptTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  conceptText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  exampleProgress: {
    alignItems: 'center',
  },
  exampleText: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
    fontWeight: '500',
  },
  exampleDots: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginVertical: 4,
  },
  startButton: {
    borderRadius: 25,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  startButtonGradient: {
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  startButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default WelcomeScreen;