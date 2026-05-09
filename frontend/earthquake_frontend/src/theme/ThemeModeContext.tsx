import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme, type ThemeMode } from './theme.ts';
import { ThemeModeContext } from './themeModeContext.ts';

const STORAGE_KEY = 'seismic-theme-mode';

const readStoredMode = (): ThemeMode => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
};

interface Props {
    children: ReactNode;
}

export const ThemeModeProvider = ({ children }: Props) => {
    const [mode, setMode] = useState<ThemeMode>(readStoredMode);

    useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, mode);
    }, [mode]);

    const theme = useMemo(() => createAppTheme(mode), [mode]);

    const toggle = useCallback(() => {
        setMode((current) => (current === 'dark' ? 'light' : 'dark'));
    }, []);

    const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);

    return (
        <ThemeModeContext.Provider value={value}>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </ThemeModeContext.Provider>
    );
};
