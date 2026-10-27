import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { diagnostics: { ignoreCodes: [151002] } }],
    "^.+\\.m?js$": ["ts-jest", {
      tsconfig: { allowJs: true, module: "CommonJS", target: "ES2022", esModuleInterop: true },
      diagnostics: false,
    }],
  },
  // Patched sanitize-html uses ESM parser packages; transform those for Jest's CJS runtime.
  transformIgnorePatterns: ["node_modules/(?!(htmlparser2|domhandler|domutils|domelementtype|dom-serializer|entities)/)"],
};

export default config;
