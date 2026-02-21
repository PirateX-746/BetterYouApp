"use client";

import { ReactNode } from "react";
import styles from "./Dashboard.module.css";

type StatCardProps = {
    label: string;
    value: string | number;
    icon: ReactNode;
    color?: "blue" | "green" | "yellow" | "purple";
};

function StatCard({ label, value, icon, color = "blue" }: StatCardProps) {
    return (
        <div className={styles.statCard}>
            <div className={styles.statCardHeader}>
                <div className={`${styles.statIcon} ${styles[color]}`}>
                    {icon}
                </div>
            </div>

            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <div className={styles.dashboardContainer}>
            {/* Page Header */}
            <div>
                <h1>Dashboard</h1>
                <p>Welcome back</p>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <StatCard
                    label="Total Patients"
                    value="124"
                    color="blue"
                    icon={
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    }
                />

                <StatCard
                    label="Today's Appointments"
                    value="6"
                    color="green"
                    icon={
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    }
                />

                <StatCard
                    label="This Week"
                    value="18"
                    color="yellow"
                    icon={
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    }
                />

                <StatCard
                    label="Upcoming"
                    value="9"
                    color="purple"
                    icon={
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    }
                />
            </div>
        </div>
    );
}
