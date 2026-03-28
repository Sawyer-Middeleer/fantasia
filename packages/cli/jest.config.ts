import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs" } }],
  },
  moduleNameMapper: {
    "^chalk$": "<rootDir>/tests/__mocks__/chalk.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};

export default config;
