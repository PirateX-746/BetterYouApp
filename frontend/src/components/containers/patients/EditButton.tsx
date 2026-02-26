"use client";

import { Pencil } from "lucide-react";

type Props = {
    onClick?: () => void;
    title?: string;
};

export default function EditButton({ onClick, title = "Edit" }: Props) {
    return (
        <button
            className="flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] hover:bg-[var(--teal-light)] transition-all duration-200"
            onClick={onClick}
            title={title}
        >
            <Pencil size={15} strokeWidth={2} />
        </button>
    );
}
