import '@testing-library/jest-dom/vitest';
import {cleanup} from '@testing-library/react';
import {afterEach, beforeAll, afterAll} from 'vitest';
import {server} from './msw/server';

// RTL auto-cleanup is disabled with globals:false — call it explicitly
afterEach(() => cleanup());

// MSW lifecycle
beforeAll(() => server.listen({onUnhandledRequest: 'error'}));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Fix timezone for deterministic date formatting
process.env['TZ'] = 'UTC';
