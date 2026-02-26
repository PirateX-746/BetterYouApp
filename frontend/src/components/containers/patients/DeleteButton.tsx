"use client";

import { Trash2 } from "lucide-react";

type Props = {
    onClick?: () => void;
    title?: string;
};

export default function DeleteButton({ onClick, title = "Delete" }: Props) {
    return (
        <button
            className="flex items-center justify-center w-8 h-8 rounded-md border border-[var(--danger)]/20 bg-[var(--rose-light)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white hover:border-[var(--danger)] transition-all duration-200"
            onClick={onClick}
            title={title}
        >
            <Trash2 size={15} strokeWidth={2} />
        </button>
    );
}
