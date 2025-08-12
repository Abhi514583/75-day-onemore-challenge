# Backend Integration Design Document

## Overview

This document outlines the technical design for integrating a Firebase-based backend into the OneMore fitness app. The design prioritizes offline-first functionality, real-time features for duels, and scalable social features while maintaining the current user experience.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Native  │    │    Firebase     │    │   Third Party   │
│      App        │    │    Backend      │    │   Services      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Redux Store   │◄──►│ • Firestore     │    │ • Push Notifs   │
│ • Local Cache   │    │ • Auth          │    │ • Cloud Storage │
│ • Offline Queue │    │ • Functions     │    │ • Analytics     │
│ • Real-time UI  │    │ • Real-time DB  │    │ • Crash Reports │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow Strategy

**Client-Only Features:**

- Exercise tracking and counting
- Local workout history
- UI state management
- Offline exercise completion
- Personal best calculations (validated server-side)

**Server-Driven Features:**

- User authentication and profiles
- Real-time duel coordination
- Global leaderboards
- Social features (friends, achievements)
- Anti-cheat verification
- Push notifications

**Hybrid Features:**

- Personal bests (calculated locally, validated server-side)
- Streaks (maintained locally, synced for social features)
- XP and ratings (calculated locally, authoritative server-side)

## Components and Interfaces

### 1. Authentication Service

```typescript
interface AuthService {
  // Authentication methods
  signInWithEmail(email: string, password: string): Promise<User>;
  signInWithGoogle(): Promise<User>;
  signInWithApple(): Promise<User>;
  signOut(): Promise<void>;

  // User management
  getCurrentUser(): User | null;
  updateProfile(updates: Partial<UserProfile>): Promise<void>;
  deleteAccount(): Promise<void>;
}
```

### 2. Data Synchronization Service

```typescript
interface SyncService {
  // Sync operations
  syncUserData(): Promise<SyncResult>;
  syncPendingChanges(): Promise<SyncResult>;
  handleConflictResolution(conflicts: DataConflict[]): Promise<void>;

  // Offline queue management
  queueOperation(operation: OfflineOperation): void;
  getQueueStatus(): QueueStatus;
  retryFailedOperations(): Promise<void>;
}
```

### 3. Real-time Duel Service

```typescript
interface DuelService {
  // Duel management
  createDuel(config: DuelConfig): Promise<Duel>;
  joinDuel(duelId: string): Promise<void>;
  leaveDuel(duelId: string): Promise<void>;

  // Real-time updates
  subscribeToDuel(duelId: string, callback: DuelUpdateCallback): Unsubscribe;
  submitAttempt(duelId: string, attempt: DuelAttempt): Promise<void>;

  // Matchmaking
  findRandomOpponent(criteria: MatchmakingCriteria): Promise<Duel>;
  inviteFriend(friendId: string, duelConfig: DuelConfig): Promise<Duel>;
}
```

### 4. Social Service

```typescript
interface SocialService {
  // Friends management
  sendFriendRequest(userId: string): Promise<void>;
  acceptFriendRequest(requestId: string): Promise<void>;
  getFriends(): Promise<Friend[]>;

  // Leaderboards
  getGlobalLeaderboard(
    exercise: ExerciseType,
    limit: number
  ): Promise<LeaderboardEntry[]>;
  getFriendsLeaderboard(exercise: ExerciseType): Promise<LeaderboardEntry[]>;
  getUserRanking(userId: string, exercise: ExerciseType): Promise<RankingInfo>;
}
```

## Data Models

### 1. Firestore Collections & Schemas

#### 1.1 users/{uid}

```typescript
interface User {
  username: string;
  avatarUrl: string;
  omrRatings: {
    pushups: number; // default 1200
    squats: number; // default 1200
    situps: number; // default 1200
    planks: number; // default 1200
  };
  xp: number;
  levels: {
    pushups: number;
    squats: number;
    situps: number;
    planks: number;
    global: number;
  };
  baselines: {
    pushups: number;
    squats: number;
    situps: number;
    planks: number;
  };
  freezeTokens: number;
  badges: string[];
  fcmToken: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 1.2 attempts/{uid}/items/{attemptId}

```typescript
interface Attempt {
  exercise: "pushups" | "squats" | "situps" | "planks";
  mode: "challenge" | "pb" | "duel";
  score: number; // reps or seconds
  sets: number[]; // for challenge multi-set
  isPB: boolean;
  source: "manual" | "ai";
  quality: number | null; // AI analysis later
  clientAt: Timestamp; // client local time for UX
  serverAt: Timestamp; // server timestamp set by Cloud Function
  notes?: string;
}
```

#### 1.3 duels/{duelId}

```typescript
interface Duel {
  exercise: "pushups" | "squats" | "situps" | "planks";
  matchType: "public" | "friend";
  windowSec: number; // 600|1800|86400 (10min|30min|24hr)
  host: {
    uid: string;
    username: string;
  };
  guest: {
    uid: string;
    username: string;
  } | null;
  status: "pending" | "active" | "completed" | "forfeit";
  hostScore: number | null;
  guestScore: number | null;
  winnerUid: string | null;
  tieBreaker: "quality" | "speed" | "coin" | null;
  seasonId: string;
  createdAt: Timestamp;
  activatedAt: Timestamp;
  completedAt: Timestamp;
}
```

#### 1.4 leaderboards/{exercise}/{seasonId}/rankings/{uid}

```typescript
interface LeaderboardRanking {
  username: string;
  omr: number; // OMR rating
  wins: number;
  losses: number;
  updatedAt: Timestamp;
}
```

#### 1.5 pb/{uid}/{exercise}

```typescript
interface PersonalBest {
  value: number; // reps or seconds
  achievedAt: Timestamp;
  source: "manual" | "ai" | "duel";
}
```

#### 1.6 challengeDays/{uid}/{isoDate}

```typescript
interface ChallengeDay {
  exercises: {
    pushups: { target: number; completed: number };
    squats: { target: number; completed: number };
    situps: { target: number; completed: number };
    planks: { target: number; completed: number };
  };
  completedAt: Timestamp | null;
  lightened: boolean;
  earnedXP: number;
}
```

#### 1.7 Cloud Storage: duels/{duelId}/{uid}/proof.mp4

```typescript
// Storage path for optional video proof
// Used for ranked disputes only
// Metadata stored in Firestore, actual video in Cloud Storage
interface ProofVideo {
  storagePath: string   // duels/{duelId}/{uid}/proof.mp4
  uploadedAt: Timestamp
  fileSize: number
  duration: number
  thumbnailUrl?: string
}
    suspiciousActivity: boolean;
    confidence: number;
  };

  // Manual review
  reviewStatus: "pending" | "approved" | "rejected";
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp;

  // Metadata
  uploadedAt: Timestamp;
  fileSize: number;
  duration?: number;
}
```

## Error Handling

### Network Error Handling

```typescript
enum NetworkErrorType {
  CONNECTION_LOST = "connection_lost",
  TIMEOUT = "timeout",
  SERVER_ERROR = "server_error",
  RATE_LIMITED = "rate_limited",
  UNAUTHORIZED = "unauthorized",
}

interface ErrorHandlingStrategy {
  // Retry logic
  maxRetries: number;
  backoffStrategy: "exponential" | "linear" | "fixed";
  retryableErrors: NetworkErrorType[];

  // Fallback behavior
  offlineFallback: boolean;
  cacheStrategy: "stale-while-revalidate" | "cache-first" | "network-first";

  // User feedback
  showErrorToUser: boolean;
  errorMessage?: string;
  allowManualRetry: boolean;
}
```

### Conflict Resolution

```typescript
interface ConflictResolution {
  // Conflict detection
  detectConflicts(local: any, remote: any): DataConflict[];

  // Resolution strategies
  resolveAutomatically(conflict: DataConflict): ResolvedData;
  presentUserChoice(conflict: DataConflict): Promise<UserChoice>;

  // Merge strategies
  mergePersonalBests(local: PBData, remote: PBData): PBData;
  mergeStreaks(local: StreakData, remote: StreakData): StreakData;
  mergeXP(local: XPData, remote: XPData): XPData;
}
```

## Testing Strategy

### Unit Testing

- Data model validation
- Sync logic correctness
- Conflict resolution algorithms
- Offline queue management

### Integration Testing

- Firebase service integration
- Real-time listener functionality
- Authentication flow
- Push notification delivery

### End-to-End Testing

- Complete duel flow (create → join → compete → results)
- Cross-device synchronization
- Offline → online transition
- Social features (friends, leaderboards)

### Performance Testing

- Real-time update latency
- Large dataset synchronization
- Concurrent user load testing
- Memory usage during long sessions

## Security Considerations

### Data Protection

- All personal data encrypted in transit and at rest
- Firestore security rules prevent unauthorized access
- User data isolation and privacy controls
- GDPR compliance for data deletion

### Anti-Cheat Measures

- Server-side validation of all scores
- Statistical analysis for outlier detection
- Video verification for high-stakes duels
- Rate limiting to prevent spam/abuse

### Authentication Security

- Secure token management
- Session timeout handling
- Multi-factor authentication support
- Account recovery procedures

## Scalability Plan

### Database Optimization

- Proper indexing for query performance
- Data partitioning for large collections
- Caching strategies for frequently accessed data
- Archive old data to reduce active dataset size

### Real-time Performance

- Connection pooling for WebSocket connections
- Geographic distribution of Firebase regions
- Load balancing for Cloud Functions
- Monitoring and alerting for performance degradation

### Cost Management

- Efficient query patterns to minimize reads
- Appropriate caching to reduce API calls
- Data lifecycle management
- Usage monitoring and budgeting alerts
