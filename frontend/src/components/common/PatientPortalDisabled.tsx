import Link from "next/link";

/**
 * Standing in for the patient portal while it's disabled — only Practitioner
 * and SuperAdmin are active for now. Swap the callers below back to the real
 * pages to bring the patient portal back.
 */
export default function PatientPortalDisabled() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page text-text-primary p-6">
      <div className="text-center space-y-3 max-w-sm">
        <h1 className="text-xl font-semibold">Patient portal unavailable</h1>
        <p className="text-text-secondary text-sm">
          The patient portal isn&apos;t available right now. If you&apos;re a practitioner or admin, sign in below.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <Link href="/practitionerLogin" className="text-primary hover:underline text-sm">
            Practitioner sign in
          </Link>
          <Link href="/adminLogin" className="text-primary hover:underline text-sm">
            Admin sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
