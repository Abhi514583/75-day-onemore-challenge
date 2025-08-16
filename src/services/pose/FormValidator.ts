import { Pose, LandmarkType } from "./MLKitPoseService";
import { CalibrationData, JointAngles } from "./PoseProcessor";
import { FeedbackManager } from "./FeedbackManager";
import { FormFeedbackMessages } from "./FormFeedbackMessages";
import {
  ExerciseType,
  FormFeedback,
  FormValidationResult,
  JointIssue,
  AlignmentIssue,
  FormSeverity,
  POSE_DETECTION_CONSTANTS,
} from "../../types/pose";

export class FormValidator {
  /**
   * Validate form for any exercise type
   */
  static validateForm(
    pose: Pose,
    exerciseType: ExerciseType,
    calibration?: CalibrationData
  ): FormValidationResult {
    // Calculate joint angles
    const jointAngles = this.calculateJointAngles(pose);

    // Get exercise-specific validation
    const validation = this.getExerciseValidation(
      pose,
      exerciseType,
      jointAngles,
      calibration
    );

    // Calculate overall form score
    const formScore = this.calculateFormScore(
      validation.jointIssues,
      validation.alignmentIssues
    );

    return {
      isValidForm:
        validation.jointIssues.length === 0 &&
        validation.alignmentIssues.length === 0,
      formScore,
      feedback: validation.feedback,
      jointIssues: validation.jointIssues,
      alignmentIssues: validation.alignmentIssues,
    };
  }

  /**
   * Get form feedback with priority handling using FeedbackManager
   */
  static getFormFeedback(
    validationResult: FormValidationResult,
    feedbackManager: FeedbackManager
  ): FormFeedback[] {
    // Add all feedback to the manager for proper prioritization
    feedbackManager.addMultipleFeedback(validationResult.feedback);

    // Return the prioritized feedback
    return feedbackManager.getCurrentFeedback();
  }

  /**
   * Create enhanced feedback using predefined messages
   */
  static createEnhancedFeedback(
    exerciseType: ExerciseType,
    issueType: string,
    customMessage?: string
  ): FormFeedback | null {
    const template = FormFeedbackMessages.getFeedbackMessage(
      exerciseType,
      issueType
    );

    if (!template) {
      return null;
    }

    const feedback = FormFeedbackMessages.createFeedbackFromTemplate(
      exerciseType,
      template
    );

    // Override message if custom one provided
    if (customMessage) {
      feedback.message = customMessage;
    }

    return feedback;
  }

  /**
   * Calculate joint angles for all major joints
   */
  static calculateJointAngles(pose: Pose): JointAngles {
    const getLandmark = (type: LandmarkType) =>
      pose.landmarks.find((l) => l.type === type);

    // Helper function to calculate angle between three points
    const calculateAngle = (p1: any, p2: any, p3: any): number => {
      if (!p1 || !p2 || !p3) return 0;

      const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
      const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

      if (mag1 === 0 || mag2 === 0) return 0;

      const cos = dot / (mag1 * mag2);
      return Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
    };

    // Get landmarks
    const leftShoulder = getLandmark(LandmarkType.LEFT_SHOULDER);
    const leftElbow = getLandmark(LandmarkType.LEFT_ELBOW);
    const leftWrist = getLandmark(LandmarkType.LEFT_WRIST);
    const rightShoulder = getLandmark(LandmarkType.RIGHT_SHOULDER);
    const rightElbow = getLandmark(LandmarkType.RIGHT_ELBOW);
    const rightWrist = getLandmark(LandmarkType.RIGHT_WRIST);

    const leftHip = getLandmark(LandmarkType.LEFT_HIP);
    const leftKnee = getLandmark(LandmarkType.LEFT_KNEE);
    const leftAnkle = getLandmark(LandmarkType.LEFT_ANKLE);
    const rightHip = getLandmark(LandmarkType.RIGHT_HIP);
    const rightKnee = getLandmark(LandmarkType.RIGHT_KNEE);
    const rightAnkle = getLandmark(LandmarkType.RIGHT_ANKLE);

    const nose = getLandmark(LandmarkType.NOSE);

    // Calculate torso angle (relative to vertical)
    const midHip =
      leftHip && rightHip
        ? {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2,
            z: ((leftHip.z || 0) + (rightHip.z || 0)) / 2,
            visibility: Math.min(leftHip.visibility, rightHip.visibility),
            type: LandmarkType.NOSE, // Placeholder
          }
        : null;

    const torsoAngle =
      nose && midHip
        ? Math.abs(
            90 -
              Math.atan2(
                Math.abs(nose.x - midHip.x),
                Math.abs(midHip.y - nose.y)
              ) *
                (180 / Math.PI)
          )
        : 0;

    return {
      leftElbow: calculateAngle(leftShoulder, leftElbow, leftWrist),
      rightElbow: calculateAngle(rightShoulder, rightElbow, rightWrist),
      leftKnee: calculateAngle(leftHip, leftKnee, leftAnkle),
      rightKnee: calculateAngle(rightHip, rightKnee, rightAnkle),
      leftHip: calculateAngle(leftShoulder, leftHip, leftKnee),
      rightHip: calculateAngle(rightShoulder, rightHip, rightKnee),
      leftShoulder: calculateAngle(leftElbow, leftShoulder, leftHip),
      rightShoulder: calculateAngle(rightElbow, rightShoulder, rightHip),
      torsoAngle,
    };
  }

  /**
   * Get exercise-specific validation
   */
  private static getExerciseValidation(
    pose: Pose,
    exerciseType: ExerciseType,
    jointAngles: JointAngles,
    calibration?: CalibrationData
  ): {
    jointIssues: JointIssue[];
    alignmentIssues: AlignmentIssue[];
    feedback: FormFeedback[];
  } {
    switch (exerciseType) {
      case "pushups":
        return this.validatePushUpForm(pose, jointAngles, calibration);
      case "squats":
        return this.validateSquatForm(pose, jointAngles, calibration);
      case "planks":
        return this.validatePlankForm(pose, jointAngles, calibration);
      default:
        return { jointIssues: [], alignmentIssues: [], feedback: [] };
    }
  }

  /**
   * Validate push-up specific form
   */
  private static validatePushUpForm(
    pose: Pose,
    jointAngles: JointAngles,
    calibration?: CalibrationData
  ): {
    jointIssues: JointIssue[];
    alignmentIssues: AlignmentIssue[];
    feedback: FormFeedback[];
  } {
    const jointIssues: JointIssue[] = [];
    const alignmentIssues: AlignmentIssue[] = [];
    const feedback: FormFeedback[] = [];

    // Check elbow angles
    const avgElbow = (jointAngles.leftElbow + jointAngles.rightElbow) / 2;
    if (avgElbow < 45) {
      jointIssues.push({
        joint: "elbow",
        expectedRange: [45, 180],
        actualAngle: avgElbow,
        severity: "high",
        suggestion: "Don't go too low - maintain control",
      });

      const feedbackItem = this.createEnhancedFeedback(
        "pushups",
        "GOING_TOO_LOW"
      );
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    // Check for incomplete range of motion
    if (avgElbow > 160 && avgElbow < 175) {
      const feedbackItem = this.createEnhancedFeedback(
        "pushups",
        "INCOMPLETE_RANGE"
      );
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    // Check body alignment
    const bodyAlignment = this.calculateBodyAlignment(pose);
    if (bodyAlignment.deviation > 15) {
      alignmentIssues.push({
        type: "spine",
        deviation: bodyAlignment.deviation,
        threshold: 15,
        severity: "medium",
        suggestion: "Keep your body in a straight line",
      });

      // Determine if it's sagging or piking
      const hipPosition = this.getHipPosition(pose);
      const issueType = hipPosition === "low" ? "BODY_SAG" : "PIKE_UP";

      const feedbackItem = this.createEnhancedFeedback("pushups", issueType);
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    // Check elbow position (too wide)
    const elbowWidth = this.calculateElbowWidth(pose);
    if (elbowWidth > 60) {
      // degrees from body
      const feedbackItem = this.createEnhancedFeedback(
        "pushups",
        "ELBOW_TOO_WIDE"
      );
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    // Check head position
    const headAlignment = this.checkHeadAlignment(pose);
    if (!headAlignment.isNeutral) {
      const feedbackItem = this.createEnhancedFeedback(
        "pushups",
        "HEAD_POSITION"
      );
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    return { jointIssues, alignmentIssues, feedback };
  }

  /**
   * Validate squat specific form
   */
  private static validateSquatForm(
    pose: Pose,
    jointAngles: JointAngles,
    calibration?: CalibrationData
  ): {
    jointIssues: JointIssue[];
    alignmentIssues: AlignmentIssue[];
    feedback: FormFeedback[];
  } {
    const jointIssues: JointIssue[] = [];
    const alignmentIssues: AlignmentIssue[] = [];
    const feedback: FormFeedback[] = [];

    // Check knee alignment
    const kneeAlignment = this.validateKneeTracking(pose);
    if (!kneeAlignment.isValid) {
      alignmentIssues.push({
        type: "knee",
        deviation: kneeAlignment.deviation,
        threshold: 20,
        severity: "high",
        suggestion: "Keep knees tracking over toes",
      });

      // Determine specific knee issue
      const kneeIssueType = this.determineKneeIssue(pose);
      const feedbackItem = this.createEnhancedFeedback("squats", kneeIssueType);
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    // Check squat depth
    const depth = this.calculateSquatDepth(jointAngles);
    if (depth < 0.6) {
      const feedbackItem = this.createEnhancedFeedback(
        "squats",
        "NOT_DEEP_ENOUGH"
      );
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    // Check forward lean
    const torsoAngle = jointAngles.torsoAngle;
    if (torsoAngle > 30) {
      const feedbackItem = this.createEnhancedFeedback(
        "squats",
        "FORWARD_LEAN"
      );
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    // Check heel position
    const heelPosition = this.checkHeelPosition(pose);
    if (!heelPosition.isGrounded) {
      const feedbackItem = this.createEnhancedFeedback("squats", "HEEL_LIFT");
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    // Check hip level
    const hipLevel = this.checkHipLevel(pose);
    if (!hipLevel.isLevel) {
      const feedbackItem = this.createEnhancedFeedback(
        "squats",
        "UNEVEN_DEPTH"
      );
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    return { jointIssues, alignmentIssues, feedback };
  }

  /**
   * Validate plank specific form
   */
  private static validatePlankForm(
    pose: Pose,
    jointAngles: JointAngles,
    calibration?: CalibrationData
  ): {
    jointIssues: JointIssue[];
    alignmentIssues: AlignmentIssue[];
    feedback: FormFeedback[];
  } {
    const jointIssues: JointIssue[] = [];
    const alignmentIssues: AlignmentIssue[] = [];
    const feedback: FormFeedback[] = [];

    // Check body alignment
    const bodyAlignment = this.calculateBodyAlignment(pose);
    if (bodyAlignment.deviation > 10) {
      alignmentIssues.push({
        type: "spine",
        deviation: bodyAlignment.deviation,
        threshold: 10,
        severity: "medium",
        suggestion: "Maintain straight body line",
      });

      // Determine if hips are too high or too low
      const hipPosition = this.getHipPosition(pose);
      let issueType = "HIP_SAG";
      if (hipPosition === "high") {
        issueType = "HIP_TOO_HIGH";
      }

      const feedbackItem = this.createEnhancedFeedback("planks", issueType);
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    // Check shoulder position
    const shoulderAlignment = this.checkShoulderPosition(pose);
    if (!shoulderAlignment.isAligned) {
      const feedbackItem = this.createEnhancedFeedback(
        "planks",
        "SHOULDER_POSITION"
      );
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    // Check head position
    const headAlignment = this.checkHeadAlignment(pose);
    if (!headAlignment.isNeutral) {
      const feedbackItem = this.createEnhancedFeedback("planks", "HEAD_DROP");
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    // Check elbow flare
    const elbowAlignment = this.checkElbowFlare(pose);
    if (elbowAlignment.isFlared) {
      const feedbackItem = this.createEnhancedFeedback("planks", "ELBOW_FLARE");
      if (feedbackItem) {
        feedback.push(feedbackItem);
      }
    }

    return { jointIssues, alignmentIssues, feedback };
  }

  /**
   * Calculate body alignment for planks and push-ups
   */
  private static calculateBodyAlignment(pose: Pose): {
    deviation: number;
    score: number;
  } {
    const nose = pose.landmarks.find((l) => l.type === LandmarkType.NOSE);
    const leftShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_SHOULDER
    );
    const rightShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_SHOULDER
    );
    const leftHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_HIP
    );
    const rightHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_HIP
    );
    const leftAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_ANKLE
    );
    const rightAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_ANKLE
    );

    if (
      !leftShoulder ||
      !rightShoulder ||
      !leftHip ||
      !rightHip ||
      !leftAnkle ||
      !rightAnkle
    ) {
      return { deviation: 0, score: 0 };
    }

    // Calculate body centers
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };
    const ankleCenter = {
      x: (leftAnkle.x + rightAnkle.x) / 2,
      y: (leftAnkle.y + rightAnkle.y) / 2,
    };

    // Calculate deviation from straight line
    const shoulderToAnkle = {
      x: ankleCenter.x - shoulderCenter.x,
      y: ankleCenter.y - shoulderCenter.y,
    };
    const shoulderToHip = {
      x: hipCenter.x - shoulderCenter.x,
      y: hipCenter.y - shoulderCenter.y,
    };

    const dot =
      shoulderToAnkle.x * shoulderToHip.x + shoulderToAnkle.y * shoulderToHip.y;
    const magAnkle = Math.sqrt(shoulderToAnkle.x ** 2 + shoulderToAnkle.y ** 2);
    const magHip = Math.sqrt(shoulderToHip.x ** 2 + shoulderToHip.y ** 2);

    if (magAnkle === 0 || magHip === 0) return { deviation: 0, score: 0 };

    const cos = dot / (magAnkle * magHip);
    const angle = Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
    const deviation = Math.abs(180 - angle);

    const score = Math.max(0, 100 - (deviation / 15) * 100);

    return { deviation, score };
  }

  /**
   * Validate knee tracking for squats
   */
  private static validateKneeTracking(pose: Pose): {
    isValid: boolean;
    deviation: number;
    score: number;
  } {
    const leftHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_HIP
    );
    const leftKnee = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_KNEE
    );
    const leftAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_ANKLE
    );
    const rightHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_HIP
    );
    const rightKnee = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_KNEE
    );
    const rightAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_ANKLE
    );

    if (
      !leftHip ||
      !leftKnee ||
      !leftAnkle ||
      !rightHip ||
      !rightKnee ||
      !rightAnkle
    ) {
      return { isValid: false, deviation: 0, score: 0 };
    }

    // Check if knees track over toes
    const leftKneeAlignment = Math.abs(leftKnee.x - leftAnkle.x);
    const rightKneeAlignment = Math.abs(rightKnee.x - rightAnkle.x);
    const avgAlignment = (leftKneeAlignment + rightKneeAlignment) / 2;

    // Check knee width relative to hip width
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    const kneeWidth = Math.abs(leftKnee.x - rightKnee.x);
    const kneeWidthRatio = kneeWidth / hipWidth;

    const isValidWidth = kneeWidthRatio >= 0.8 && kneeWidthRatio <= 1.3;
    const isValidAlignment = avgAlignment <= 20;

    const isValid = isValidWidth && isValidAlignment;
    const score = isValid ? 100 : Math.max(0, 100 - (avgAlignment / 20) * 50);

    return { isValid, deviation: avgAlignment, score };
  }

  /**
   * Calculate squat depth
   */
  private static calculateSquatDepth(jointAngles: JointAngles): number {
    const hipRange = 160 - 90; // Up to down range
    const hipDepth = Math.max(
      0,
      Math.min(1, (160 - jointAngles.leftHip) / hipRange)
    );

    const kneeRange = 160 - 90;
    const kneeDepth = Math.max(
      0,
      Math.min(1, (160 - jointAngles.leftKnee) / kneeRange)
    );

    return (hipDepth + kneeDepth) / 2;
  }

  /**
   * Calculate overall form score
   */
  private static calculateFormScore(
    jointIssues: JointIssue[],
    alignmentIssues: AlignmentIssue[]
  ): number {
    let score = 100;

    // Deduct points for joint issues
    jointIssues.forEach((issue) => {
      const deduction = this.getSeverityDeduction(issue.severity);
      score -= deduction;
    });

    // Deduct points for alignment issues
    alignmentIssues.forEach((issue) => {
      const deduction = this.getSeverityDeduction(issue.severity);
      score -= deduction;
    });

    return Math.max(0, score);
  }

  /**
   * Get point deduction based on severity
   */
  private static getSeverityDeduction(severity: FormSeverity): number {
    switch (severity) {
      case "critical":
        return 40;
      case "high":
        return 25;
      case "medium":
        return 15;
      case "low":
        return 5;
      default:
        return 10;
    }
  }

  /**
   * Get hip position relative to body line
   */
  private static getHipPosition(pose: Pose): "high" | "low" | "neutral" {
    const nose = pose.landmarks.find((l) => l.type === LandmarkType.NOSE);
    const leftShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_SHOULDER
    );
    const rightShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_SHOULDER
    );
    const leftHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_HIP
    );
    const rightHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_HIP
    );
    const leftAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_ANKLE
    );
    const rightAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_ANKLE
    );

    if (
      !leftShoulder ||
      !rightShoulder ||
      !leftHip ||
      !rightHip ||
      !leftAnkle ||
      !rightAnkle
    ) {
      return "neutral";
    }

    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };
    const ankleCenter = {
      x: (leftAnkle.x + rightAnkle.x) / 2,
      y: (leftAnkle.y + rightAnkle.y) / 2,
    };

    // Calculate expected hip position on line between shoulders and ankles
    const shoulderToAnkle = {
      x: ankleCenter.x - shoulderCenter.x,
      y: ankleCenter.y - shoulderCenter.y,
    };

    const shoulderToHip = {
      x: hipCenter.x - shoulderCenter.x,
      y: hipCenter.y - shoulderCenter.y,
    };

    // Project hip onto shoulder-ankle line
    const t =
      (shoulderToHip.x * shoulderToAnkle.x +
        shoulderToHip.y * shoulderToAnkle.y) /
      (shoulderToAnkle.x * shoulderToAnkle.x +
        shoulderToAnkle.y * shoulderToAnkle.y);

    const projectedHip = {
      x: shoulderCenter.x + t * shoulderToAnkle.x,
      y: shoulderCenter.y + t * shoulderToAnkle.y,
    };

    const deviation = hipCenter.y - projectedHip.y;

    if (deviation > 10) return "low"; // Hips sagging
    if (deviation < -10) return "high"; // Hips piked up
    return "neutral";
  }

  /**
   * Calculate elbow width angle from body
   */
  private static calculateElbowWidth(pose: Pose): number {
    const leftShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_SHOULDER
    );
    const leftElbow = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_ELBOW
    );
    const rightShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_SHOULDER
    );
    const rightElbow = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_ELBOW
    );
    const leftHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_HIP
    );
    const rightHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_HIP
    );

    if (
      !leftShoulder ||
      !leftElbow ||
      !rightShoulder ||
      !rightElbow ||
      !leftHip ||
      !rightHip
    ) {
      return 0;
    }

    // Calculate body centerline
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };

    // Calculate angle of elbows from body centerline
    const bodyLine = {
      x: hipCenter.x - shoulderCenter.x,
      y: hipCenter.y - shoulderCenter.y,
    };

    const leftElbowVector = {
      x: leftElbow.x - leftShoulder.x,
      y: leftElbow.y - leftShoulder.y,
    };

    const rightElbowVector = {
      x: rightElbow.x - rightShoulder.x,
      y: rightElbow.y - rightShoulder.y,
    };

    // Calculate angles
    const leftAngle = Math.abs(
      Math.atan2(leftElbowVector.x, leftElbowVector.y) * (180 / Math.PI)
    );
    const rightAngle = Math.abs(
      Math.atan2(rightElbowVector.x, rightElbowVector.y) * (180 / Math.PI)
    );

    return (leftAngle + rightAngle) / 2;
  }

  /**
   * Check head alignment
   */
  private static checkHeadAlignment(pose: Pose): {
    isNeutral: boolean;
    deviation: number;
  } {
    const nose = pose.landmarks.find((l) => l.type === LandmarkType.NOSE);
    const leftShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_SHOULDER
    );
    const rightShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_SHOULDER
    );

    if (!nose || !leftShoulder || !rightShoulder) {
      return { isNeutral: true, deviation: 0 };
    }

    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };

    // Calculate head position relative to shoulders
    const headDeviation = Math.abs(nose.y - shoulderCenter.y);
    const isNeutral = headDeviation < 20; // pixels

    return { isNeutral, deviation: headDeviation };
  }

  /**
   * Determine specific knee issue type
   */
  private static determineKneeIssue(pose: Pose): string {
    const leftKnee = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_KNEE
    );
    const rightKnee = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_KNEE
    );
    const leftAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_ANKLE
    );
    const rightAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_ANKLE
    );
    const leftHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_HIP
    );
    const rightHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_HIP
    );

    if (
      !leftKnee ||
      !rightKnee ||
      !leftAnkle ||
      !rightAnkle ||
      !leftHip ||
      !rightHip
    ) {
      return "KNEE_CAVE";
    }

    // Check if knees are caving inward
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    const kneeWidth = Math.abs(leftKnee.x - rightKnee.x);
    const ankleWidth = Math.abs(leftAnkle.x - rightAnkle.x);

    if (kneeWidth < hipWidth * 0.8) {
      return "KNEE_CAVE";
    }

    // Check if knees are too far forward
    const leftKneeForward = leftKnee.y < leftAnkle.y;
    const rightKneeForward = rightKnee.y < rightAnkle.y;

    if (leftKneeForward || rightKneeForward) {
      return "KNEE_FORWARD";
    }

    return "KNEE_CAVE"; // Default
  }

  /**
   * Check heel position
   */
  private static checkHeelPosition(pose: Pose): {
    isGrounded: boolean;
    deviation: number;
  } {
    const leftAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_ANKLE
    );
    const rightAnkle = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_ANKLE
    );
    const leftToe = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_FOOT_INDEX
    );
    const rightToe = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_FOOT_INDEX
    );

    if (!leftAnkle || !rightAnkle || !leftToe || !rightToe) {
      return { isGrounded: true, deviation: 0 };
    }

    // Check if toes are significantly higher than ankles (heel lift)
    const leftHeelLift = leftToe.y - leftAnkle.y;
    const rightHeelLift = rightToe.y - rightAnkle.y;
    const avgHeelLift = (leftHeelLift + rightHeelLift) / 2;

    const isGrounded = avgHeelLift < 15; // pixels
    return { isGrounded, deviation: Math.abs(avgHeelLift) };
  }

  /**
   * Check hip level
   */
  private static checkHipLevel(pose: Pose): {
    isLevel: boolean;
    deviation: number;
  } {
    const leftHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_HIP
    );
    const rightHip = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_HIP
    );

    if (!leftHip || !rightHip) {
      return { isLevel: true, deviation: 0 };
    }

    const hipLevelDifference = Math.abs(leftHip.y - rightHip.y);
    const isLevel = hipLevelDifference < 10; // pixels

    return { isLevel, deviation: hipLevelDifference };
  }

  /**
   * Check shoulder position for planks
   */
  private static checkShoulderPosition(pose: Pose): {
    isAligned: boolean;
    deviation: number;
  } {
    const leftShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_SHOULDER
    );
    const rightShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_SHOULDER
    );
    const leftWrist = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_WRIST
    );
    const rightWrist = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_WRIST
    );

    if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
      return { isAligned: true, deviation: 0 };
    }

    // Calculate shoulder center and wrist center
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const wristCenter = {
      x: (leftWrist.x + rightWrist.x) / 2,
      y: (leftWrist.y + rightWrist.y) / 2,
    };

    // Check if shoulders are directly over wrists
    const horizontalDeviation = Math.abs(shoulderCenter.x - wristCenter.x);
    const isAligned = horizontalDeviation < 20; // pixels

    return { isAligned, deviation: horizontalDeviation };
  }

  /**
   * Check elbow flare for planks
   */
  private static checkElbowFlare(pose: Pose): {
    isFlared: boolean;
    angle: number;
  } {
    const leftShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_SHOULDER
    );
    const leftElbow = pose.landmarks.find(
      (l) => l.type === LandmarkType.LEFT_ELBOW
    );
    const rightShoulder = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_SHOULDER
    );
    const rightElbow = pose.landmarks.find(
      (l) => l.type === LandmarkType.RIGHT_ELBOW
    );

    if (!leftShoulder || !leftElbow || !rightShoulder || !rightElbow) {
      return { isFlared: false, angle: 0 };
    }

    // Calculate elbow angle from body centerline
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const elbowWidth = Math.abs(leftElbow.x - rightElbow.x);

    // Elbows should be close to body, not flared out
    const elbowFlareRatio = elbowWidth / shoulderWidth;
    const isFlared = elbowFlareRatio > 1.3; // Elbows wider than 130% of shoulder width

    return { isFlared, angle: elbowFlareRatio * 100 };
  }

  /**
   * Create safety feedback for dangerous positions
   */
  static createSafetyFeedback(
    exerciseType: ExerciseType,
    issue: string,
    bodyParts: string[]
  ): FormFeedback {
    return {
      type: "error",
      message: `⚠️ ${issue}`,
      bodyParts,
      severity: "critical",
      suggestions: ["Stop and adjust your form", "Focus on proper technique"],
      priority: POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.SAFETY,
      timestamp: Date.now(),
      exerciseType,
    };
  }

  /**
   * Create encouragement feedback for good form
   */
  static createEncouragementFeedback(
    exerciseType: ExerciseType,
    formScore: number
  ): FormFeedback {
    const messages = {
      excellent: [
        "Perfect form! 🔥",
        "Incredible technique!",
        "You're crushing it!",
      ],
      good: ["Great form!", "Keep it up!", "Looking strong!"],
      fair: ["Good effort!", "Focus on form", "You're improving!"],
    };

    let messageType: keyof typeof messages = "fair";
    if (formScore >= POSE_DETECTION_CONSTANTS.FORM_SCORE_THRESHOLDS.EXCELLENT) {
      messageType = "excellent";
    } else if (
      formScore >= POSE_DETECTION_CONSTANTS.FORM_SCORE_THRESHOLDS.GOOD
    ) {
      messageType = "good";
    }

    const randomMessage =
      messages[messageType][
        Math.floor(Math.random() * messages[messageType].length)
      ];

    return {
      type: "encouragement",
      message: randomMessage,
      bodyParts: [],
      severity: "low",
      suggestions: [],
      priority: POSE_DETECTION_CONSTANTS.FEEDBACK_PRIORITIES.ENCOURAGEMENT,
      timestamp: Date.now(),
      exerciseType,
    };
  }
}
