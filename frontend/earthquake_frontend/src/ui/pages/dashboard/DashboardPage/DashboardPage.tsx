import {lazy, Suspense, useState} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {EarthquakeTable} from '../../../components/earthquake/EarthquakeTable/EarthquakeTable.tsx';
import {FilterBar} from '../../../components/earthquake/FilterBar/FilterBar.tsx';
import {computePresetRange, type TimePreset} from '../../../components/earthquake/FilterBar/presets';
import {useEarthquakesPage} from '../../../../hooks/useEarthquakesPage';
import {useAllEarthquakes} from '../../../../hooks/useAllEarthquakes';
import type {EarthquakeFilters} from '../../../../api/types/earthquake';

// Lazy-loaded so leaflet + react-leaflet (and the map's CSS) ship in their own
// async chunk rather than the entry bundle — the map sits below the table fold.
const EarthquakeMap = lazy(() =>
    import('../../../components/earthquake/EarthquakeMap/EarthquakeMap.tsx').then((m) => ({
        default: m.EarthquakeMap,
    })),
);

const DEFAULT_PRESET: TimePreset = '24h';
const DEFAULT_PAGE_SIZE = 20;

/**
 * Builds the initial filter state lazily so the timestamps are evaluated on
 * mount, not at module-load time (which would freeze them).
 */
const buildInitialFilters = (): EarthquakeFilters => ({
    ...computePresetRange(DEFAULT_PRESET),
});

export const DashboardPage = () => {
    const [filters, setFilters] = useState<EarthquakeFilters>(buildInitialFilters);
    const [activePreset, setActivePreset] = useState<TimePreset>(DEFAULT_PRESET);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const tableQuery = useEarthquakesPage(filters, page, pageSize);
    const mapQuery = useAllEarthquakes(filters);

    // Filter changes reset to page 0 atomically. Doing this here (rather than
    // in a useEffect on filter identity) keeps the next render aligned: only
    // one query fires per change instead of one with the stale page followed
    // by a corrected one.
    const handleFilterChange = ({
                                    filters: nextFilters,
                                    activePreset: nextPreset,
                                }: {
        filters: EarthquakeFilters;
        activePreset: TimePreset;
    }) => {
        setFilters(nextFilters);
        setActivePreset(nextPreset);
        setPage(0);
    };

    const tableLoadingInitial = tableQuery.isLoading;
    const isBackgroundFetching = tableQuery.isFetching || mapQuery.isFetching;
    const errorMessage = (tableQuery.error ?? mapQuery.error)
        ? 'Failed to load earthquake data.'
        : null;

    const totalEvents = tableQuery.data?.totalElements ?? 0;
    const tableEarthquakes = tableQuery.data?.content ?? [];
    const mapEarthquakes = mapQuery.data ?? [];

    return (
        <Stack spacing={0}>
            <Paper sx={{p: {xs: 2, sm: 2.5}, mb: 3}}>
                <Box>
                    <Typography variant="overline" color="text.secondary">
                        Events
                    </Typography>
                    <Typography variant="h4" sx={{fontWeight: 700, lineHeight: 1.1}}>
                        {totalEvents.toLocaleString()}
                    </Typography>
                </Box>
            </Paper>

            {errorMessage && (
                <Alert variant="filled" severity="error" sx={{borderRadius: 2, mb: 2}}>
                    {errorMessage}
                </Alert>
            )}

            <FilterBar
                filters={filters}
                activePreset={activePreset}
                onChange={handleFilterChange}
                disabled={tableLoadingInitial}
            />

            {/* Slim progress strip at the top of the data area for background refetches. */}
            <Box sx={{height: 4, mb: 0.5}}>
                {isBackgroundFetching && !tableLoadingInitial && <LinearProgress/>}
            </Box>

            <Box>
                {tableLoadingInitial ? (
                    <Paper sx={{p: 6, display: 'flex', justifyContent: 'center'}}>
                        <CircularProgress/>
                    </Paper>
                ) : (
                    <>
                        <EarthquakeTable
                            earthquakes={tableEarthquakes}
                            loading={tableQuery.isFetching}
                            pagination={{
                                count: totalEvents,
                                page,
                                rowsPerPage: pageSize,
                                onPageChange: setPage,
                                onRowsPerPageChange: (size) => {
                                    setPageSize(size);
                                    setPage(0);
                                },
                            }}
                        />
                        <Suspense
                            fallback={
                                <Paper sx={{height: 400, mt: 3, overflow: 'hidden'}}>
                                    <Skeleton variant="rectangular" width="100%" height="100%"/>
                                </Paper>
                            }
                        >
                            <EarthquakeMap earthquakes={mapEarthquakes}/>
                        </Suspense>
                    </>
                )}
            </Box>
        </Stack>
    );
};
