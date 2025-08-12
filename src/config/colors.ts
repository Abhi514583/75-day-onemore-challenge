/**
 * Batman-inspired Color Palette
 * Dark, greyish to whitish aesthetic
 */

export const COLORS = {
  // Primary Background Gradients
  BACKGROUND: {
    PRIMARY: ["#1a1a1a", "#2d2d2d", "#404040"], // Dark to medium grey
    SECONDARY: ["#0f0f0f", "#1a1a1a", "#2d2d2d"], // Very dark to dark grey
    CARD: "rgba(255, 255, 255, 0.08)", // Subtle white overlay
    CARD_BORDER: "rgba(255, 255, 255, 0.12)",
  },

  // Text Colors
  TEXT: {
    PRIMARY: "#ffffff", // Pure white
    SECONDARY: "rgba(255, 255, 255, 0.85)", // Slightly transparent white
    TERTIARY: "rgba(255, 255, 255, 0.65)", // More transparent white
    MUTED: "rgba(255, 255, 255, 0.45)", // Very muted white
    ACCENT: "#f0f0f0", // Off-white for emphasis
  },

  // Accent Colors (Batman-inspired)
  ACCENT: {
    PRIMARY: "#ffd700", // Gold (Batman's utility belt)
    SECONDARY: "#c0c0c0", // Silver
    WARNING: "#ff6b35", // Orange-red
    SUCCESS: "#4a90e2", // Steel blue
    ERROR: "#dc3545", // Red
  },

  // UI Elements
  UI: {
    BUTTON_PRIMARY: "rgba(255, 255, 255, 0.15)",
    BUTTON_SECONDARY: "rgba(255, 255, 255, 0.08)",
    BUTTON_BORDER: "rgba(255, 255, 255, 0.2)",
    INPUT_BACKGROUND: "rgba(255, 255, 255, 0.05)",
    INPUT_BORDER: "rgba(255, 255, 255, 0.15)",
    BORDER: "rgba(255, 255, 255, 0.15)",
    CARD_BACKGROUND: "rgba(255, 255, 255, 0.08)",
    DIVIDER: "rgba(255, 255, 255, 0.1)",
    SHADOW: "rgba(0, 0, 0, 0.5)",
  },

  // Status Colors
  STATUS: {
    COMPLETED: "#4a90e2", // Steel blue
    PENDING: "rgba(255, 255, 255, 0.6)",
    PROGRESS: "#ffd700", // Gold
    STREAK: "#c0c0c0", // Silver
  },

  // Special Effects
  EFFECTS: {
    GLOW: "rgba(255, 215, 0, 0.3)", // Gold glow
    HIGHLIGHT: "rgba(255, 255, 255, 0.1)",
    OVERLAY: "rgba(0, 0, 0, 0.7)",
  },
};

// Helper functions for dynamic colors
export const getProgressColor = (percentage: number): string => {
  if (percentage >= 100) return COLORS.STATUS.COMPLETED;
  if (percentage >= 75) return COLORS.ACCENT.PRIMARY;
  if (percentage >= 50) return COLORS.ACCENT.SECONDARY;
  return COLORS.STATUS.PENDING;
};

export const getMilestoneColor = (day: number): string => {
  if (day >= 100) return COLORS.ACCENT.PRIMARY;
  if (day >= 75) return COLORS.ACCENT.SECONDARY;
  if (day >= 30) return COLORS.STATUS.COMPLETED;
  return COLORS.STATUS.PENDING;
};

export default COLORS;
