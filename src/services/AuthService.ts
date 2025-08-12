import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  AuthCredential,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { User } from "../types/firebase";
import {
  getDefaultOMRRatings,
  getDefaultLevels,
  getDefaultBaselines,
  getCurrentTimestamp,
} from "../utils/firebase";

export interface AuthResult {
  success: boolean;
  user?: FirebaseUser;
  error?: string;
}

export interface UserProfile extends Omit<User, "createdAt" | "updatedAt"> {
  uid: string;
  email?: string;
}

class AuthService {
  private currentUser: FirebaseUser | null = null;
  private authStateListeners: ((user: FirebaseUser | null) => void)[] = [];

  constructor() {
    // Set up auth state listener
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.authStateListeners.forEach((listener) => listener(user));
    });
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return {
        success: true,
        user: userCredential.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  /**
   * Create account with email and password
   */
  async createAccountWithEmail(
    email: string,
    password: string,
    username: string
  ): Promise<AuthResult> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName: username });

      // Create user profile in Firestore
      await this.createUserProfile(user.uid, {
        username,
        email,
        avatarUrl: user.photoURL || "",
      });

      return {
        success: true,
        user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  /**
   * Sign in with Google (placeholder for future implementation)
   */
  async signInWithGoogle(): Promise<AuthResult> {
    // TODO: Implement Google Sign-In
    // This requires additional setup with Google OAuth and expo-auth-session
    return {
      success: false,
      error: "Google Sign-In not implemented yet",
    };
  }

  /**
   * Sign in with Apple (placeholder for future implementation)
   */
  async signInWithApple(): Promise<AuthResult> {
    // TODO: Implement Apple Sign-In
    // This requires additional setup with Apple Sign-In and expo-apple-authentication
    return {
      success: false,
      error: "Apple Sign-In not implemented yet",
    };
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<AuthResult> {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string): Promise<AuthResult> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): FirebaseUser | null {
    return this.currentUser;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUser?.uid || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: FirebaseUser | null) => void): () => void {
    this.authStateListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates: Partial<UserProfile>): Promise<AuthResult> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: "User not authenticated" };
      }

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // Update Firebase Auth profile if display name changed
      if (updates.username && this.currentUser) {
        await updateProfile(this.currentUser, {
          displayName: updates.username,
        });
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  /**
   * Get user profile from Firestore
   */
  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    try {
      const uid = userId || this.getCurrentUserId();
      if (!uid) return null;

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return {
          uid,
          ...userSnap.data(),
        } as UserProfile;
      }

      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<AuthResult> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId || !this.currentUser) {
        return { success: false, error: "User not authenticated" };
      }

      // Delete user data from Firestore
      await this.deleteUserData(userId);

      // Delete Firebase Auth account
      await deleteUser(this.currentUser);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  /**
   * Create user profile in Firestore
   */
  private async createUserProfile(
    uid: string,
    profileData: {
      username: string;
      email?: string;
      avatarUrl: string;
    }
  ): Promise<void> {
    const userRef = doc(db, "users", uid);
    const userData: User = {
      username: profileData.username,
      avatarUrl: profileData.avatarUrl,
      omrRatings: getDefaultOMRRatings(),
      xp: 0,
      levels: getDefaultLevels(),
      baselines: getDefaultBaselines(),
      freezeTokens: 0,
      badges: [],
      fcmToken: null,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    await setDoc(userRef, userData);
  }

  /**
   * Delete all user data from Firestore
   */
  private async deleteUserData(userId: string): Promise<void> {
    // Delete user profile
    await deleteDoc(doc(db, "users", userId));

    // TODO: Delete user's subcollections (attempts, pb, challengeDays)
    // This will be implemented when we add batch operations
  }

  /**
   * Convert Firebase error codes to user-friendly messages
   */
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case "auth/user-not-found":
        return "No account found with this email address.";
      case "auth/wrong-password":
        return "Incorrect password.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection.";
      case "auth/requires-recent-login":
        return "Please sign in again to complete this action.";
      default:
        return "An error occurred. Please try again.";
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
