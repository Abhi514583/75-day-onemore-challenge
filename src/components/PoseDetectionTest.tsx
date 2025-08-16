import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { MLKitPoseService, Pose } from "../services/pose/MLKitPoseService";
import {
  PoseProcessor,
  ProcessedPoseData,
} from "../services/pose/PoseProcessor";

export const PoseDetectionTest: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test 1: Initialize MLKitPoseService
  const testInitialization = async () => {
    setIsLoading(true);
    addResult("🧪 Testing MLKitPoseService initialization...");

    try {
      await MLKitPoseService.initialize();
      const isAvailable = MLKitPoseService.isAvailable();

      if (isAvailable) {
        setIsInitialized(true);
        addResult("✅ MLKitPoseService initialized successfully");
      } else {
        addResult(
          "⚠️ MLKitPoseService initialized but not available (mock mode)"
        );
      }
    } catch (error) {
      addResult(`❌ Initialization failed: ${error}`);
    }

    setIsLoading(false);
  };

  // Test 2: Test pose detection with mock data
  const testPoseDetection = async () => {
    setIsLoading(true);
    addResult("🧪 Testing pose detection...");

    try {
      // Since we don't have a real camera frame, we'll test with mock data
      const mockPoses = await MLKitPoseService.detectPoses(null as any);

      if (mockPoses && mockPoses.length > 0) {
        addResult(`✅ Pose detection returned ${mockPoses.length} pose(s)`);
        addResult(`📊 First pose confidence: ${mockPoses[0].confidence}`);
        addResult(`📍 Landmarks detected: ${mockPoses[0].landmarks.length}`);

        // Test some landmark details
        const nose = mockPoses[0].landmarks.find((l) => l.type === 0); // NOSE
        if (nose) {
          addResult(
            `👃 Nose landmark: x=${nose.x}, y=${nose.y}, visibility=${nose.visibility}`
          );
        }
      } else {
        addResult("⚠️ No poses detected");
      }
    } catch (error) {
      addResult(`❌ Pose detection failed: ${error}`);
    }

    setIsLoading(false);
  };

  // Test 3: Test PoseProcessor
  const testPoseProcessor = async () => {
    setIsLoading(true);
    addResult("🧪 Testing PoseProcessor...");

    try {
      // Get mock poses first
      const mockPoses = await MLKitPoseService.detectPoses(null as any);

      if (mockPoses && mockPoses.length > 0) {
        // Test processFrame
        const processedData = PoseProcessor.processFrame(mockPoses, "pushups");

        if (processedData) {
          addResult("✅ PoseProcessor.processFrame successful");
          addResult(`📊 Pose valid: ${processedData.isValid}`);
          addResult(`🎯 Confidence: ${processedData.confidence.toFixed(2)}`);
          addResult(
            `💪 Left elbow angle: ${processedData.jointAngles.leftElbow.toFixed(
              1
            )}°`
          );
          addResult(
            `💪 Right elbow angle: ${processedData.jointAngles.rightElbow.toFixed(
              1
            )}°`
          );
          addResult(
            `📐 Torso angle: ${processedData.jointAngles.torsoAngle.toFixed(
              1
            )}°`
          );
          addResult(
            `⚖️ Shoulder level diff: ${processedData.bodyAlignment.shoulderLevel.toFixed(
              1
            )}px`
          );
        } else {
          addResult("⚠️ PoseProcessor returned null");
        }
      } else {
        addResult("❌ No poses available for processing");
      }
    } catch (error) {
      addResult(`❌ PoseProcessor test failed: ${error}`);
    }

    setIsLoading(false);
  };

  // Test 4: Test calibration
  const testCalibration = async () => {
    setIsLoading(true);
    addResult("🧪 Testing calibration system...");

    try {
      // Get mock poses
      const mockPoses = await MLKitPoseService.detectPoses(null as any);

      if (mockPoses && mockPoses.length > 0) {
        // Test calibration
        const calibrationData = await PoseProcessor.calibrate(
          mockPoses,
          "pushups"
        );

        if (calibrationData) {
          addResult("✅ Calibration data created");
          addResult(
            `📏 Estimated height: ${calibrationData.userHeight.toFixed(1)}cm`
          );
          addResult(
            `📐 Camera angle: ${calibrationData.cameraAngle.toFixed(1)}°`
          );
          addResult(
            `⏰ Timestamp: ${new Date(
              calibrationData.timestamp
            ).toLocaleTimeString()}`
          );

          // Test saving calibration
          await PoseProcessor.saveCalibration(calibrationData);
          addResult("✅ Calibration saved to storage");

          // Test loading calibration
          const loadedCalibration = await PoseProcessor.loadCalibration(
            "pushups"
          );
          if (loadedCalibration) {
            addResult("✅ Calibration loaded from storage");
            addResult(
              `📊 Loaded height: ${loadedCalibration.userHeight.toFixed(1)}cm`
            );
          } else {
            addResult("❌ Failed to load calibration");
          }
        } else {
          addResult("❌ Calibration failed");
        }
      }
    } catch (error) {
      addResult(`❌ Calibration test failed: ${error}`);
    }

    setIsLoading(false);
  };

  // Test 5: Test cleanup
  const testCleanup = async () => {
    setIsLoading(true);
    addResult("🧪 Testing cleanup...");

    try {
      await MLKitPoseService.cleanup();
      const isAvailable = MLKitPoseService.isAvailable();

      if (!isAvailable) {
        setIsInitialized(false);
        addResult("✅ MLKitPoseService cleaned up successfully");
      } else {
        addResult("⚠️ Service still available after cleanup");
      }
    } catch (error) {
      addResult(`❌ Cleanup failed: ${error}`);
    }

    setIsLoading(false);
  };

  // Run all tests
  const runAllTests = async () => {
    clearResults();
    addResult("🚀 Starting comprehensive pose detection tests...");

    await testInitialization();
    await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay

    await testPoseDetection();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testPoseProcessor();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testCalibration();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await testCleanup();

    addResult("🏁 All tests completed!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pose Detection Test Suite</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runAllTests}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Running Tests..." : "Run All Tests"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={clearResults}
          disabled={isLoading}
        >
          <Text style={styles.buttonTextSecondary}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.individualTests}>
        <Text style={styles.sectionTitle}>Individual Tests:</Text>

        <TouchableOpacity
          style={styles.smallButton}
          onPress={testInitialization}
          disabled={isLoading}
        >
          <Text style={styles.smallButtonText}>1. Initialize</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.smallButton}
          onPress={testPoseDetection}
          disabled={isLoading || !isInitialized}
        >
          <Text style={styles.smallButtonText}>2. Detect Poses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.smallButton}
          onPress={testPoseProcessor}
          disabled={isLoading || !isInitialized}
        >
          <Text style={styles.smallButtonText}>3. Process Poses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.smallButton}
          onPress={testCalibration}
          disabled={isLoading || !isInitialized}
        >
          <Text style={styles.smallButtonText}>4. Calibration</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.smallButton}
          onPress={testCleanup}
          disabled={isLoading || !isInitialized}
        >
          <Text style={styles.smallButtonText}>5. Cleanup</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: "#667eea",
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    borderWidth: 1,
    borderColor: "#cbd5e0",
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonTextSecondary: {
    color: "#4a5568",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
  individualTests: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  smallButton: {
    backgroundColor: "#a0aec0",
    padding: 10,
    borderRadius: 6,
    marginBottom: 5,
  },
  smallButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "500",
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: "#1a202c",
    borderRadius: 8,
    padding: 15,
  },
  resultsTitle: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  resultText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: 2,
    lineHeight: 16,
  },
});
