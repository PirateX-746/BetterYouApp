"use client";

import styles from "./Patients.module.css";

type Props = {
    onClick?: () => void;
    title?: string;
};

export default function ViewButton({ onClick, title = "View" }: Props) {
    return (
        <button
            className={`${styles.actionBtn} ${styles.secondary}`}
            onClick={onClick}
            title={title}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        </button>
    );
}
