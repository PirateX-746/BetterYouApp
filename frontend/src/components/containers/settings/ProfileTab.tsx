"use client";

import { useState } from "react";
import styles from "./Settings.module.css";

export default function ProfileTab() {
    const [form, setForm] = useState({
        name: "",
        email: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    return (
        <form className={styles.settingsForm}>
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Name</label>
                <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className={styles.formInput}
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email</label>
                <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className={styles.formInput}
                />
            </div>

            <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton}>
                    Save Changes
                </button>
            </div>
        </form>
    );
}
