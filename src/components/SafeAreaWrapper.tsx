import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: any;
  edges?: ("top" | "bottom" | "left" | "right")[];
}

export const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({
  children,
  style,
  edges = ["top", "bottom", "left", "right"],
}) => {
  return (
    <SafeAreaView style={[styles.container, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
};

// Hook to get safe area insets
export const useSafeArea = () => {
  return useSafeAreaInsets();
};

// Component that adds padding for safe areas
export const SafeAreaPadding: React.FC<SafeAreaWrapperProps> = ({
  children,
  style,
  edges = ["top", "bottom"],
}) => {
  const insets = useSafeAreaInsets();

  const paddingStyle = {
    paddingTop: edges.includes("top") ? insets.top : 0,
    paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
    paddingLeft: edges.includes("left") ? insets.left : 0,
    paddingRight: edges.includes("right") ? insets.right : 0,
  };

  return <View style={[paddingStyle, style]}>{children}</View>;
};

// Provider component to wrap the entire app
export const SafeAreaProviderWrapper: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SafeAreaWrapper;
