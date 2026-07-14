import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      // main.js is DOM glue (canvas render loop + event wiring) verified by
      // driving the built page in a browser, not unit tests — see docs/ARCHITECTURE.md.
      exclude: ['src/main.js'],
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 85,
      },
    },
  },
});
