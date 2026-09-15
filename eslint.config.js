// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // React Native's Pressable loses function styles under NativeWind on devices (web is
    // fine), and Text must render in the app font — use the wrappers in src/components/ui.
    ignores: ["src/components/ui/pressable.tsx", "src/components/ui/text.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["Pressable", "Text"],
              message: "Import Pressable from '@/components/ui/pressable' and Text from '@/components/ui/text'.",
            },
          ],
        },
      ],
    },
  },
]);
