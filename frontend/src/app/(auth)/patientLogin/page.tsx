
"use client";

import Link from "next/link";

export default function PatientLogin() {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-6">

            {/* Card */}
            <div className="
        w-full
        max-w-md
        bg-white
        rounded-3xl
        shadow-[0_20px_50px_rgba(15,23,42,0.08)]
        border border-blue-100/40
        p-10
      ">

                {/* Logo / Title */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-semibold">
                        Better<span className="text-blue-500">You</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Welcome back. Please login to continue.
                    </p>
                </div>

                {/* Form */}
                <form className="space-y-5">

                    {/* Email */}
                    <div>
                        <label className="text-sm text-gray-600 block mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            className="
                w-full
                px-4
                py-3
                rounded-xl
                border border-gray-200
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-100
                outline-none
                transition
              "
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-sm text-gray-600 block mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="
                w-full
                px-4
                py-3
                rounded-xl
                border border-gray-200
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-100
                outline-none
                transition
              "
                        />
                    </div>

                    {/* Remember + Forgot */}
                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 text-gray-500">
                            <input type="checkbox" className="accent-blue-500" />
                            Remember me
                        </label>

                        <Link href="#" className="text-blue-500 hover:underline">
                            Forgot password?
                        </Link>
                    </div>

                    {/* Button */}
                    <button
                        type="submit"
                        className="
              w-full
              bg-blue-500
              text-white
              py-3
              rounded-full
              font-medium
              hover:scale-[1.02]
              active:scale-[0.98]
              transition
            "
                    >
                        Login
                    </button>
                </form>

                {/* Bottom Text */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    Don’t have an account?{" "}
                    <Link href="#" className="text-blue-500 hover:underline">
                        Sign up
                    </Link>
                </p>
            </div>

        </div>
    );
}