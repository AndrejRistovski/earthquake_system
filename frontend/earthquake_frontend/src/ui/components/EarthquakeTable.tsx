
import styles from './css/EarthquakeTable.module.css';
import type {Earthquake} from "../../api/types/earthquake.ts";

interface Props {
    earthquakes: Earthquake[];
}

const getMagnitudeClass = (mag: number | null): string => {
    if (mag === null) return '';
    if (mag >= 5.0) return styles.magHigh;
    if (mag >= 3.0) return styles.magMid;
    return styles.magLow;
};

const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'UTC', timeZoneName: 'short',
    });
};

export const EarthquakeTable = ({ earthquakes }: Props) => {
    if (earthquakes.length === 0) {
        return (
            <div className={styles.empty}>
                <span>NO SEISMIC EVENTS ON RECORD</span>
                <p>Trigger a refresh to fetch latest data from USGS</p>
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            <table className={styles.table}>
                <thead>
                <tr>
                    <th>MAG</th>
                    <th>TYPE</th>
                    <th>LOCATION</th>
                    <th>DEPTH (km)</th>
                    <th>TIME (UTC)</th>
                    <th>COORDINATES</th>
                </tr>
                </thead>
                <tbody>
                {earthquakes.map((eq) => (
                    <tr key={eq.id} className={styles.row}>
                        <td>
                <span className={`${styles.magnitude} ${getMagnitudeClass(eq.magnitude)}`}>
                  {eq.magnitude?.toFixed(1) ?? '—'}
                </span>
                        </td>
                        <td className={styles.mono}>{eq.magType?.toUpperCase() ?? '—'}</td>
                        <td className={styles.place}>{eq.place ?? '—'}</td>
                        <td className={styles.mono}>{eq.depth?.toFixed(1) ?? '—'}</td>
                        <td className={styles.mono}>{formatTime(eq.time)}</td>
                        <td className={styles.mono}>
                            {eq.latitude !== null && eq.longitude !== null
                                ? `${eq.latitude.toFixed(3)}, ${eq.longitude.toFixed(3)}`
                                : '—'}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};