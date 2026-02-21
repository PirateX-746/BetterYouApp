"use client";

import { useState, ReactNode } from "react";

type Notification = {
    message: string;
    type: "info" | "success" | "error";
} | null;

export function useNotification() {
    const [notification, setNotification] = useState<Notification>(null);

    const show = (message: string, type: "info" | "success" | "error" = "info") => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const NotificationUI = (): ReactNode => {
        if (!notification) return null;

        return (
            <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-md" >
                {notification.message}
            </div>
        );
    };

    return { show, NotificationUI };
}
