"use client";

import { Eye } from "lucide-react";

type Props = {
    onClick?: () => void;
    title?: string;
};

export default function ViewButton({ onClick, title = "View" }: Props) {
    return (
        <button
            className="flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary-light)] transition-all duration-200"
            onClick={onClick}
            title={title}
        >
            <Eye size={15} strokeWidth={2} />
        </button>
    );
}
