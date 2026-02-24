"use client";

import GlassCard from "@/components/GlassCard";

export default function ProfilePage() {
  return (
    <GlassCard>
      <h2 className="text-2xl font-semibold text-gray-800 mb-8">
        My Profile
      </h2>

      <div className="grid grid-cols-2 gap-6">
        <input className="input-style" placeholder="First Name" />
        <input className="input-style" placeholder="Last Name" />
        <input className="input-style col-span-2" placeholder="Email" />
      </div>

      <button className="mt-8 bg-blue-500 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition">
        Save Changes
      </button>
    </GlassCard>
  );
}