import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        ResizeObserver: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        console: "readonly",
        performance: "readonly",
        process: "readonly",
        URL: "readonly",
      },
    },
    rules: {
      complexity: ["error", { max: 10 }],
      "max-depth": ["error", 3],
      "max-lines": ["error", { max: 600, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 5],
      "no-console": ["warn", { allow: ["log", "warn", "error"] }],
    },
  },
];
