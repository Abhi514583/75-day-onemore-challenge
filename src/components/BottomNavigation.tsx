import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { COLORS } from "../config/colors";

export type TabType = "challenge" | "duels" | "profile" | "settings";

interface BottomNavigationProps {
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
}

interface TabItem {
  id: TabType;
  label: string;
  icon: string;
}

const tabs: TabItem[] = [
  { id: "challenge", label: "Challenge", icon: "🏋️" },
  { id: "duels", label: "Duels & PB", icon: "⚔️" },
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabPress,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabItem,
              activeTab === tab.id && styles.activeTabItem,
            ]}
            onPress={() => onTabPress(tab.id)}
          >
            <Text
              style={[
                styles.tabIcon,
                activeTab === tab.id && styles.activeTabIcon,
              ]}
            >
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.BACKGROUND.SECONDARY[0],
    borderTopWidth: 1,
    borderTopColor: COLORS.BACKGROUND.CARD_BORDER,
  },
  tabBar: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  activeTabItem: {
    backgroundColor: COLORS.BACKGROUND.CARD,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  activeTabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.TEXT.MUTED,
    fontWeight: "500",
    textAlign: "center",
  },
  activeTabLabel: {
    color: COLORS.ACCENT.PRIMARY,
    fontWeight: "600",
  },
});

export default BottomNavigation;
