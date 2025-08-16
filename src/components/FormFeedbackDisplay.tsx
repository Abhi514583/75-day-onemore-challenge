import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { FormFeedback, FormSeverity } from "../types/pose";

const { width: screenWidth } = Dimensions.get("window");

export interface FormFeedbackDisplayProps {
  feedback: FormFeedback[];
  maxVisible?: number;
  autoHide?: boolean;
  autoHideDelay?: number;
  colorBlindFriendly?: boolean;
  onFeedbackPress?: (feedback: FormFeedback) => void;
  showSuggestions?: boolean;
  compactMode?: boolean;
}

interface AnimatedFeedbackItem {
  feedback: FormFeedback;
  slideAnim: Animated.Value;
  opacityAnim: Animated.Value;
  scaleAnim: Animated.Value;
  id: string;
}

export const FormFeedbackDisplay: React.FC<FormFeedbackDisplayProps> = ({
  feedback,
  maxVisible = 3,
  autoHide = true,
  autoHideDelay = 3000,
  colorBlindFriendly = false,
  onFeedbackPress,
  showSuggestions = true,
  compactMode = false,
}) => {
  const [animatedItems, setAnimatedItems] = useState<AnimatedFeedbackItem[]>(
    []
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Color schemes for different feedback types
  const getColorScheme = (
    type: FormFeedback["type"],
    severity: FormSeverity
  ) => {
    if (colorBlindFriendly) {
      // Colorblind-friendly patterns and shapes
      return {
        error: {
          bg: "#2D1B1B",
          border: "#8B0000",
          text: "#FFB3B3",
          icon: "⚠️",
        },
        warning: {
          bg: "#2D2A1B",
          border: "#DAA520",
          text: "#FFEB9C",
          icon: "⚡",
        },
        success: {
          bg: "#1B2D1B",
          border: "#228B22",
          text: "#B3FFB3",
          icon: "✓",
        },
        encouragement: {
          bg: "#1B1B2D",
          border: "#4169E1",
          text: "#B3B3FF",
          icon: "💪",
        },
        good: { bg: "#1B2D1B", border: "#228B22", text: "#B3FFB3", icon: "🎯" },
      };
    } else {
      // Standard color scheme
      return {
        error: {
          bg: "#FF4444",
          border: "#FF0000",
          text: "#FFFFFF",
          icon: "⚠️",
        },
        warning: {
          bg: "#FFB347",
          border: "#FF8C00",
          text: "#FFFFFF",
          icon: "⚡",
        },
        success: {
          bg: "#00FF88",
          border: "#00CC66",
          text: "#FFFFFF",
          icon: "✓",
        },
        encouragement: {
          bg: "#87CEEB",
          border: "#4682B4",
          text: "#FFFFFF",
          icon: "💪",
        },
        good: { bg: "#00FF88", border: "#00CC66", text: "#FFFFFF", icon: "🎯" },
      };
    }
  };

  // Get priority-based styling
  const getPriorityStyle = (priority: number) => {
    if (priority >= 10) return { borderWidth: 3, shadowOpacity: 0.4 }; // Critical
    if (priority >= 8) return { borderWidth: 2.5, shadowOpacity: 0.3 }; // High
    if (priority >= 5) return { borderWidth: 2, shadowOpacity: 0.2 }; // Medium
    return { borderWidth: 1.5, shadowOpacity: 0.1 }; // Low
  };

  // Create animated item
  const createAnimatedItem = (
    feedbackItem: FormFeedback
  ): AnimatedFeedbackItem => {
    return {
      feedback: feedbackItem,
      slideAnim: new Animated.Value(-screenWidth),
      opacityAnim: new Animated.Value(0),
      scaleAnim: new Animated.Value(0.8),
      id: `${feedbackItem.timestamp}-${Math.random()}`,
    };
  };

  // Animate item in
  const animateIn = (item: AnimatedFeedbackItem) => {
    Animated.parallel([
      Animated.spring(item.slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(item.opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(item.scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 6,
      }),
    ]).start();

    // Auto-hide if enabled
    if (autoHide && item.feedback.type !== "error") {
      const timeout = setTimeout(() => {
        animateOut(item);
      }, autoHideDelay);

      timeoutRefs.current.set(item.id, timeout);
    }
  };

  // Animate item out
  const animateOut = (item: AnimatedFeedbackItem) => {
    const timeout = timeoutRefs.current.get(item.id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(item.id);
    }

    Animated.parallel([
      Animated.timing(item.slideAnim, {
        toValue: screenWidth,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(item.opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(item.scaleAnim, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAnimatedItems((prev) => prev.filter((i) => i.id !== item.id));
    });
  };

  // Update animated items when feedback changes
  useEffect(() => {
    const visibleFeedback = feedback.slice(0, maxVisible);

    // Remove items that are no longer in feedback
    setAnimatedItems((prev) => {
      const currentIds = visibleFeedback.map((f) => `${f.timestamp}`);
      return prev.filter((item) => {
        const shouldKeep = currentIds.some((id) => item.id.startsWith(id));
        if (!shouldKeep) {
          animateOut(item);
        }
        return shouldKeep;
      });
    });

    // Add new items
    visibleFeedback.forEach((feedbackItem) => {
      const exists = animatedItems.some((item) =>
        item.id.startsWith(`${feedbackItem.timestamp}`)
      );

      if (!exists) {
        const newItem = createAnimatedItem(feedbackItem);
        setAnimatedItems((prev) => [...prev, newItem]);

        // Animate in after a short delay to ensure state update
        setTimeout(() => animateIn(newItem), 50);
      }
    });
  }, [feedback, maxVisible]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  // Handle item press
  const handleItemPress = (item: AnimatedFeedbackItem) => {
    if (onFeedbackPress) {
      onFeedbackPress(item.feedback);
    }

    // Toggle expansion for suggestions
    if (showSuggestions && item.feedback.suggestions.length > 0) {
      setExpandedItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(item.id)) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
        return newSet;
      });
    }
  };

  // Handle dismiss
  const handleDismiss = (item: AnimatedFeedbackItem) => {
    animateOut(item);
  };

  // Render feedback item
  const renderFeedbackItem = (item: AnimatedFeedbackItem) => {
    const { feedback } = item;
    const colorScheme = getColorScheme(feedback.type, feedback.severity);
    const colors = colorScheme[feedback.type] || colorScheme.warning;
    const priorityStyle = getPriorityStyle(feedback.priority);
    const isExpanded = expandedItems.has(item.id);

    return (
      <Animated.View
        key={item.id}
        style={[
          styles.feedbackItem,
          compactMode && styles.compactItem,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: priorityStyle.borderWidth,
            shadowOpacity: priorityStyle.shadowOpacity,
            transform: [
              { translateX: item.slideAnim },
              { scale: item.scaleAnim },
            ],
            opacity: item.opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleItemPress(item)}
          style={styles.feedbackContent}
          activeOpacity={0.8}
        >
          {/* Header */}
          <View style={styles.feedbackHeader}>
            <View style={styles.feedbackTitleRow}>
              <Text style={styles.feedbackIcon}>{colors.icon}</Text>
              <Text
                style={[styles.feedbackMessage, { color: colors.text }]}
                numberOfLines={compactMode ? 1 : 2}
              >
                {feedback.message}
              </Text>
            </View>

            {/* Dismiss button */}
            <TouchableOpacity
              onPress={() => handleDismiss(item)}
              style={styles.dismissButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.dismissText, { color: colors.text }]}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body parts indicator */}
          {feedback.bodyParts.length > 0 && !compactMode && (
            <View style={styles.bodyPartsContainer}>
              {feedback.bodyParts.map((part, index) => (
                <View
                  key={index}
                  style={[styles.bodyPartTag, { borderColor: colors.border }]}
                >
                  <Text style={[styles.bodyPartText, { color: colors.text }]}>
                    {part}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Suggestions (expandable) */}
          {showSuggestions && feedback.suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {(isExpanded || compactMode) && (
                <ScrollView
                  style={styles.suggestionsList}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {feedback.suggestions.map((suggestion, index) => (
                    <View key={index} style={styles.suggestionItem}>
                      <Text style={styles.suggestionBullet}>•</Text>
                      <Text
                        style={[styles.suggestionText, { color: colors.text }]}
                      >
                        {suggestion}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              {!compactMode && feedback.suggestions.length > 0 && (
                <Text style={[styles.expandHint, { color: colors.text }]}>
                  {isExpanded
                    ? "Tap to collapse"
                    : `Tap for ${feedback.suggestions.length} tips`}
                </Text>
              )}
            </View>
          )}

          {/* Priority indicator */}
          <View style={styles.priorityIndicator}>
            {Array.from({
              length: Math.min(5, Math.ceil(feedback.priority / 2)),
            }).map((_, i) => (
              <View
                key={i}
                style={[styles.priorityDot, { backgroundColor: colors.border }]}
              />
            ))}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (animatedItems.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, compactMode && styles.compactContainer]}>
      {animatedItems.map(renderFeedbackItem)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  compactContainer: {
    top: 40,
  },
  feedbackItem: {
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
  },
  compactItem: {
    marginBottom: 4,
    borderRadius: 8,
  },
  feedbackContent: {
    padding: 16,
  },
  feedbackHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  feedbackTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  feedbackIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  feedbackMessage: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dismissButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  dismissText: {
    fontSize: 20,
    fontWeight: "bold",
    opacity: 0.7,
  },
  bodyPartsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 4,
  },
  bodyPartTag: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 4,
  },
  bodyPartText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  suggestionsContainer: {
    marginTop: 8,
  },
  suggestionsList: {
    maxHeight: 100,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  suggestionBullet: {
    color: "#FFFFFF",
    fontSize: 14,
    marginRight: 6,
    marginTop: 1,
  },
  suggestionText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
    opacity: 0.9,
  },
  expandHint: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
    opacity: 0.7,
    fontStyle: "italic",
  },
  priorityIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  priorityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
    opacity: 0.6,
  },
});

export default FormFeedbackDisplay;
