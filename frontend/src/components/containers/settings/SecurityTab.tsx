"use client";

import { useState } from "react";

export default function SecurityTab() {
    const [password, setPassword] = useState("");

    return (
        <form className="space-y-6">
            <div>
                <label className="block text-sm font-medium mb-1">
                    New Password
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-md px-3 py-2"
                />
            </div>

            <button className="bg-[var(--primary)] text-white px-4 py-2 rounded-md">
                Update Password
            </button>
        </form>
    );
}
