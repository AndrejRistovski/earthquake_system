import { createContext, useContext } from 'react';
import type { ThemeMode } from './theme.ts';

export interface ThemeModeContextValue {
    mode: ThemeMode;
    toggle: () => void;
}

export const ThemeModeContext = createContext<ThemeModeContextValue>({
    mode: 'dark',
    toggle: () => {},
});

export const useThemeMode = (): ThemeModeContextValue => useContext(ThemeModeContext);
