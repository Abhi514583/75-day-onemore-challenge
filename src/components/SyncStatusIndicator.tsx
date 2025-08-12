import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from "react-native";
import { COLORS } from "../config/colors";
import useDataSync from "../hooks/useDataSync";
import useNetworkStatus from "../hooks/useNetworkStatus";

interface SyncStatusIndicatorProps {
  style?: any;
  showDetails?: boolean;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  style,
  showDetails = false,
}) => {
  const { syncStats, forceSyncAll, clearFailedOperations } = useDataSync();
  const { isOnline } = useNetworkStatus();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Pulse animation for syncing state
  React.useEffect(() => {
    if (syncStats.isSyncing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [syncStats.isSyncing, pulseAnim]);

  const handleSyncPress = async () => {
    if (!isOnline) {
      Alert.alert(
        "Offline",
        "You need an internet connection to sync your data."
      );
      return;
    }

    if (syncStats.hasFailedSync) {
      Alert.alert(
        "Sync Issues",
        `${syncStats.totalFailed} operations failed to sync. Would you like to retry or clear them?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear Failed", onPress: clearFailedOperations },
          { text: "Retry All", onPress: forceSyncAll },
        ]
      );
    } else if (syncStats.totalPending > 0) {
      await forceSyncAll();
    }
  };

  const getSyncStatus = () => {
    if (!isOnline) {
      return { icon: "📶", text: "Offline", color: COLORS.TEXT.SECONDARY };
    }

    if (syncStats.isSyncing) {
      return { icon: "🔄", text: "Syncing...", color: COLORS.ACCENT.PRIMARY };
    }

    if (syncStats.totalFailed > 0) {
      return {
        icon: "⚠️",
        text: `${syncStats.totalFailed} Failed`,
        color: COLORS.ACCENT.ERROR,
      };
    }

    if (syncStats.totalPending > 0) {
      return {
        icon: "⏳",
        text: `${syncStats.totalPending} Pending`,
        color: COLORS.ACCENT.WARNING,
      };
    }

    return { icon: "✅", text: "Synced", color: COLORS.STATUS.COMPLETED };
  };

  const status = getSyncStatus();

  if (
    !showDetails &&
    syncStats.totalPending === 0 &&
    syncStats.totalFailed === 0
  ) {
    return null; // Hide when everything is synced
  }

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handleSyncPress}
      disabled={syncStats.isSyncing}
    >
      <Animated.View
        style={[
          styles.content,
          { transform: [{ scale: syncStats.isSyncing ? pulseAnim : 1 }] },
        ]}
      >
        <Text style={styles.icon}>{status.icon}</Text>
        <Text style={[styles.text, { color: status.color }]}>
          {status.text}
        </Text>
      </Animated.View>

      {showDetails && (
        <View style={styles.details}>
          <Text style={styles.detailText}>
            Tap to {syncStats.totalPending > 0 ? "sync now" : "retry"}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.UI.CARD_BACKGROUND,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    minWidth: 80,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
  details: {
    marginTop: 4,
  },
  detailText: {
    fontSize: 10,
    color: COLORS.TEXT.TERTIARY,
    textAlign: "center",
  },
});

export default SyncStatusIndicator;
