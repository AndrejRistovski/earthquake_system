import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type {Earthquake} from '../../../../api/types/earthquake';
import {MAGNITUDE_CATEGORIES, getCategory} from '../../../../util/magnitude';

interface PaginationProps {
    count: number;
    page: number;
    rowsPerPage: number;
    rowsPerPageOptions?: number[];
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (size: number) => void;
}

interface Props {
    earthquakes: Earthquake[];
    pagination: PaginationProps;
    loading?: boolean;
}

const formatTime = (isoString: string): string =>
    new Date(isoString).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
    });

const monoSx = {
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace',
    fontSize: '0.85rem',
    color: 'text.secondary',
} as const;

/**
 * Resolves the chip color for a magnitude using the shared category palette.
 * Returning the MUI semantic token keeps the table consistent with the map and
 * the FilterBar buttons — all three derive from MAGNITUDE_CATEGORIES.
 */
const magnitudeChipColor = (
    mag: number | null,
): 'success' | 'warning' | 'error' | 'default' => {
    const cat = getCategory(mag);
    if (cat === null) return 'default';
    return MAGNITUDE_CATEGORIES[cat].muiColor;
};

export const EarthquakeTable = ({earthquakes, pagination, loading = false}: Props) => {
    const showEmptyState = !loading && pagination.count === 0;

    return (
        <Paper sx={{overflow: 'hidden'}}>
            {showEmptyState ? (
                <EmptyState/>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Mag</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Location</TableCell>
                                <TableCell>Depth (km)</TableCell>
                                <TableCell>Time (UTC)</TableCell>
                                <TableCell>Coordinates</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {earthquakes.map((eq) => (
                                <TableRow key={eq.id}>
                                    <TableCell>
                                        {eq.magnitude !== null ? (
                                            <Chip
                                                label={eq.magnitude.toFixed(1)}
                                                color={magnitudeChipColor(eq.magnitude)}
                                                size="small"
                                                sx={{minWidth: 56}}
                                            />
                                        ) : (
                                            <Chip
                                                label="—"
                                                variant="outlined"
                                                size="small"
                                                sx={{minWidth: 56}}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell sx={monoSx}>{eq.magType?.toUpperCase() ?? '—'}</TableCell>
                                    <TableCell>{eq.place ?? '—'}</TableCell>
                                    <TableCell sx={monoSx}>{eq.depth?.toFixed(1) ?? '—'}</TableCell>
                                    <TableCell sx={monoSx}>{formatTime(eq.time)}</TableCell>
                                    <TableCell sx={monoSx}>
                                        {eq.latitude !== null && eq.longitude !== null
                                            ? `${eq.latitude.toFixed(3)}, ${eq.longitude.toFixed(3)}`
                                            : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <TablePagination
                component="div"
                count={pagination.count}
                page={pagination.page}
                onPageChange={(_, next) => pagination.onPageChange(next)}
                rowsPerPage={pagination.rowsPerPage}
                onRowsPerPageChange={(e) => pagination.onRowsPerPageChange(Number(e.target.value))}
                rowsPerPageOptions={pagination.rowsPerPageOptions ?? [10, 20, 50, 100]}
            />
        </Paper>
    );
};

const EmptyState = () => (
    <Paper sx={{textAlign: 'center', py: 8, px: 4, boxShadow: 'none'}}>
        <Typography variant="h6" gutterBottom>
            No seismic events match the active filters
        </Typography>
        <Typography variant="body2" color="text.secondary">
            Try widening the time range, lowering the magnitude floor, or selecting more categories.
        </Typography>
    </Paper>
);
