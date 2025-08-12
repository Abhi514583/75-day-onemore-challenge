import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";
import { SafeAreaWrapper } from "../components/SafeAreaWrapper";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { updateProfile } from "../store/slices/userSlice";
import { updateBaselines } from "../store/slices/challengeSlice";
import { setUsername } from "../store/slices/duelsSlice";

const ProfileTab: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dispatch = useAppDispatch();

  const {
    profile,
    achievements,
    totalChallengesCompleted,
    personalBests,
    xp,
    level,
  } = useAppSelector((state) => state.user);
  const { currentStreak, bestStreak, totalDaysCompleted, baselines } =
    useAppSelector((state) => state.challenge);
  const { omrRating, duelHistory, username } = useAppSelector(
    (state) => state.duels
  );

  const [showEditGoals, setShowEditGoals] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editedBaselines, setEditedBaselines] = useState(baselines);
  const [editedUsername, setEditedUsername] = useState(username);
  const [editedName, setEditedName] = useState(profile?.name || "");

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

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

  const getLongestPlank = (): number => {
    return personalBests?.planks || 0;
  };

  const getBiggestRepSet = (): number => {
    const repPBs = [
      personalBests?.pushups || 0,
      personalBests?.squats || 0,
      personalBests?.situps || 0,
    ];
    return Math.max(...repPBs);
  };

  const handleSaveGoals = () => {
    dispatch(updateBaselines(editedBaselines));
    setShowEditGoals(false);
    Alert.alert(
      "Goals Updated!",
      "Your new baselines will apply to future challenge days."
    );
  };

  const handleSaveProfile = () => {
    dispatch(updateProfile({ name: editedName }));
    dispatch(setUsername(editedUsername));
    setShowEditProfile(false);
    Alert.alert("Profile Updated!", "Your profile information has been saved.");
  };

  const rungs = [7, 14, 21, 30, 45, 60];
  const unlockedRungs = rungs.filter((rung) => currentStreak >= rung);
  const currentRung = unlockedRungs[unlockedRungs.length - 1] || 0;

  return (
    <SafeAreaWrapper>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Your fitness journey</Text>
          </View>

          {/* Profile Card */}
          <View style={styles.section}>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile?.name || username || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.profileName}>
                {profile?.name || username}
              </Text>
              <Text style={styles.profileLevel}>Level {level}</Text>
              <View style={styles.omrBadge}>
                <Text style={styles.omrText}>OMR: {getGlobalOMR()}</Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowEditProfile(true)}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Personal Bests Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Personal Bests</Text>
            <View style={styles.pbSummaryGrid}>
              <View style={styles.pbSummaryCard}>
                <Text style={styles.pbSummaryEmoji}>💪</Text>
                <Text style={styles.pbSummaryValue}>
                  {personalBests?.pushups || 0}
                </Text>
                <Text style={styles.pbSummaryLabel}>Push-ups</Text>
              </View>
              <View style={styles.pbSummaryCard}>
                <Text style={styles.pbSummaryEmoji}>🦵</Text>
                <Text style={styles.pbSummaryValue}>
                  {personalBests?.squats || 0}
                </Text>
                <Text style={styles.pbSummaryLabel}>Squats</Text>
              </View>
              <View style={styles.pbSummaryCard}>
                <Text style={styles.pbSummaryEmoji}>🔥</Text>
                <Text style={styles.pbSummaryValue}>
                  {personalBests?.situps || 0}
                </Text>
                <Text style={styles.pbSummaryLabel}>Sit-ups</Text>
              </View>
              <View style={styles.pbSummaryCard}>
                <Text style={styles.pbSummaryEmoji}>⏱️</Text>
                <Text style={styles.pbSummaryValue}>
                  {personalBests?.planks || 0}s
                </Text>
                <Text style={styles.pbSummaryLabel}>Plank</Text>
              </View>
            </View>
          </View>

          {/* Lifetime Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Lifetime Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalDaysCompleted}</Text>
                <Text style={styles.statLabel}>Total Attempts</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {getTotalWins()}-{getTotalLosses()}
                </Text>
                <Text style={styles.statLabel}>Duel Record</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statValue}>{getLongestPlank()}s</Text>
                <Text style={styles.statLabel}>Longest Plank</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statValue}>{getBiggestRepSet()}</Text>
                <Text style={styles.statLabel}>Biggest Rep Set</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statValue}>{currentStreak}</Text>
                <Text style={styles.statLabel}>Current Streak</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statValue}>{bestStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
            </View>
          </View>

          {/* Badges */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏅 Badges</Text>

            {/* Streak Rungs */}
            <View style={styles.badgeCategory}>
              <Text style={styles.badgeCategoryTitle}>Streak Rungs</Text>
              <View style={styles.badgeGrid}>
                {rungs.map((rung) => (
                  <View
                    key={rung}
                    style={[
                      styles.badge,
                      currentStreak >= rung && styles.unlockedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        currentStreak >= rung && styles.unlockedBadgeText,
                      ]}
                    >
                      {rung}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.badgeProgress}>
                Current: {currentRung} days
              </Text>
            </View>

            {/* Seasonal Badges */}
            <View style={styles.badgeCategory}>
              <Text style={styles.badgeCategoryTitle}>
                Seasonal (Coming Soon)
              </Text>
              <View style={styles.lockedBadges}>
                <Text style={styles.lockedText}>
                  🥇 Top 1% • 🥈 Top 10% • 🥉 Top 25%
                </Text>
              </View>
            </View>

            {/* Form Badges */}
            <View style={styles.badgeCategory}>
              <Text style={styles.badgeCategoryTitle}>
                Form Quality (AI Required)
              </Text>
              <View style={styles.lockedBadges}>
                <Text style={styles.lockedText}>
                  🎯 Perfect Form • ⚡ Speed Demon • 💎 Consistency
                </Text>
              </View>
            </View>
          </View>

          {/* Edit Goals */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎯 Current Goals</Text>
              <TouchableOpacity
                style={styles.editGoalsButton}
                onPress={() => setShowEditGoals(true)}
              >
                <Text style={styles.editGoalsButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.goalsGrid}>
              <View style={styles.goalCard}>
                <Text style={styles.goalEmoji}>💪</Text>
                <Text style={styles.goalValue}>{baselines.pushups}</Text>
                <Text style={styles.goalLabel}>Push-ups</Text>
              </View>
              <View style={styles.goalCard}>
                <Text style={styles.goalEmoji}>🦵</Text>
                <Text style={styles.goalValue}>{baselines.squats}</Text>
                <Text style={styles.goalLabel}>Squats</Text>
              </View>
              <View style={styles.goalCard}>
                <Text style={styles.goalEmoji}>🔥</Text>
                <Text style={styles.goalValue}>{baselines.situps}</Text>
                <Text style={styles.goalLabel}>Sit-ups</Text>
              </View>
              <View style={styles.goalCard}>
                <Text style={styles.goalEmoji}>⏱️</Text>
                <Text style={styles.goalValue}>{baselines.planks}s</Text>
                <Text style={styles.goalLabel}>Plank</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Edit Goals Modal */}
        <Modal
          visible={showEditGoals}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <LinearGradient
            colors={COLORS.BACKGROUND.PRIMARY}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditGoals(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Goals</Text>
              <TouchableOpacity onPress={handleSaveGoals}>
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                These baselines will apply to future challenge days
              </Text>

              {Object.entries(editedBaselines).map(([key, value]) => (
                <View key={key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {key === "pushups"
                      ? "💪 Push-ups"
                      : key === "squats"
                      ? "🦵 Squats"
                      : key === "situps"
                      ? "🔥 Sit-ups"
                      : "⏱️ Plank (seconds)"}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={value.toString()}
                    onChangeText={(text) =>
                      setEditedBaselines({
                        ...editedBaselines,
                        [key]: parseInt(text) || 0,
                      })
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={COLORS.TEXT.MUTED}
                  />
                </View>
              ))}
            </ScrollView>
          </LinearGradient>
        </Modal>

        {/* Edit Profile Modal */}
        <Modal
          visible={showEditProfile}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <LinearGradient
            colors={COLORS.BACKGROUND.PRIMARY}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleSaveProfile}>
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Enter your name"
                  placeholderTextColor={COLORS.TEXT.MUTED}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username (for duels)</Text>
                <TextInput
                  style={styles.input}
                  value={editedUsername}
                  onChangeText={setEditedUsername}
                  placeholder="Enter username"
                  placeholderTextColor={COLORS.TEXT.MUTED}
                />
              </View>
            </ScrollView>
          </LinearGradient>
        </Modal>
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
    paddingBottom: 100,
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
  },
  profileCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.ACCENT.PRIMARY,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.TEXT.PRIMARY,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  profileLevel: {
    fontSize: 16,
    color: COLORS.TEXT.TERTIARY,
    marginBottom: 8,
  },
  omrBadge: {
    backgroundColor: COLORS.ACCENT.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  omrText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
  },
  editButton: {
    backgroundColor: COLORS.UI.BUTTON_PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.UI.BUTTON_BORDER,
  },
  editButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  pbSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  pbSummaryCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  pbSummaryEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  pbSummaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.ACCENT.PRIMARY,
    marginBottom: 4,
  },
  pbSummaryLabel: {
    fontSize: 12,
    color: COLORS.TEXT.MUTED,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.ACCENT.PRIMARY,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.TEXT.MUTED,
    textAlign: "center",
  },
  badgeCategory: {
    marginBottom: 20,
  },
  badgeCategoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 12,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.UI.BUTTON_SECONDARY,
    borderWidth: 2,
    borderColor: COLORS.UI.BUTTON_BORDER,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  unlockedBadge: {
    backgroundColor: COLORS.STATUS.COMPLETED,
    borderColor: COLORS.ACCENT.PRIMARY,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.TEXT.MUTED,
  },
  unlockedBadgeText: {
    color: COLORS.TEXT.PRIMARY,
  },
  badgeProgress: {
    fontSize: 12,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "center",
  },
  lockedBadges: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  lockedText: {
    fontSize: 14,
    color: COLORS.TEXT.MUTED,
    textAlign: "center",
  },
  editGoalsButton: {
    backgroundColor: COLORS.ACCENT.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editGoalsButtonText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  goalCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "48%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  goalEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  goalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.ACCENT.PRIMARY,
    marginBottom: 4,
  },
  goalLabel: {
    fontSize: 12,
    color: COLORS.TEXT.MUTED,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.TEXT.TERTIARY,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.ACCENT.PRIMARY,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "center",
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.CARD_BORDER,
  },
});

export default ProfileTab;
