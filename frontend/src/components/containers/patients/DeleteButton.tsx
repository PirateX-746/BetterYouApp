"use client";

type Props = {
    onClick?: () => void;
    title?: string;
};

export default function DeleteButton({ onClick, title = "Delete" }: Props) {
    return (
        <button
            className="flex items-center justify-center w-8 h-8 rounded-md border border-danger/20 bg-danger/10 text-danger hover:bg-danger hover:text-white transition-colors"
            onClick={onClick}
            title={title}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        </button>
    );
}
