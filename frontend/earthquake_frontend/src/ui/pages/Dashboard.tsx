import { useEffect } from 'react';
import { EarthquakeTable } from '../components/EarthquakeTable';
import { FilterBar } from '../components/FilterBar';
import styles from './css/Dashboard.module.css';
import {useEarthquakes} from "../../hooks/useEarthqakes.ts";
import type {FilterParams} from "../../api/types/earthquake.ts";

export const Dashboard = () => {
    const { earthquakes, loading, refreshing, error, fetchEarthquakes, triggerRefresh } = useEarthquakes();

    useEffect(() => {
        fetchEarthquakes();
    }, [fetchEarthquakes]);

    const handleFilter = (filters: FilterParams) => {
        fetchEarthquakes(filters);
    };

    const isDisabled = loading || refreshing;

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.indicator} />
                    <div>
                        <h1 className={styles.title}>SEISMIC MONITOR</h1>
                        <p className={styles.subtitle}>USGS Earthquake Feed — Real-time Data</p>
                    </div>
                </div>
                <div className={styles.headerRight}>
          <span className={styles.count}>
            {earthquakes.length} EVENT{earthquakes.length !== 1 ? 'S' : ''}
          </span>
                    <button
                        className={styles.refreshBtn}
                        onClick={triggerRefresh}
                        disabled={isDisabled}
                    >
                        {refreshing ? (
                            <><span className={styles.spinner} /> FETCHING...</>
                        ) : (
                            '↻ REFRESH FROM USGS'
                        )}
                    </button>
                </div>
            </header>

            {error && (
                <div className={styles.error}>
                    <span>⚠ {error}</span>
                </div>
            )}

            <FilterBar onFilter={handleFilter} disabled={isDisabled} />

            <main className={styles.main}>
                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.loadingBar} />
                        <span>LOADING SEISMIC DATA...</span>
                    </div>
                ) : (
                    <EarthquakeTable earthquakes={earthquakes} />
                )}
            </main>

            <footer className={styles.footer}>
                <span>Data source: USGS Earthquake Hazards Program</span>
                <span>Magnitude &gt; 2.0 · Last 24 hours</span>
            </footer>
        </div>
    );
};