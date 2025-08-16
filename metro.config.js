const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add support for react-native-vision-camera frame processors
config.resolver.platforms = ["ios", "android", "native", "web"];

module.exports = config;
