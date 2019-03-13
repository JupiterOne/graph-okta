module.exports = {
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testMatch: ["<rootDir>/src/**/*.test.{js,ts}"],
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts"],
  moduleFileExtensions: ["ts", "js"],
  testEnvironment: "node",
  clearMocks: true,
  collectCoverage: true,
  coverageThreshold: {
    global: {
      statements: 53,
      branches: 18,
      functions: 48,
      lines: 53,
    },
    "./src/constants.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "./src/invocationValidator.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "./src/util/getOktaAccount*.ts": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
