"use client";

import GlassCard from "@/components/GlassCard";

export default function Settings() {
    return (
        <GlassCard>
            <h2 className="text-2xl font-semibold text-gray-800 mb-8">
                My Settings - Manage settings here...
            </h2>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                            Account Information
                        </h3>
                        <p className="text-gray-600">
                            Manage your account information.
                        </p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800">
                        Edit
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                            Notifications
                        </h3>
                        <p className="text-gray-600">
                            Manage your notification preferences.
                        </p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800">
                        Edit
                    </button>
                </div>
            </div>
        </GlassCard>
    );
}