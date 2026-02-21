"use client";

import { useSearchParams, useParams } from "next/navigation";
import InitialEvaluationForm from "@/components/containers/documents/forms/InitialEvaluationForm";
import RiskAssessmentForm from "@/components/containers/documents/forms/RiskAssessmentForm";

export default function NewDocumentPage() {
    const searchParams = useSearchParams();
    const params = useParams();

    const type = searchParams.get("type");
    const patientId = params.id as string;

    switch (type) {
        case "initial-evaluation":
            return <InitialEvaluationForm patientId={patientId} />;

        case "risk-assessment":
            return <RiskAssessmentForm patientId={patientId} />;

        default:
            return (
                <div className="p-10 text-center">
                    Form not implemented
                </div>
            );
    }
}
