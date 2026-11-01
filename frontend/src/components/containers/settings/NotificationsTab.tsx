"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { useClientValue } from "@/hooks/useClientValue";
import styles from "./Settings.module.css";

interface PracticeSettings {
    name: string;
    patientEmailsEnabled: boolean;
}

/**
 * Practice-wide notification settings. "Emails to patients" is the master
 * switch for every email the practice's patients receive — confirmations,
 * changes, cancellations, reminders, welcome and password emails. It is
 * stored on the practice (not this browser), so it applies to everyone.
 */
export default function NotificationsTab() {
    const [settings, setSettings] = useState<PracticeSettings | null>(null);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    // Staff can see the setting; clinicians can change it (the API enforces this too).
    const canEdit = useClientValue(() => localStorage.getItem("role") !== "staff", true);

    useEffect(() => {
        api.get<PracticeSettings>("/practice/settings")
            .then((r) => setSettings(r.data))
            .catch((err) => setError(apiErrorMessage(err, "Couldn't load notification settings")));
    }, []);

    const togglePatientEmails = async () => {
        if (!settings) return;
        const next = !settings.patientEmailsEnabled;
        setSaving(true);
        try {
            const { data } = await api.patch<PracticeSettings>("/practice/settings", { patientEmailsEnabled: next });
            setSettings(data);
            toast.success(next ? "Emails to patients turned on" : "Emails to patients turned off");
        } catch (err) {
            toast.error(apiErrorMessage(err, "Couldn't update the setting"));
        } finally {
            setSaving(false);
        }
    };

    const off = settings && !settings.patientEmailsEnabled;

    return (
        <>
            <div className={styles.tabHeader}>
                <h2 className={styles.tabTitle}>Notifications</h2>
                <p className={styles.tabDescription}>
                    Control the emails your practice sends to patients
                </p>
            </div>

            <div className={styles.tabBody}>
                {error && <p className="text-sm text-danger-strong mb-4">{error}</p>}

                {off && (
                    <div className="flex items-start gap-3 mb-4 rounded-xl border border-warning/40 bg-warning-light px-4 py-3">
                        <AlertTriangle size={16} className="text-warning-strong shrink-0 mt-0.5" aria-hidden />
                        <p className="text-sm text-text-secondary leading-relaxed">
                            Emails to patients are <strong>off</strong>. Patients won&apos;t get booking
                            confirmations, changes, cancellations or reminders until you turn this back on.
                            Emails that were due while it was off are not sent later.
                        </p>
                    </div>
                )}

                <div className={styles.settingsList}>
                    <div className={styles.settingsItem}>
                        <div className={styles.settingsItemContent}>
                            <p className={styles.settingsItemTitle}>Emails to patients</p>
                            <p className={styles.settingsItemDescription}>
                                Appointment confirmations, changes, cancellations and reminders, plus welcome
                                and password emails. Applies to everyone in{" "}
                                {settings?.name ?? "your practice"}.
                                {!canEdit && " Only practitioners can change this."}
                            </p>
                        </div>
                        <label className={styles.toggleSwitch} aria-label="Emails to patients">
                            <input
                                type="checkbox"
                                checked={settings?.patientEmailsEnabled ?? true}
                                disabled={!settings || saving || !canEdit}
                                onChange={() => void togglePatientEmails()}
                            />
                            <span className={styles.toggleSlider} />
                        </label>
                    </div>
                </div>
            </div>
        </>
    );
}
