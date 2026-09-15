// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Text must render in the app font (Hind Siliguri, picked by fontWeight) — use the wrapper.
    ignores: ["src/components/ui/text.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["Text"],
              message: "Import Text from '@/components/ui/text'.",
            },
          ],
        },
      ],
    },
  },
]);
