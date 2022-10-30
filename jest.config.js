module.exports = {
  preset: "ts-jest/presets/js-with-ts",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/.jest/setCommonEnvVars.ts"],
  testMatch: ["<rootDir>/**/*.spec.ts"],
};
