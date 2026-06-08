import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.test.js'],
        exclude: ['node_modules', 'archive', '**/archive/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.js'],
            exclude: ['node_modules', 'archive', '**/archive/**', '**/*.test.js'],
        },
    },
});
