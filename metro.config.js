const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// expo-sqlite (telefonda ayar deposu) için
config.resolver.assetExts.push('wasm');

module.exports = config;
