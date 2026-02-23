"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function PatientSignup() {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        email: "",
        password: "",
        confirmPassword: "",
        gender: "",
        phoneNo: "",
        bloodGroup: "",
        allergies: "",
        healthCondition: "",
    });

    const theme = {
        primary: "blue",
        border: "border-blue-100/40",
        button: "bg-blue-500",
        focus: "focus:border-blue-500 focus:ring-blue-100",
        accent: "text-blue-500",
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const payload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                dateOfBirth: formData.dateOfBirth,
                email: formData.email,
                password: formData.password,
                gender: formData.gender,
                phoneNo: formData.phoneNo,
                bloodGroup: formData.bloodGroup,
                allergies: formData.allergies || undefined,
                healthCondition: formData.healthCondition || undefined,
            };

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Signup failed");
            }

            // Success → redirect
            router.push(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`);

        } catch (err: any) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">

            {/* Large Ambient Glow Layers */}
            <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-300 rounded-full blur-[140px] opacity-30" />
            <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-indigo-300 rounded-full blur-[140px] opacity-30" />

            <div
                className="
      relative
      w-full
      max-w-2xl
      backdrop-blur-2xl
      bg-white/70
      rounded-3xl
      shadow-[0_25px_60px_rgba(15,23,42,0.12)]
      border border-blue-100/40
      p-12
      transition-all duration-500
    "
            >
                {/* Header */}
                <div className="text-center mb-10 space-y-3">
                    <h1 className="text-3xl font-semibold tracking-tight text-gray-800">
                        Better<span className={theme.accent}>You</span>
                    </h1>

                    <p className="text-sm text-gray-500">
                        Create your secure patient account
                    </p>
                </div>

                {error && (
                    <p className="text-red-500 text-sm text-center mb-6">
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Name */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            name="firstName"
                            placeholder="First Name"
                            required
                            disabled={loading}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200 ${theme.focus} focus:ring-2 outline-none transition`}
                        />
                        <input
                            name="lastName"
                            placeholder="Last Name"
                            required
                            disabled={loading}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200 ${theme.focus} focus:ring-2 outline-none transition`}
                        />
                    </div>

                    {/* DOB + Gender */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            type="date"
                            name="dateOfBirth"
                            required
                            disabled={loading}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200 ${theme.focus} focus:ring-2 outline-none transition`}
                        />

                        <select
                            name="gender"
                            required
                            disabled={loading}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200 ${theme.focus} focus:ring-2 outline-none transition`}
                        >
                            <option value="">Select Gender</option>
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                        </select>
                    </div>

                    {/* Contact */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            type="email"
                            name="email"
                            placeholder="Email Address"
                            required
                            disabled={loading}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200 ${theme.focus} focus:ring-2 outline-none transition`}
                        />

                        <input
                            name="phoneNo"
                            placeholder="Phone Number"
                            required
                            disabled={loading}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200 ${theme.focus} focus:ring-2 outline-none transition`}
                        />
                    </div>

                    {/* Medical */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <select
                            name="bloodGroup"
                            required
                            disabled={loading}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200 ${theme.focus} focus:ring-2 outline-none transition`}
                        >
                            <option value="">Blood Group</option>
                            <option>A+</option>
                            <option>A-</option>
                            <option>B+</option>
                            <option>B-</option>
                            <option>O+</option>
                            <option>O-</option>
                            <option>AB+</option>
                            <option>AB-</option>
                        </select>

                        <input
                            name="allergies"
                            placeholder="Allergies (Optional)"
                            disabled={loading}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200 ${theme.focus} focus:ring-2 outline-none transition`}
                        />
                    </div>

                    <input
                        name="healthCondition"
                        placeholder="Health Condition (Optional)"
                        disabled={loading}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200 ${theme.focus} focus:ring-2 outline-none transition`}
                    />

                    {/* Password */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            required
                            disabled={loading}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200 ${theme.focus} focus:ring-2 outline-none transition`}
                        />
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm Password"
                            required
                            disabled={loading}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200 ${theme.focus} focus:ring-2 outline-none transition`}
                        />
                    </div>

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
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                {/* Login Redirect */}
                <p className="text-center text-sm text-gray-500 mt-10">
                    Already have an account?{" "}
                    <Link
                        href="/patientLogin"
                        className={`${theme.accent} font-medium hover:underline`}
                    >
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}