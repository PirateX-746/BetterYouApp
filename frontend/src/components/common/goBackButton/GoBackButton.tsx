"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import styles from "./GoBackButton.module.css";

type Props = {
    fallbackPath?: string; // optional route if no history
    label?: string;
    className?: string;
};

export default function GoBackButton({
    fallbackPath,
    label = "Go Back",
    className = "",
}: Props) {
    const router = useRouter();

    const handleClick = () => {
        if (window.history.length > 1) {
            router.back();
        } else if (fallbackPath) {
            router.push(fallbackPath);
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`${styles.backBtn} ${className}`}
        >
            <ArrowLeft size={18} />
            {label}
        </button>
    );
}
