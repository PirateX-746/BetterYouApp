"use client";

import { useState } from "react";
import styles from "./Settings.module.css";

export default function SecurityTab() {
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    return (
        <>
            <div className={styles.tabHeader}>
                <h2 className={styles.tabTitle}>Security</h2>
                <p className={styles.tabDescription}>
                    Manage your password and security preferences
                </p>
            </div>

            <div className={styles.tabBody}>
                <form>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Current Password</label>
                        <input
                            name="currentPassword"
                            type="password"
                            value={form.currentPassword}
                            onChange={handleChange}
                            placeholder="Enter current password"
                            className={styles.formInput}
                        />
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>New Password</label>
                            <input
                                name="newPassword"
                                type="password"
                                value={form.newPassword}
                                onChange={handleChange}
                                placeholder="Enter new password"
                                className={styles.formInput}
                            />
                            <span className={styles.formHint}>
                                Minimum 8 characters
                            </span>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Confirm Password</label>
                            <input
                                name="confirmPassword"
                                type="password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                placeholder="Re-enter new password"
                                className={styles.formInput}
                            />
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button type="button" className={styles.secondaryButton}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.primaryButton}>
                            Update Password
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
