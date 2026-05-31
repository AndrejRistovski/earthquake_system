import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import {Outlet} from 'react-router';
import {useThemeMode} from '../../../../theme/themeModeContext';

export const Layout = () => {
    const {mode, toggle} = useThemeMode();

    return (
        <Box sx={{display: "flex", flexDirection: "column", minHeight: '100vh', bgcolor: 'background.default'}}>
            <AppBar position="static" color="transparent" elevation={0}>
                <Toolbar sx={{gap: 1}}>
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1, minWidth: 0}}>
                        <Box
                            sx={(theme) => ({
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                boxShadow: `0 0 12px ${theme.palette.primary.main}`,
                                flexShrink: 0,
                            })}
                        />
                        <Box sx={{minWidth: 0}}>
                            <Typography variant="h6" sx={{fontWeight: 700, letterSpacing: '0.12em'}}>
                                SEISMIC MONITOR
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    display: 'block',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                USGS Earthquake Feed — Real-time Data
                            </Typography>
                        </Box>
                    </Box>
                    <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                        <IconButton
                            onClick={toggle}
                            color="inherit"
                            aria-label="Toggle theme"
                            sx={{flexShrink: 0}}
                        >
                            {mode === 'dark' ? <Brightness7Icon/> : <Brightness4Icon/>}
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>
            <Container
                maxWidth="lg"
                sx={{py: {xs: 2, sm: 3, md: 4}, px: {xs: 2, sm: 3}}}
            >
                <Outlet/>
            </Container>
            <Box
                component="footer"
                sx={{
                    mt: "auto",
                    borderTop: 1,
                    borderColor: 'divider',
                    py: 2,
                    px: {xs: 2, sm: 3},
                    textAlign: 'center',
                }}
            >
                <Typography variant="caption" color="text.secondary" sx={{display: 'block'}}>
                    Data source: USGS Earthquake Hazards Program
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{display: 'block'}}>
                    Magnitude &gt; 1.0 · Last 24 hours
                </Typography>
            </Box>
        </Box>
    );
};
