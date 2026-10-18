import { Suspense } from "react";
import { AssessmentWorkspace } from "@/components/containers/assessments/AssessmentWorkspace";

export default function AssessmentsPage() {
  return (
    <Suspense>
      <AssessmentWorkspace />
    </Suspense>
  );
}
