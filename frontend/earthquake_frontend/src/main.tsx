import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClientProvider } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import { ThemeModeProvider } from './theme/ThemeModeContext.tsx';
import { queryClient } from './queryClient.ts';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <ThemeModeProvider>
                    <CssBaseline />
                    <App />
                </ThemeModeProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </StrictMode>
);
