import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: { DEMO_MODE: 'true', JWT_SECRET: 'test_only_secret', NODE_ENV: 'test' },
  },
});
