import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import Paper from '@mui/material/Paper';
import { useThemeMode } from '../../../../theme/themeModeContext.ts';
import type { Earthquake } from '../../../../api/types/earthquake.ts';
import { MAGNITUDE_CATEGORIES, getCategory } from '../../../../util/magnitude.ts';

interface Props {
    earthquakes: Earthquake[];
}

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DARK_ATTR =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const LIGHT_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Fallback for events without a magnitude — neutral grey.
const UNKNOWN_MAGNITUDE_COLOR = '#9ca3af';

const colorFor = (mag: number | null): string => {
    const cat = getCategory(mag);
    return cat === null ? UNKNOWN_MAGNITUDE_COLOR : MAGNITUDE_CATEGORIES[cat].hex;
};

const hasCoordinates = (
    eq: Earthquake,
): eq is Earthquake & { latitude: number; longitude: number } =>
    eq.latitude !== null && eq.longitude !== null;

export const EarthquakeMap = ({ earthquakes }: Props) => {
    const { mode } = useThemeMode();
    const plottable = earthquakes.filter(hasCoordinates);

    return (
        <Paper sx={{ overflow: 'hidden', height: 400, mt: 3 }}>
            <MapContainer
                center={[20, 0]}
                zoom={2}
                minZoom={2}
                worldCopyJump
                style={{
                    height: '100%',
                    width: '100%',
                    background: mode === 'dark' ? '#0a0e17' : '#f7f8fb',
                }}
            >
                <TileLayer
                    key={mode}
                    url={mode === 'dark' ? DARK_TILES : LIGHT_TILES}
                    attribution={mode === 'dark' ? DARK_ATTR : LIGHT_ATTR}
                />
                {plottable.map((eq) => {
                    const mag = eq.magnitude ?? 0;
                    const radius = Math.max(4, mag * 3);
                    const place = eq.place ?? 'Unknown location';
                    const magLabel = eq.magnitude !== null ? eq.magnitude.toFixed(1) : '?';
                    const color = colorFor(eq.magnitude);
                    return (
                        <CircleMarker
                            key={eq.id}
                            center={[eq.latitude, eq.longitude]}
                            radius={radius}
                            pathOptions={{
                                color,
                                fillColor: color,
                                fillOpacity: 0.45,
                                weight: 1,
                            }}
                        >
                            <Tooltip>{`M ${magLabel} — ${place}`}</Tooltip>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </Paper>
    );
};
