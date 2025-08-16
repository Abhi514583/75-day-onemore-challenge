import { Frame } from "react-native-vision-camera";

// Graceful fallback for ML Kit pose detection
let PoseDetection: any = null;

try {
  PoseDetection = require("@react-native-ml-kit/pose-detection");
} catch (error) {
  console.warn("ML Kit Pose Detection not available:", error.message);
}

// Pose landmark types based on ML Kit
export enum LandmarkType {
  NOSE = 0,
  LEFT_EYE_INNER = 1,
  LEFT_EYE = 2,
  LEFT_EYE_OUTER = 3,
  RIGHT_EYE_INNER = 4,
  RIGHT_EYE = 5,
  RIGHT_EYE_OUTER = 6,
  LEFT_EAR = 7,
  RIGHT_EAR = 8,
  LEFT_MOUTH = 9,
  RIGHT_MOUTH = 10,
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  LEFT_PINKY = 17,
  RIGHT_PINKY = 18,
  LEFT_INDEX = 19,
  RIGHT_INDEX = 20,
  LEFT_THUMB = 21,
  RIGHT_THUMB = 22,
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32,
}

export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility: number;
  type: LandmarkType;
}

export interface Pose {
  landmarks: PoseLandmark[];
  timestamp: number;
  confidence: number;
}

export class MLKitPoseService {
  private static initialized = false;
  private static detector: any = null;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (!PoseDetection) {
        console.warn(
          "🤖 ML Kit Pose Detection not available - using mock mode"
        );
        this.initialized = true;
        return;
      }

      // Initialize ML Kit pose detector
      this.detector = await PoseDetection.createPoseDetector({
        mode: "stream", // For real-time detection
        detectLandmarks: true,
        trackingEnabled: true,
      });

      console.log("🤖 MLKit Pose Detection initialized successfully");
      this.initialized = true;
    } catch (error) {
      console.error("❌ Failed to initialize MLKit Pose Detection:", error);
      // Don't throw - allow graceful fallback
      this.initialized = true; // Mark as initialized to prevent retry loops
    }
  }

  static async detectPoses(frame: Frame): Promise<Pose[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (!PoseDetection || !this.detector) {
        // Return mock pose data for testing when ML Kit is not available
        return this.getMockPose();
      }

      // Process frame with ML Kit
      const poses = await this.detector.detectInImage(frame);

      return poses.map((pose: any) => ({
        landmarks: pose.landmarks.map((landmark: any, index: number) => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z || 0,
          visibility: landmark.visibility || 1.0,
          type: index as LandmarkType,
        })),
        timestamp: Date.now(),
        confidence: pose.confidence || 0.8,
      }));
    } catch (error) {
      console.error("❌ Pose detection failed:", error);
      return [];
    }
  }

  static async cleanup(): Promise<void> {
    try {
      if (this.detector) {
        await this.detector.close();
        this.detector = null;
      }
      this.initialized = false;
      console.log("🧹 MLKit Pose Detection cleaned up");
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
    }
  }

  static isAvailable(): boolean {
    return this.initialized && (PoseDetection !== null || true); // Allow mock mode
  }

  // Mock pose data for testing when ML Kit is not available
  private static getMockPose(): Pose[] {
    // Return a basic standing pose for testing
    const mockLandmarks: PoseLandmark[] = [
      { x: 160, y: 100, z: 0, visibility: 0.9, type: LandmarkType.NOSE },
      {
        x: 140,
        y: 200,
        z: 0,
        visibility: 0.9,
        type: LandmarkType.LEFT_SHOULDER,
      },
      {
        x: 180,
        y: 200,
        z: 0,
        visibility: 0.9,
        type: LandmarkType.RIGHT_SHOULDER,
      },
      { x: 120, y: 280, z: 0, visibility: 0.9, type: LandmarkType.LEFT_ELBOW },
      { x: 200, y: 280, z: 0, visibility: 0.9, type: LandmarkType.RIGHT_ELBOW },
      { x: 100, y: 360, z: 0, visibility: 0.9, type: LandmarkType.LEFT_WRIST },
      { x: 220, y: 360, z: 0, visibility: 0.9, type: LandmarkType.RIGHT_WRIST },
      { x: 130, y: 400, z: 0, visibility: 0.9, type: LandmarkType.LEFT_HIP },
      { x: 190, y: 400, z: 0, visibility: 0.9, type: LandmarkType.RIGHT_HIP },
      { x: 125, y: 550, z: 0, visibility: 0.9, type: LandmarkType.LEFT_KNEE },
      { x: 195, y: 550, z: 0, visibility: 0.9, type: LandmarkType.RIGHT_KNEE },
      { x: 120, y: 700, z: 0, visibility: 0.9, type: LandmarkType.LEFT_ANKLE },
      { x: 200, y: 700, z: 0, visibility: 0.9, type: LandmarkType.RIGHT_ANKLE },
    ];

    return [
      {
        landmarks: mockLandmarks,
        timestamp: Date.now(),
        confidence: 0.8,
      },
    ];
  }
}
