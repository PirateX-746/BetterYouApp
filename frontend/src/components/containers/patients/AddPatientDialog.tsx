"use client";

import styles from "./Patients.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddPatientDialog({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Add New Patient</h2>

        <form className="space-y-4">
          <input className={styles.formInput} placeholder="Full Name" />
          <input className={styles.formInput} type="number" placeholder="Age" />

          <select className={styles.formSelect}>
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </form>

        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary">Add Patient</button>
        </div>
      </div>
    </div>
  );
}
