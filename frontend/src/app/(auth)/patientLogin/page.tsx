// Patient portal disabled for now — only Practitioner and SuperAdmin are active.
// import LoginContainer from "@/components/containers/login/LoginContainer";
import PatientPortalDisabled from "@/components/common/PatientPortalDisabled";

export default function PatientLogin() {
    return <PatientPortalDisabled />;
    // return <LoginContainer role="patient" />;
}