import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { User as FirebaseUser } from "firebase/auth";
import { authService, UserProfile } from "../../services/AuthService";

// Auth state interface
export interface AuthState {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

// Initial state
const initialState: AuthState = {
  user: null,
  userProfile: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: true, // Set to true for demo mode
};

// Async thunks
export const signInWithEmail = createAsyncThunk(
  "auth/signInWithEmail",
  async ({ email, password }: { email: string; password: string }) => {
    const result = await authService.signInWithEmail(email, password);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Fetch user profile
    const profile = await authService.getUserProfile();
    return { user: result.user!, profile };
  }
);

export const createAccount = createAsyncThunk(
  "auth/createAccount",
  async ({
    email,
    password,
    username,
  }: {
    email: string;
    password: string;
    username: string;
  }) => {
    const result = await authService.createAccountWithEmail(
      email,
      password,
      username
    );
    if (!result.success) {
      throw new Error(result.error);
    }

    // Fetch user profile
    const profile = await authService.getUserProfile();
    return { user: result.user!, profile };
  }
);

export const signOut = createAsyncThunk("auth/signOut", async () => {
  const result = await authService.signOut();
  if (!result.success) {
    throw new Error(result.error);
  }
});

export const loadUserProfile = createAsyncThunk(
  "auth/loadUserProfile",
  async (userId?: string) => {
    const profile = await authService.getUserProfile(userId);
    return profile;
  }
);

export const updateUserProfile = createAsyncThunk(
  "auth/updateUserProfile",
  async (updates: Partial<UserProfile>) => {
    const result = await authService.updateUserProfile(updates);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Return updated profile
    const profile = await authService.getUserProfile();
    return profile;
  }
);

export const sendPasswordReset = createAsyncThunk(
  "auth/sendPasswordReset",
  async (email: string) => {
    const result = await authService.sendPasswordReset(email);
    if (!result.success) {
      throw new Error(result.error);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthState: (
      state,
      action: PayloadAction<{ user: FirebaseUser | null }>
    ) => {
      state.user = action.payload.user;
      state.isAuthenticated = !!action.payload.user;
      state.isInitialized = true;
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Sign in with email
    builder
      .addCase(signInWithEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.userProfile = action.payload.profile;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Sign in failed";
      });

    // Create account
    builder
      .addCase(createAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.userProfile = action.payload.profile;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Account creation failed";
      });

    // Sign out
    builder
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.userProfile = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Sign out failed";
      });

    // Load user profile
    builder.addCase(loadUserProfile.fulfilled, (state, action) => {
      state.userProfile = action.payload;
    });

    // Update user profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userProfile = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Profile update failed";
      });

    // Send password reset
    builder
      .addCase(sendPasswordReset.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendPasswordReset.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(sendPasswordReset.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Password reset failed";
      });
  },
});

export const { setAuthState, clearError, setLoading } = authSlice.actions;
export default authSlice.reducer;
