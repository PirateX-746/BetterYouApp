"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function LoginContainer() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"patient" | "practitioner">("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login({ email, password, role });

      // 🔐 Cookies (for middleware / SSR)
      document.cookie = `token=${data.access_token}; path=/`;
      document.cookie = `role=${data.role}; path=/`;
      document.cookie = `name=${data.name}; path=/`;
      document.cookie = `userId=${data.id}; path=/`;

      // 🔐 LocalStorage (for client-side usage)
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("name", data.name);
      localStorage.setItem("userId", data.id);

      // 👨‍⚕️ Convenience alias (used by calendar)
      if (data.role === "practitioner") {
        localStorage.setItem("practitionerId", data.id);
      }

      router.refresh();
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto mt-20 p-6 border rounded-lg space-y-4"
    >
      <h1 className="text-2xl font-bold text-center">Login</h1>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <input
        type="email"
        placeholder="Email"
        className="w-full border p-2 rounded"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        required
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full border p-2 rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        required
      />

      <select
        className="w-full border p-2 rounded"
        value={role}
        onChange={(e) => setRole(e.target.value as any)}
        disabled={loading}
      >
        <option value="patient">Patient</option>
        <option value="practitioner">Practitioner</option>
      </select>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
}
