"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import StructuredDocumentForm from "@/components/containers/documents/forms/StructuredDocumentForm";
import { DOCUMENT_FORMS } from "@/lib/documentForms";

export default function NewDocumentPage() {
    const type = useSearchParams().get("type") ?? "";
    const patientId = useParams().id as string;
    const def = DOCUMENT_FORMS[type];

    if (!def) {
        return (
            <div className="p-10 text-center space-y-2">
                <p className="text-text-primary font-medium">Unknown document type</p>
                <Link href={`/patients/${patientId}`} className="text-primary hover:underline text-sm">
                    Back to patient
                </Link>
            </div>
        );
    }
    // Keyed by type so switching types starts a fresh form.
    return <StructuredDocumentForm key={type} patientId={patientId} type={type} def={def} />;
}
