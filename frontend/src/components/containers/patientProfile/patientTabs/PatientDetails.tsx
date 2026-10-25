"use client";

import { Pencil } from "lucide-react";
import { Card, CardBody, CardHeader, InfoList, InfoRow, NotRecorded } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/ui/button";
import { calculateAge, capitalizeWords, formatDate } from "@/lib/patientUtils";
import { emergencyName, emergencyPhone, type Patient } from "../types";

/** The "Patient" tab: the full demographic and contact record, grouped. */
export default function PatientDetails({ patient, onEdit }: { patient: Patient; onEdit: () => void }) {
  const edit = (
    <Button variant="ghost" size="sm" onClick={onEdit}>
      <Pencil aria-hidden /> Edit
    </Button>
  );
  const ecPhone = emergencyPhone(patient);

  return (
    <div className="grid gap-5 lg:grid-cols-2 items-start">
      <Card>
        <CardHeader title="General information" actions={edit} />
        <CardBody>
          <InfoList>
            <InfoRow label="First name">{patient.firstName ? capitalizeWords(patient.firstName) : <NotRecorded />}</InfoRow>
            <InfoRow label="Last name">{patient.lastName ? capitalizeWords(patient.lastName) : <NotRecorded />}</InfoRow>
            <InfoRow label="Gender">{patient.gender ? capitalizeWords(patient.gender) : <NotRecorded />}</InfoRow>
            <InfoRow label="Date of birth">
              {patient.dateOfBirth ? (
                <span className="tabular-nums">
                  {formatDate(patient.dateOfBirth)} <span className="text-text-secondary">· {calculateAge(patient.dateOfBirth)}</span>
                </span>
              ) : (
                <NotRecorded />
              )}
            </InfoRow>
            {patient.mrn && <InfoRow label="MRN"><span className="font-mono text-footnote">{patient.mrn}</span></InfoRow>}
            <InfoRow label="Record status">
              <Badge tone={patient.isActive !== false ? "success" : "neutral"} dot>
                {patient.isActive !== false ? "Active" : "Inactive"}
              </Badge>
            </InfoRow>
          </InfoList>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Clinical information" actions={edit} />
        <CardBody>
          <InfoList>
            <InfoRow label="Health condition">{patient.healthCondition || <NotRecorded />}</InfoRow>
            <InfoRow label="Allergies" emphasis={patient.allergies ? "warning" : undefined}>
              {patient.allergies || <NotRecorded />}
            </InfoRow>
            <InfoRow label="Blood group">{patient.bloodGroup || <NotRecorded />}</InfoRow>
            <InfoRow label="Last visit">{patient.lastVisit ? formatDate(patient.lastVisit) : <NotRecorded>No visits yet</NotRecorded>}</InfoRow>
          </InfoList>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Contact" actions={edit} />
        <CardBody>
          <InfoList>
            <InfoRow label="Phone"><span className="tabular-nums">{patient.phoneNo || <NotRecorded />}</span></InfoRow>
            <InfoRow label="Email">{patient.email || <NotRecorded />}</InfoRow>
          </InfoList>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Emergency contact" actions={edit} />
        <CardBody>
          <InfoList>
            <InfoRow label="Name">{emergencyName(patient) || <NotRecorded>Not provided</NotRecorded>}</InfoRow>
            <InfoRow label="Relationship">{patient.emergencyContactRelation || <NotRecorded />}</InfoRow>
            <InfoRow label="Phone"><span className="tabular-nums">{ecPhone || <NotRecorded />}</span></InfoRow>
          </InfoList>
        </CardBody>
      </Card>
    </div>
  );
}
