import Link from "next/link";
import { Brain, Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Ambient glows */}
      <div className="absolute top-[-150px] left-[-150px] w-[400px] h-[400px] bg-blue-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[400px] h-[400px] bg-indigo-300 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-md backdrop-blur-2xl bg-white/80 rounded-3xl shadow-[0_25px_60px_rgba(15,23,42,0.12)] border border-white/40 p-10">
        {/* Logo */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
            <Brain className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-800">
            Better<span className="text-primary">You</span>
          </h1>
        </div>

        {/* Content */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">
            Reset your password
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Password resets for practitioner accounts are managed by your clinic
            administrator. Please contact your admin directly to have your
            password reset.
          </p>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-left space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              Contact your administrator
            </p>
            <p className="text-sm text-gray-600">
              Reach out via email or your clinic&apos;s internal communication
              system and provide your registered email address.
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link
            href="/practitionerLogin"
            className="flex items-center justify-center gap-2 w-full h-11 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
