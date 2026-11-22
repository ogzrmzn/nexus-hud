// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*'],
  },
  {
    rules: {
      // React Compiler önerileri: davranışı bozmaz, uyarı olarak izlenir
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      // expo-notifications AndroidImportance'ı yeniden dışa aktarır; bu kural onu göremiyor
      'import/namespace': 'off',
    },
  },
]);
