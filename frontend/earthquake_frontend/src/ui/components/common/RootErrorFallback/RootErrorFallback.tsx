import type { FallbackProps } from 'react-error-boundary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export const RootErrorFallback = ({ error }: FallbackProps) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 480 }}>
                <Typography variant="h6" gutterBottom>
                    Something went wrong
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {message}
                </Typography>
                <Button variant="contained" onClick={() => window.location.reload()}>
                    Reload
                </Button>
            </Paper>
        </Box>
    );
};
