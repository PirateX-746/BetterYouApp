"use client";

import GlassCard from "@/components/GlassCard";

export default function MessagesPage() {
    return (
        <div className="grid grid-cols-3 gap-8 h-[75vh]">

            <GlassCard>
                <h3 className="font-semibold mb-4">Conversations</h3>
            </GlassCard>

            <div className="col-span-2">
                <GlassCard>
                    <h3 className="font-semibold mb-4">Chat</h3>
                </GlassCard>
            </div>
        </div>
    );
}