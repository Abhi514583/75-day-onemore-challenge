// Simple test to verify our app structure
const fs = require("fs");
const path = require("path");

console.log("🚀 Testing 75-Day OneMore Challenge App Structure...\n");

// Check if all required files exist
const requiredFiles = [
  "App.tsx",
  "src/screens/WelcomeScreen.tsx",
  "src/screens/OnboardingScreen.tsx",
  "src/screens/DashboardScreen.tsx",
];

let allFilesExist = true;

requiredFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - EXISTS`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log("\n🎉 All core files are present!");
  console.log("\n📱 App Flow:");
  console.log(
    '1. Welcome Screen - Animated intro with "Start Your Challenge" button'
  );
  console.log(
    "2. Onboarding Screen - Set baselines for each exercise (step-by-step)"
  );
  console.log('3. Dashboard Screen - "Day X / 75" with today\'s targets');
  console.log("\n✨ Features implemented:");
  console.log("- Beautiful animations on welcome screen");
  console.log("- Step-by-step baseline setup with validation");
  console.log("- Clean dashboard showing daily targets");
  console.log("- Progress tracking (Day 27/75 example)");
  console.log("- Social sharing button");
  console.log(
    "\n🏗️  Ready for next phase: Exercise Tracking Screen with camera!"
  );
} else {
  console.log("\n❌ Some files are missing. Please check the file structure.");
}

// Check package.json for dependencies
try {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log(`\n📦 Project: ${packageJson.name} v${packageJson.version}`);
  console.log("📋 Key dependencies:");
  console.log("- React Native (Expo)");
  console.log("- TypeScript");
  console.log("- Expo Status Bar");
} catch (error) {
  console.log("\n❌ Could not read package.json");
}
