"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  patientSignupSchema,
  PatientSignupFormValues,
} from "@/schemas/patientSignup.schema";
import { api } from "@/lib/api";

export default function PatientSignup() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PatientSignupFormValues>({
    resolver: yupResolver(patientSignupSchema),
  });

  /* ------------------------------
       Helpers
    ------------------------------ */

  // Indian phone formatter
  const formatPhone = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 10);
  };

  // Password strength calculator
  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*]/.test(password)) score++;
    return score;
  };

  const password = useWatch({
    control,
    name: "password",
    defaultValue: "",
  });
  const strength = getPasswordStrength(password);

  /* ------------------------------
       Submit
    ------------------------------ */

  const onSubmit = async (data: PatientSignupFormValues) => {
    try {
      const { confirmPassword: _, ...payload } = data;
      void _;

      await api.post("/auth/patient/signup", payload);

      // If backend returns token
      //   const { access_token, user } = res.data;

      //   localStorage.setItem("token", access_token);
      //   localStorage.setItem("userId", user.id);
      //   localStorage.setItem("role", user.role);

      //   console.log(access_token, user);

      router.push("/patientLogin");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || "Something went wrong");
    }
  };

  /* ------------------------------
       Styles
    ------------------------------ */

  const inputClass =
    "w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-100";

  const errorClass = "text-red-500 text-sm mt-1";

  /* ------------------------------
       UI
    ------------------------------ */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <div className="w-full max-w-2xl bg-white/70 backdrop-blur-2xl p-12 rounded-3xl shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold">
            Better<span className="text-blue-500">You</span>
          </h1>
          <p className="text-sm text-gray-500">
            Create your secure patient account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                placeholder="First Name"
                {...register("firstName")}
                className={inputClass}
              />
              <p className={errorClass}>{errors.firstName?.message}</p>
            </div>

            <div>
              <input
                placeholder="Last Name"
                {...register("lastName")}
                className={inputClass}
              />
              <p className={errorClass}>{errors.lastName?.message}</p>
            </div>
          </div>

          {/* DOB + Gender */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                type="date"
                {...register("dateOfBirth")}
                className={inputClass}
              />
              <p className={errorClass}>{errors.dateOfBirth?.message}</p>
            </div>

            <div>
              <select {...register("gender")} className={inputClass}>
                <option value="">Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              <p className={errorClass}>{errors.gender?.message}</p>
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                {...register("email")}
                className={inputClass}
              />
              <p className={errorClass}>{errors.email?.message}</p>
            </div>

            <div>
              <input
                placeholder="Phone Number"
                {...register("phoneNo")}
                onChange={(e) => {
                  e.target.value = formatPhone(e.target.value);
                }}
                className={inputClass}
              />
              <p className={errorClass}>{errors.phoneNo?.message}</p>
            </div>
          </div>

          {/* Medical */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <select {...register("bloodGroup")} className={inputClass}>
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
              <p className={errorClass}>{errors.bloodGroup?.message}</p>
            </div>

            <div>
              <input
                placeholder="Allergies (Optional)"
                {...register("allergies")}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <input
              placeholder="Health Condition (Optional)"
              {...register("healthCondition")}
              className={inputClass}
            />
          </div>

          {/* Password + Strength */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                type="password"
                placeholder="Password"
                {...register("password")}
                className={inputClass}
              />

              {password && (
                <div className="mt-2">
                  <div className="h-2 w-full bg-gray-200 rounded-full">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        strength === 1
                          ? "w-1/4 bg-red-500"
                          : strength === 2
                            ? "w-2/4 bg-yellow-500"
                            : strength === 3
                              ? "w-3/4 bg-blue-500"
                              : strength === 4
                                ? "w-full bg-green-500"
                                : "w-0"
                      }`}
                    />
                  </div>

                  <p className="text-xs mt-1 text-gray-500">
                    {strength === 1 && "Weak"}
                    {strength === 2 && "Fair"}
                    {strength === 3 && "Good"}
                    {strength === 4 && "Strong"}
                  </p>
                </div>
              )}

              <p className={errorClass}>{errors.password?.message}</p>
            </div>

            <div>
              <input
                type="password"
                placeholder="Confirm Password"
                {...register("confirmPassword")}
                className={inputClass}
              />
              <p className={errorClass}>{errors.confirmPassword?.message}</p>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:scale-[1.01] transition-all disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-gray-500">
          Already have an account?{" "}
          <Link
            href="/patientLogin"
            className="text-blue-500 font-medium hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
