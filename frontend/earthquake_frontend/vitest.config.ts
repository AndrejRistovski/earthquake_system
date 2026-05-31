import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react({jsxRuntime: 'automatic'})] as never,
    test: {
        environment: 'jsdom',
        globals: false,
        setupFiles: ['src/test/setup.ts'],
        css: false,
        include: [
            'src/**/*.test.ts',
            'src/**/*.test.tsx',
        ],
        exclude: [
            'src/test/**',
            'node_modules/**',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: 'coverage',
            include: [
                'src/util/**',
                'src/api/**',
                'src/hooks/**',
                'src/ui/components/earthquake/**',
                'src/ui/pages/**',
            ],
            exclude: [
                'src/test/**',
                'src/**/*.test.{ts,tsx}',
                'src/main.tsx',
                'src/App.tsx',
                'src/theme/**',
                'src/ui/components/layout/**',
                'src/api/types/**',
                'src/axios/**',
                'src/queryClient.ts',
            ],
        },
    },
});
