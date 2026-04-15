import { useState } from 'react';
import styles from './css/FilterBar.module.css';
import type {FilterParams} from "../../api/types/earthquake.ts";

interface Props {
    onFilter: (filters: FilterParams) => void;
    disabled: boolean;
}

export const FilterBar = ({ onFilter, disabled }: Props) => {
    const [minMagnitude, setMinMagnitude] = useState('');
    const [after, setAfter] = useState('');

    const handleApply = () => {
        onFilter({
            ...(minMagnitude !== '' && { minMagnitude: parseFloat(minMagnitude) }),
            ...(after !== '' && { after: new Date(after).toISOString() }),
        });
    };

    const handleReset = () => {
        setMinMagnitude('');
        setAfter('');
        onFilter({});
    };

    return (
        <div className={styles.bar}>
            <div className={styles.field}>
                <label className={styles.label}>MIN MAGNITUDE</label>
                <input
                    className={styles.input}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 2.5"
                    value={minMagnitude}
                    onChange={(e) => setMinMagnitude(e.target.value)}
                    disabled={disabled}
                />
            </div>
            <div className={styles.field}>
                <label className={styles.label}>AFTER</label>
                <input
                    className={styles.input}
                    type="datetime-local"
                    value={after}
                    onChange={(e) => setAfter(e.target.value)}
                    disabled={disabled}
                />
            </div>
            <div className={styles.actions}>
                <button className={styles.applyBtn} onClick={handleApply} disabled={disabled}>
                    APPLY
                </button>
                <button className={styles.resetBtn} onClick={handleReset} disabled={disabled}>
                    RESET
                </button>
            </div>
        </div>
    );
};