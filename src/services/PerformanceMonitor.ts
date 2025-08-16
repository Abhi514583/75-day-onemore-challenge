import { Platform, Dimensions } from "react-native";
import * as Device from "expo-device";
import { PerformanceMetrics, PoseDetectionSettings } from "../types/pose";

export interface DeviceProfile {
  tier: "high" | "medium" | "low";
  maxFrameRate: number;
  recommendedRenderMode: "full" | "minimal" | "markers-only";
  enablePerformanceMode: boolean;
  memoryLimit: number; // MB
  processingTimeLimit: number; // ms per frame
}

export interface PerformanceThresholds {
  frameRate: {
    excellent: number;
    good: number;
    poor: number;
  };
  processingTime: {
    excellent: number;
    good: number;
    poor: number;
  };
  memoryUsage: {
    warning: number;
    critical: number;
  };
}

export interface PerformanceAdjustment {
  type: "frameRate" | "renderMode" | "quality" | "features";
  action: "reduce" | "increase" | "disable" | "enable";
  value?: any;
  reason: string;
}

export class PerformanceMonitor {
  private frameRateHistory: number[] = [];
  private processingTimeHistory: number[] = [];
  private memoryUsageHistory: number[] = [];
  private lastFrameTime = 0;
  private frameCount = 0;
  private currentMetrics: PerformanceMetrics;
  private deviceProfile: DeviceProfile;
  private adjustmentCallbacks: ((adjustment: PerformanceAdjustment) => void)[] =
    [];

  // Performance tracking
  private readonly HISTORY_SIZE = 30; // Keep last 30 measurements
  private readonly MONITORING_INTERVAL = 1000; // Check every second
  private readonly ADJUSTMENT_COOLDOWN = 5000; // Wait 5s between adjustments
  private lastAdjustmentTime = 0;
  private monitoringTimer?: NodeJS.Timeout;

  // Performance thresholds
  private readonly thresholds: PerformanceThresholds = {
    frameRate: {
      excellent: 28,
      good: 20,
      poor: 12,
    },
    processingTime: {
      excellent: 16, // ~60fps equivalent
      good: 33, // ~30fps equivalent
      poor: 66, // ~15fps equivalent
    },
    memoryUsage: {
      warning: 100, // MB
      critical: 150, // MB
    },
  };

  constructor() {
    this.deviceProfile = this.detectDeviceProfile();
    this.currentMetrics = {
      frameRate: 0,
      processingTime: 0,
      memoryUsage: 0,
      batteryImpact: "low",
      deviceCapability: this.deviceProfile.tier,
    };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.updateMetrics();
      this.checkPerformanceThresholds();
    }, this.MONITORING_INTERVAL);

    console.log("Performance monitoring started");
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    console.log("Performance monitoring stopped");
  }

  /**
   * Record frame processing time
   */
  recordFrameProcessing(processingTime: number): void {
    const now = performance.now();

    // Calculate frame rate
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      const frameRate = 1000 / frameTime;

      this.frameRateHistory.push(frameRate);
      if (this.frameRateHistory.length > this.HISTORY_SIZE) {
        this.frameRateHistory.shift();
      }
    }

    this.lastFrameTime = now;
    this.frameCount++;

    // Record processing time
    this.processingTimeHistory.push(processingTime);
    if (this.processingTimeHistory.length > this.HISTORY_SIZE) {
      this.processingTimeHistory.shift();
    }
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(memoryUsage: number): void {
    this.memoryUsageHistory.push(memoryUsage);
    if (this.memoryUsageHistory.length > this.HISTORY_SIZE) {
      this.memoryUsageHistory.shift();
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Get device profile
   */
  getDeviceProfile(): DeviceProfile {
    return { ...this.deviceProfile };
  }

  /**
   * Add adjustment callback
   */
  onPerformanceAdjustment(
    callback: (adjustment: PerformanceAdjustment) => void
  ): void {
    this.adjustmentCallbacks.push(callback);
  }

  /**
   * Remove adjustment callback
   */
  removePerformanceAdjustment(
    callback: (adjustment: PerformanceAdjustment) => void
  ): void {
    const index = this.adjustmentCallbacks.indexOf(callback);
    if (index >= 0) {
      this.adjustmentCallbacks.splice(index, 1);
    }
  }

  /**
   * Get recommended settings for current device
   */
  getRecommendedSettings(): Partial<PoseDetectionSettings> {
    return {
      targetFrameRate: this.deviceProfile.maxFrameRate,
      renderMode: this.deviceProfile.recommendedRenderMode,
      enablePerformanceMode: this.deviceProfile.enablePerformanceMode,
      reducedQualityThreshold: this.deviceProfile.tier === "low" ? 20 : 15,
      confidenceThreshold: this.deviceProfile.tier === "low" ? 0.5 : 0.6,
    };
  }

  /**
   * Detect device performance profile
   */
  private detectDeviceProfile(): DeviceProfile {
    const { width, height } = Dimensions.get("window");
    const screenSize = width * height;

    // Get device info
    const deviceYear = this.getDeviceYear();
    const isTablet = Device.deviceType === Device.DeviceType.TABLET;
    const platform = Platform.OS;

    // Calculate device tier based on multiple factors
    let score = 0;

    // Screen resolution scoring
    if (screenSize > 2000000) score += 3; // High res
    else if (screenSize > 1000000) score += 2; // Medium res
    else score += 1; // Low res

    // Device age scoring
    if (deviceYear >= 2021) score += 3; // Recent devices
    else if (deviceYear >= 2019) score += 2; // Moderately recent
    else score += 1; // Older devices

    // Platform scoring
    if (platform === "ios") score += 1; // iOS generally performs better

    // Tablet bonus
    if (isTablet) score += 1;

    // Determine tier
    let tier: DeviceProfile["tier"];
    let maxFrameRate: number;
    let recommendedRenderMode: DeviceProfile["recommendedRenderMode"];
    let enablePerformanceMode: boolean;
    let memoryLimit: number;
    let processingTimeLimit: number;

    if (score >= 8) {
      tier = "high";
      maxFrameRate = 30;
      recommendedRenderMode = "full";
      enablePerformanceMode = false;
      memoryLimit = 200;
      processingTimeLimit = 16;
    } else if (score >= 5) {
      tier = "medium";
      maxFrameRate = 24;
      recommendedRenderMode = "minimal";
      enablePerformanceMode = true;
      memoryLimit = 150;
      processingTimeLimit = 33;
    } else {
      tier = "low";
      maxFrameRate = 15;
      recommendedRenderMode = "markers-only";
      enablePerformanceMode = true;
      memoryLimit = 100;
      processingTimeLimit = 66;
    }

    console.log(`Device profile detected: ${tier} (score: ${score})`);

    return {
      tier,
      maxFrameRate,
      recommendedRenderMode,
      enablePerformanceMode,
      memoryLimit,
      processingTimeLimit,
    };
  }

  /**
   * Get approximate device year
   */
  private getDeviceYear(): number {
    // This is a simplified estimation
    // In a real app, you might use a device database
    const currentYear = new Date().getFullYear();

    if (Platform.OS === "ios") {
      // iOS device year estimation based on model
      const model = Device.modelName || "";
      if (model.includes("iPhone 15") || model.includes("iPhone 14"))
        return currentYear;
      if (model.includes("iPhone 13") || model.includes("iPhone 12"))
        return currentYear - 1;
      if (model.includes("iPhone 11") || model.includes("iPhone X"))
        return currentYear - 2;
      return currentYear - 3; // Older devices
    } else {
      // Android estimation (more difficult without specific model info)
      return currentYear - 2; // Conservative estimate
    }
  }

  /**
   * Update current metrics
   */
  private updateMetrics(): void {
    // Calculate averages from history
    const avgFrameRate =
      this.frameRateHistory.length > 0
        ? this.frameRateHistory.reduce((sum, rate) => sum + rate, 0) /
          this.frameRateHistory.length
        : 0;

    const avgProcessingTime =
      this.processingTimeHistory.length > 0
        ? this.processingTimeHistory.reduce((sum, time) => sum + time, 0) /
          this.processingTimeHistory.length
        : 0;

    const avgMemoryUsage =
      this.memoryUsageHistory.length > 0
        ? this.memoryUsageHistory.reduce((sum, mem) => sum + mem, 0) /
          this.memoryUsageHistory.length
        : 0;

    // Determine battery impact
    let batteryImpact: PerformanceMetrics["batteryImpact"] = "low";
    if (avgFrameRate > 25 || avgProcessingTime > 50) {
      batteryImpact = "high";
    } else if (avgFrameRate > 20 || avgProcessingTime > 33) {
      batteryImpact = "medium";
    }

    this.currentMetrics = {
      frameRate: Math.round(avgFrameRate),
      processingTime: Math.round(avgProcessingTime),
      memoryUsage: Math.round(avgMemoryUsage),
      batteryImpact,
      deviceCapability: this.deviceProfile.tier,
    };
  }

  /**
   * Check performance thresholds and trigger adjustments
   */
  private checkPerformanceThresholds(): void {
    const now = Date.now();

    // Respect cooldown period
    if (now - this.lastAdjustmentTime < this.ADJUSTMENT_COOLDOWN) {
      return;
    }

    const metrics = this.currentMetrics;
    const adjustments: PerformanceAdjustment[] = [];

    // Check frame rate
    if (metrics.frameRate < this.thresholds.frameRate.poor) {
      adjustments.push({
        type: "renderMode",
        action: "reduce",
        value: "markers-only",
        reason: `Low frame rate: ${metrics.frameRate}fps`,
      });
    } else if (metrics.frameRate < this.thresholds.frameRate.good) {
      adjustments.push({
        type: "renderMode",
        action: "reduce",
        value: "minimal",
        reason: `Moderate frame rate: ${metrics.frameRate}fps`,
      });
    }

    // Check processing time
    if (metrics.processingTime > this.thresholds.processingTime.poor) {
      adjustments.push({
        type: "quality",
        action: "reduce",
        reason: `High processing time: ${metrics.processingTime}ms`,
      });
    }

    // Check memory usage
    if (metrics.memoryUsage > this.thresholds.memoryUsage.critical) {
      adjustments.push({
        type: "features",
        action: "disable",
        reason: `Critical memory usage: ${metrics.memoryUsage}MB`,
      });
    } else if (metrics.memoryUsage > this.thresholds.memoryUsage.warning) {
      adjustments.push({
        type: "quality",
        action: "reduce",
        reason: `High memory usage: ${metrics.memoryUsage}MB`,
      });
    }

    // Apply adjustments
    if (adjustments.length > 0) {
      this.lastAdjustmentTime = now;
      adjustments.forEach((adjustment) => {
        this.notifyAdjustment(adjustment);
      });
    }
  }

  /**
   * Notify callbacks about performance adjustments
   */
  private notifyAdjustment(adjustment: PerformanceAdjustment): void {
    console.log("Performance adjustment:", adjustment);
    this.adjustmentCallbacks.forEach((callback) => {
      try {
        callback(adjustment);
      } catch (error) {
        console.error("Error in performance adjustment callback:", error);
      }
    });
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.currentMetrics;

    if (metrics.frameRate < this.thresholds.frameRate.good) {
      recommendations.push(
        "Consider reducing visual quality for better performance"
      );
    }

    if (metrics.processingTime > this.thresholds.processingTime.good) {
      recommendations.push("Enable performance mode to optimize processing");
    }

    if (metrics.memoryUsage > this.thresholds.memoryUsage.warning) {
      recommendations.push("Close other apps to free up memory");
    }

    if (metrics.batteryImpact === "high") {
      recommendations.push("Lower frame rate to reduce battery usage");
    }

    if (this.deviceProfile.tier === "low") {
      recommendations.push(
        "Use minimal render mode for better performance on this device"
      );
    }

    return recommendations;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageFrameRate: number;
    averageProcessingTime: number;
    averageMemoryUsage: number;
    frameDrops: number;
    adjustmentCount: number;
    uptime: number;
  } {
    const frameDrops = this.frameRateHistory.filter(
      (rate) => rate < this.thresholds.frameRate.poor
    ).length;

    return {
      averageFrameRate: this.currentMetrics.frameRate,
      averageProcessingTime: this.currentMetrics.processingTime,
      averageMemoryUsage: this.currentMetrics.memoryUsage,
      frameDrops,
      adjustmentCount: 0, // Would need to track this
      uptime:
        this.frameCount > 0
          ? (performance.now() - this.lastFrameTime) / 1000
          : 0,
    };
  }

  /**
   * Reset performance history
   */
  reset(): void {
    this.frameRateHistory = [];
    this.processingTimeHistory = [];
    this.memoryUsageHistory = [];
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.lastAdjustmentTime = 0;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
    this.reset();
    this.adjustmentCallbacks = [];
  }
}
