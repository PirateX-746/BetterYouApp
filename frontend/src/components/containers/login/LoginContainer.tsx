"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";
import { Loader2 } from "lucide-react";

interface LoginProps {
  role: "patient" | "practitioner";
}

export default function LoginContainer({ role }: LoginProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPatient = role === "patient";

  const theme = {
    primary: isPatient ? "blue" : "indigo",
    bg: isPatient ? "bg-[#f8fafc]" : "bg-[#f1f5f9]",
    border: isPatient ? "border-blue-100/40" : "border-indigo-100/40",
    button: isPatient ? "bg-blue-500" : "bg-indigo-600",
    focus: isPatient
      ? "focus:border-blue-500 focus:ring-blue-100"
      : "focus:border-indigo-600 focus:ring-indigo-100",
    accent: isPatient ? "text-blue-500" : "text-indigo-600",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login({ email, password, role });

      document.cookie = `token=${data.access_token}; path=/`;
      document.cookie = `role=${data.role}; path=/`;
      document.cookie = `name=${data.name}; path=/`;
      document.cookie = `userId=${data.id}; path=/`;

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("name", data.name);
      localStorage.setItem("userId", data.id);

      router.refresh();
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">

      {/* Soft ambient glow */}
      <div className="absolute top-[-150px] left-[-150px] w-[400px] h-[400px] bg-blue-200 rounded-full blur-3xl opacity-30" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[400px] h-[400px] bg-indigo-300 rounded-full blur-3xl opacity-30" />

      <div
        className={`
        relative
        w-full max-w-md
        backdrop-blur-2xl
        bg-white/70
        rounded-3xl
        shadow-[0_25px_60px_rgba(15,23,42,0.12)]
        border ${theme.border}
        p-12
        transition-all duration-500
      `}
      >
        {/* Header */}
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-800">
            Better<span className={`${theme.accent}`}>You</span>
          </h1>

          <p className="text-sm text-gray-500">
            {isPatient
              ? "Welcome back. Continue your wellness journey."
              : "Secure practitioner access portal"}
          </p>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-6">
            {error}
          </p>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">
              Email
            </label>
            <input
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`
              w-full px-4 py-3 rounded-xl
              bg-white/80
              border border-gray-200
              ${theme.focus}
              focus:ring-2
              outline-none transition-all duration-300
            `}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">
              Password
            </label>
            <input
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`
              w-full px-4 py-3 rounded-xl
              bg-white/80
              border border-gray-200
              ${theme.focus}
              focus:ring-2
              outline-none transition-all duration-300
            `}
            />
          </div>

          {/* Practitioner Only Options */}
          {!isPatient && (
            <div className="flex items-center justify-between text-sm pt-2">
              <label className="flex items-center gap-2 text-gray-500">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                  className={`accent-${theme.primary}-600`}
                />
                Remember me
              </label>

              <Link
                href="/practitioner/forgot-password"
                className={`${theme.accent} hover:underline`}
              >
                Forgot password?
              </Link>
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className={`
            w-full
            ${theme.button}
            text-white
            py-3.5
            rounded-xl
            font-semibold
            tracking-wide
            shadow-lg
            hover:shadow-xl
            hover:scale-[1.01]
            active:scale-[0.98]
            transition-all duration-300
            disabled:opacity-60
          `}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Patient Only Signup */}
        {isPatient && (
          <p className="text-center text-sm text-gray-500 mt-10">
            Don’t have an account?{" "}
            <Link
              href="/patientSignup"
              className={`${theme.accent} font-medium hover:underline`}
            >
              Sign up
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}