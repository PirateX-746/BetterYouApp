"use client";

type Props = {
    onClick?: () => void;
    title?: string;
};

export default function EditButton({ onClick, title = "Edit" }: Props) {
    return (
        <button
            className="flex items-center justify-center w-8 h-8 rounded-md border border-border bg-bg-light text-text-secondary hover:text-primary hover:bg-bg-hover transition-colors"
            onClick={onClick}
            title={title}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        </button>
    );
}
