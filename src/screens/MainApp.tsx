import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { COLORS } from "../config/colors";
import BottomNavigation, { TabType } from "../components/BottomNavigation";
import ChallengeTab from "./ChallengeTab";
import DuelsTab from "./DuelsTab";
import ProfileTab from "./ProfileTab";
import SettingsTab from "./SettingsTab";

interface MainAppProps {
  onStartSession: (exerciseType: string) => void;
  onStartAttempt: (exerciseType: string, isPB: boolean) => void;
}

const ACTIVE_TAB_KEY = "activeTab";

const MainApp: React.FC<MainAppProps> = ({
  onStartSession,
  onStartAttempt,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("challenge");

  // Load persisted tab state
  useEffect(() => {
    const loadActiveTab = async () => {
      try {
        const savedTab = await AsyncStorage.getItem(ACTIVE_TAB_KEY);
        if (
          savedTab &&
          ["challenge", "duels", "profile", "settings"].includes(savedTab)
        ) {
          setActiveTab(savedTab as TabType);
        }
      } catch (error) {
        console.log("Failed to load active tab:", error);
      }
    };
    loadActiveTab();
  }, []);

  // Persist tab state
  const handleTabPress = async (tab: TabType) => {
    setActiveTab(tab);
    try {
      await AsyncStorage.setItem(ACTIVE_TAB_KEY, tab);
    } catch (error) {
      console.log("Failed to save active tab:", error);
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "challenge":
        return <ChallengeTab onStartSession={onStartSession} />;
      case "duels":
        return <DuelsTab onStartAttempt={onStartAttempt} />;
      case "profile":
        return <ProfileTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <ChallengeTab onStartSession={onStartSession} />;
    }
  };

  return (
    <LinearGradient
      colors={COLORS.BACKGROUND.PRIMARY}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <StatusBar style="light" />
      <View style={styles.content}>{renderActiveTab()}</View>
      <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default MainApp;
