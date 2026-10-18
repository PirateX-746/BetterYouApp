// Patient portal disabled for now — only Practitioner and SuperAdmin are active.
// import ForgotPasswordContainer from "@/components/containers/forgot-password/ForgotPasswordContainer";
import PatientPortalDisabled from "@/components/common/PatientPortalDisabled";

export default function PatientForgotPasswordPage() {
  return <PatientPortalDisabled />;
  // return <ForgotPasswordContainer role="patient" />;
}
