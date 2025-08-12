import { useState, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { syncService } from "../services/SyncService";

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  isWifiEnabled?: boolean;
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: "unknown",
  });

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const status: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
        isWifiEnabled: state.isWifiEnabled,
      };

      setNetworkStatus(status);

      // Update sync service with online status
      syncService.setOnlineStatus(
        status.isConnected && status.isInternetReachable
      );
    });

    // Get initial network state
    NetInfo.fetch().then((state) => {
      const status: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
        isWifiEnabled: state.isWifiEnabled,
      };

      setNetworkStatus(status);
      syncService.setOnlineStatus(
        status.isConnected && status.isInternetReachable
      );
    });

    return unsubscribe;
  }, []);

  return {
    ...networkStatus,
    isOnline: networkStatus.isConnected && networkStatus.isInternetReachable,
  };
};

export default useNetworkStatus;
