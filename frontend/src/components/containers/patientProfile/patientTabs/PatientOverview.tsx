"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardBody, CardHeader, InfoList, InfoRow, NotRecorded } from "@/components/common/Card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/patientUtils";
import ProgressScoreChart from "../ProgressScoreChart";
import RecentActivity from "./RecentActivity";
import { emergencyName, emergencyPhone, type Patient } from "../types";

/**
 * The patient "Dashboard" tab: the clinically important facts first
 * (allergies, condition), then the progress trend and recent activity. Everything here
 * is read straight from the record — no derived interpretation.
 */
export default function PatientOverview({
  patient,
  patientId,
  onOpenTab,
}: {
  patient: Patient;
  patientId: string;
  onOpenTab: (tab: "patient") => void;
}) {
  const ecName = emergencyName(patient);
  const ecPhone = emergencyPhone(patient);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] items-start">
      <div className="space-y-5 min-w-0">
        {/* Renders nothing until the patient has two or more scored notes. */}
        <ProgressScoreChart patientId={patientId} />

        {/* Date-grouped timeline of everything — upcoming first (was the Timeline tab). */}
        <RecentActivity />
      </div>

      <div className="space-y-5 min-w-0">
        <Card>
          <CardHeader
            title="Clinical summary"
            actions={
              <Button variant="ghost" size="sm" onClick={() => onOpenTab("patient")}>
                Details
              </Button>
            }
          />
          <CardBody>
            {patient.allergies ? (
              <div role="note" className="flex items-start gap-2.5 rounded-xl bg-warning-light px-3.5 py-3 mb-4">
                <AlertTriangle size={16} className="text-warning-strong mt-0.5 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="text-caption font-semibold text-warning-strong">Allergies</p>
                  <p className="text-body font-medium text-text-primary break-words">{patient.allergies}</p>
                </div>
              </div>
            ) : null}
            <InfoList>
              <InfoRow label="Condition">{patient.healthCondition || <NotRecorded />}</InfoRow>
              {!patient.allergies && <InfoRow label="Allergies"><NotRecorded /></InfoRow>}
              <InfoRow label="Blood group">{patient.bloodGroup || <NotRecorded />}</InfoRow>
              <InfoRow label="Last visit">{patient.lastVisit ? formatDate(patient.lastVisit) : <NotRecorded>No visits yet</NotRecorded>}</InfoRow>
            </InfoList>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Contact" />
          <CardBody>
            <InfoList>
              <InfoRow label="Phone">{patient.phoneNo || <NotRecorded />}</InfoRow>
              <InfoRow label="Email">{patient.email || <NotRecorded />}</InfoRow>
              <InfoRow label="Emergency">
                {ecName ? (
                  <>
                    {ecName}
                    {patient.emergencyContactRelation && <span className="text-text-secondary"> · {patient.emergencyContactRelation}</span>}
                    {ecPhone && <span className="block text-footnote text-text-secondary tabular-nums">{ecPhone}</span>}
                  </>
                ) : (
                  <NotRecorded>Not provided</NotRecorded>
                )}
              </InfoRow>
            </InfoList>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
