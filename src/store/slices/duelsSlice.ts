import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Duel,
  DuelHistory,
  OMRRating,
  SeasonalBadge,
  ExerciseType,
  DuelAttempt,
} from "../../types/duels";

export interface DuelsState {
  omrRating: OMRRating;
  activeDuels: Duel[];
  duelHistory: DuelHistory[];
  seasonalBadges: SeasonalBadge[];
  currentSeason: string;
  username: string;
  userId: string;
}

const initialState: DuelsState = {
  omrRating: {
    pushups: 1200,
    squats: 1200,
    situps: 1200,
    planks: 1200,
    gamesPlayed: {
      pushups: 0,
      squats: 0,
      situps: 0,
      planks: 0,
    },
  },
  activeDuels: [],
  duelHistory: [],
  seasonalBadges: [],
  currentSeason: "2025-Q1",
  username: "Player",
  userId: "user_" + Date.now(),
};

// Elo rating calculation
const calculateRatingChange = (
  playerRating: number,
  opponentRating: number,
  won: boolean,
  gamesPlayed: number
): number => {
  // K-factor logic
  let kFactor = 16; // Default
  if (gamesPlayed < 5) {
    kFactor = 32; // Placement matches
  } else if (gamesPlayed < 30) {
    kFactor = 24; // Early games
  }

  const expectedScore =
    1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actualScore = won ? 1 : 0;

  return Math.round(kFactor * (actualScore - expectedScore));
};

// Tie-breaker logic
const resolveTiebreaker = (
  hostAttempt: DuelAttempt,
  guestAttempt: DuelAttempt,
  exercise: ExerciseType
): "host" | "guest" | "tie" => {
  // 1. Higher average rep quality (placeholder - use manual confirmation for now)
  if (hostAttempt.quality && guestAttempt.quality) {
    if (hostAttempt.quality > guestAttempt.quality) return "host";
    if (guestAttempt.quality > hostAttempt.quality) return "guest";
  }

  // 2. Faster time to final rep (reps only, not plank)
  if (exercise !== "planks") {
    if (hostAttempt.duration < guestAttempt.duration) return "host";
    if (guestAttempt.duration < hostAttempt.duration) return "guest";
  }

  // 3. Host advantage flips to guest (coin toss)
  return Math.random() < 0.5 ? "guest" : "host";
};

const duelsSlice = createSlice({
  name: "duels",
  initialState,
  reducers: {
    setUsername: (state, action: PayloadAction<string>) => {
      state.username = action.payload;
    },

    createDuel: (state, action: PayloadAction<Duel>) => {
      state.activeDuels.push(action.payload);
    },

    joinDuel: (
      state,
      action: PayloadAction<{
        duelId: string;
        guestId: string;
        guestUsername: string;
      }>
    ) => {
      const { duelId, guestId, guestUsername } = action.payload;
      const duel = state.activeDuels.find((d) => d.id === duelId);
      if (duel && !duel.guestId) {
        duel.guestId = guestId;
        duel.guestUsername = guestUsername;
        duel.status = "active";
      }
    },

    submitAttempt: (
      state,
      action: PayloadAction<{
        duelId: string;
        attempt: DuelAttempt;
        isHost: boolean;
      }>
    ) => {
      const { duelId, attempt, isHost } = action.payload;
      const duel = state.activeDuels.find((d) => d.id === duelId);
      if (duel) {
        if (isHost) {
          duel.hostAttempt = attempt;
        } else {
          duel.guestAttempt = attempt;
        }

        // Check if both attempts are complete
        if (duel.hostAttempt && duel.guestAttempt) {
          duel.status = "completed";

          // Determine winner
          let winnerId: string;
          if (duel.hostAttempt.score > duel.guestAttempt.score) {
            winnerId = duel.hostId;
          } else if (duel.guestAttempt.score > duel.hostAttempt.score) {
            winnerId = duel.guestId!;
          } else {
            // Tie - use tie-breaker
            const tieResult = resolveTiebreaker(
              duel.hostAttempt,
              duel.guestAttempt,
              duel.settings.exercise
            );
            winnerId = tieResult === "host" ? duel.hostId : duel.guestId!;
          }

          duel.winnerId = winnerId;

          // Calculate rating changes
          const hostRating = state.omrRating[duel.settings.exercise];
          const guestRating = state.omrRating[duel.settings.exercise]; // In real app, get from opponent
          const hostGamesPlayed =
            state.omrRating.gamesPlayed[duel.settings.exercise];

          const hostWon = winnerId === duel.hostId;
          const hostRatingChange = calculateRatingChange(
            hostRating,
            guestRating,
            hostWon,
            hostGamesPlayed
          );
          const guestRatingChange = -hostRatingChange;

          duel.ratingChanges = {
            host: hostRatingChange,
            guest: guestRatingChange,
          };

          // Update ratings if this is our duel
          if (duel.hostId === state.userId || duel.guestId === state.userId) {
            const isHost = duel.hostId === state.userId;
            const ratingChange = isHost ? hostRatingChange : guestRatingChange;

            state.omrRating[duel.settings.exercise] += ratingChange;
            state.omrRating.gamesPlayed[duel.settings.exercise] += 1;

            // Add to history
            const historyEntry: DuelHistory = {
              duelId: duel.id,
              opponentUsername: isHost
                ? duel.guestUsername!
                : duel.hostUsername,
              exercise: duel.settings.exercise,
              myScore: isHost
                ? duel.hostAttempt.score
                : duel.guestAttempt.score,
              opponentScore: isHost
                ? duel.guestAttempt.score
                : duel.hostAttempt.score,
              won: winnerId === state.userId,
              ratingChange,
              completedAt: new Date().toISOString(),
            };
            state.duelHistory.unshift(historyEntry);
          }
        }
      }
    },

    expireDuel: (state, action: PayloadAction<string>) => {
      const duelId = action.payload;
      const duel = state.activeDuels.find((d) => d.id === duelId);
      if (duel) {
        duel.status = "expired";
      }
    },

    removeDuel: (state, action: PayloadAction<string>) => {
      const duelId = action.payload;
      state.activeDuels = state.activeDuels.filter((d) => d.id !== duelId);
    },

    updatePersonalBestFromDuel: (
      state,
      action: PayloadAction<{ exercise: ExerciseType; score: number }>
    ) => {
      // This would update personal bests in the user slice
      // For now, just log it
      console.log(
        `New PB potential: ${action.payload.exercise} - ${action.payload.score}`
      );
    },

    resetDuelsData: (state) => {
      return { ...initialState };
    },
  },
});

export const {
  setUsername,
  createDuel,
  joinDuel,
  submitAttempt,
  expireDuel,
  removeDuel,
  updatePersonalBestFromDuel,
  resetDuelsData,
} = duelsSlice.actions;

export default duelsSlice.reducer;
