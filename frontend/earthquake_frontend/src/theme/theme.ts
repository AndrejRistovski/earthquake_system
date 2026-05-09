import { createTheme, type Theme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

const darkPalette = {
    background: { default: '#0a0e17', paper: '#0f1420' },
    primary: { main: '#6366f1' },
    divider: '#1e2635',
    text: { secondary: '#8b99b5' },
    action: { hover: 'rgba(99, 102, 241, 0.04)' },
} as const;

const lightPalette = {
    background: { default: '#f7f8fb', paper: '#ffffff' },
    primary: { main: '#6366f1' },
    divider: '#e2e6ee',
    text: { secondary: '#5b6478' },
    action: { hover: 'rgba(99, 102, 241, 0.06)' },
} as const;

export const createAppTheme = (mode: ThemeMode): Theme => {
    const palette = mode === 'dark' ? darkPalette : lightPalette;

    return createTheme({
        palette: {
            mode,
            ...palette,
        },
        shape: { borderRadius: 12 },
        typography: {
            h6: { fontWeight: 700 },
            overline: { letterSpacing: '0.12em', textTransform: 'uppercase' },
            caption: { letterSpacing: '0.05em' },
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    'input[type="datetime-local"]::-webkit-calendar-picker-indicator': {
                        filter: mode === 'dark' ? 'invert(1)' : 'none',
                        cursor: 'pointer',
                        opacity: 0.7,
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        backgroundImage: 'none',
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow:
                            theme.palette.mode === 'dark'
                                ? '0 4px 24px rgba(0,0,0,0.25)'
                                : '0 4px 24px rgba(15, 23, 42, 0.06)',
                    }),
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                        borderRadius: 8,
                        '&.MuiButton-containedPrimary': {
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            fontWeight: 600,
                            '&:hover': {
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                filter: 'brightness(1.1)',
                            },
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: 6,
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                    },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    head: ({ theme }) => ({
                        fontSize: '0.7rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: theme.palette.text.secondary,
                        fontWeight: 600,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                    }),
                    body: { borderBottom: 'none' },
                },
            },
            MuiTableRow: {
                styleOverrides: {
                    root: {
                        '&:not(.MuiTableRow-head):nth-of-type(odd)': {
                            backgroundColor: 'rgba(99, 102, 241, 0.03)',
                        },
                        '&:not(.MuiTableRow-head):hover': {
                            backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        },
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        backgroundColor: 'transparent',
                        boxShadow: 'none',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        backgroundImage: 'none',
                    }),
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: { borderRadius: 8 },
                },
            },
        },
    });
};

export default createAppTheme('dark');
