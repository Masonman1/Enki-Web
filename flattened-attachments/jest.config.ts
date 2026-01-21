import type { Config } from 'jest';

const config: Config = {
  verbose: true,
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }], // Updated: Embed ts-jest config here
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Keep if you have it; optional
  testPathIgnorePatterns: ['/node_modules/', '/flattened-attachments/'] // NEW: Ignore temp flattened folder to resolve haste collisions and skip duplicates
};

export default config;