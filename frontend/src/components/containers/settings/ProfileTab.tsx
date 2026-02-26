"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import styles from "./Settings.module.css";

export default function ProfileTab() {
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    return (
        <>
            <div className={styles.tabHeader}>
                <h2 className={styles.tabTitle}>Profile</h2>
                <p className={styles.tabDescription}>
                    Update your personal information and profile photo
                </p>
            </div>

            <div className={styles.tabBody}>
                {/* Avatar Section */}
                <div className={styles.profilePhotoSection}>
                    <div className={styles.profilePhoto}>U</div>
                    <div className={styles.profilePhotoInfo}>
                        <h3>Profile Photo</h3>
                        <p>JPG, PNG or GIF. Max 2MB.</p>
                        <button type="button" className={styles.uploadButton}>
                            <Upload size={13} />
                            Upload
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>First Name</label>
                            <input
                                name="firstName"
                                value={form.firstName}
                                onChange={handleChange}
                                placeholder="Enter first name"
                                className={styles.formInput}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Last Name</label>
                            <input
                                name="lastName"
                                value={form.lastName}
                                onChange={handleChange}
                                placeholder="Enter last name"
                                className={styles.formInput}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email</label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            className={styles.formInput}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Phone</label>
                        <input
                            name="phone"
                            type="tel"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="+91 00000 00000"
                            className={styles.formInput}
                        />
                    </div>

                    <div className={styles.formActions}>
                        <button type="button" className={styles.secondaryButton}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.primaryButton}>
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
