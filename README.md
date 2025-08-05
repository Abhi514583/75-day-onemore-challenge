# 75-Day OneMore Challenge 🏋️‍♂️

A progressive fitness challenge app that transforms your fitness journey through the power of "just one more" rep each day.

## 🎯 Concept

Start with your baseline exercises and add **just ONE MORE rep** every single day for 75 days. By the end, you'll be amazed at your transformation!

**Example Journey:**

- Day 1: 10 push-ups
- Day 2: 11 push-ups
- Day 3: 12 push-ups
- ...
- Day 75: 84 push-ups! 🎉

## ✨ Features

### 🚀 **Current Implementation (v1.0)**

- **Welcome Screen** - Beautiful animated introduction
- **Onboarding Flow** - Step-by-step baseline setup for each exercise
- **Dashboard** - Clean "Day X / 75" progress tracking
- **4 Core Exercises** - Push-ups, Squats, Sit-ups, Planks
- **Progress Tracking** - Streak counter and daily targets
- **Social Sharing** - Share your "Day X / 75 done!" progress

### 📱 **App Flow**

1. **Welcome Screen** → Animated intro with challenge explanation
2. **Onboarding Screen** → Set your starting numbers (1-100 range)
3. **Dashboard Screen** → View today's targets and progress

### 🏗️ **Coming Next (v2.0)**

- **Exercise Tracking Screen** - AI-powered camera form detection
- **Computer Vision** - Real-time rep counting and form feedback
- **Milestone Badges** - Achievements for Days 7, 30, 75
- **Premium Features** - Advanced analytics and harder restart mode
- **Push Notifications** - Daily reminders and celebrations

## 🛠️ Tech Stack

- **React Native** (Expo)
- **TypeScript**
- **Animated API** for smooth transitions
- **Clean Architecture** with proper navigation flow

## 📂 Project Structure

```
OneMoreApp2/
├── App.tsx                    # Main app with navigation logic
├── src/
│   ├── screens/
│   │   ├── WelcomeScreen.tsx     # Animated welcome & intro
│   │   ├── OnboardingScreen.tsx  # Baseline setup (step-by-step)
│   │   └── DashboardScreen.tsx   # Daily challenge view
│   └── components/
└── test-app.js               # Structure verification script
```

## 🚀 Getting Started

### Prerequisites

- Node.js
- Expo CLI
- iOS Simulator or Android Emulator

### Installation

```bash
# Clone the repository
git clone [repository-url]
cd OneMoreApp2

# Install dependencies
npm install

# Start the development server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android
```

## 🎮 How to Use

1. **Launch the app** - See the animated welcome screen
2. **Tap "Start Your Challenge"** - Begin the onboarding process
3. **Set your baselines** - Choose starting numbers for each exercise
4. **View your dashboard** - See today's targets and progress
5. **Track your journey** - Complete 75 days of progressive challenges!

## 📊 Challenge Logic

The app calculates daily targets using this formula:

- **Regular exercises**: `baseline + (current_day - 1)`
- **Planks**: `baseline + (current_day - 1) * 5` seconds

**Example with 10 push-up baseline:**

- Day 1: 10 push-ups
- Day 15: 24 push-ups
- Day 30: 39 push-ups
- Day 75: 84 push-ups

## 🎨 Design Philosophy

- **Clean & Minimal** - Focus on the challenge, not complexity
- **Consistent UI** - Same design language across all screens
- **Smooth Animations** - Delightful user experience
- **Progress-Focused** - Always show where you are in the 75-day journey

## 🏆 Milestones

- ✅ **Day 7** - Week Warrior badge
- ✅ **Day 30** - Month Master badge
- ✅ **Day 75** - Challenge Champion badge

## 🤝 Contributing

This is a personal fitness challenge app. Feel free to fork and customize for your own fitness journey!

## 📄 License

MIT License - Feel free to use this code for your own fitness apps.

---

**Ready to transform your fitness? Start your 75-day journey today!** 💪

_"The best time to plant a tree was 20 years ago. The second best time is now."_
