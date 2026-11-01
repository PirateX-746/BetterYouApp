/**
 * Structured clinical document forms, one definition per document type.
 *
 * A saved document's `content` is `{ [section.key]: { [field.key]: value } }`
 * — empty fields and sections are dropped — which DocumentSheet's generic
 * renderer shows as headed sections of label/value pairs (keys are
 * humanized: "chiefComplaint" → "Chief Complaint"), so keys are chosen to
 * read well there.
 */

export type DocField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "select" | "date" | "number";
  options?: string[];
  required?: boolean;
  /** Textarea height. */
  rows?: number;
  hint?: string;
  placeholder?: string;
  /** Spans both columns (textareas always do). */
  wide?: boolean;
  /** Shown only when another field in the same section has one of these values. */
  showIf?: { field: string; in: string[] };
};

export type DocSection = {
  key: string;
  title: string;
  description?: string;
  fields: DocField[];
};

export type DocFormDef = {
  title: string;
  subtitle: string;
  /** Label of the document date field. */
  dateLabel: string;
  sections: DocSection[];
};

const RISK_LEVEL = ["Low", "Moderate", "High", "Imminent"];
const SESSION_MODE = ["In person", "Video", "Phone"];
const IDEATION = ["None", "Passive", "Active"];
const YES_NO = ["Yes", "No"];

const t = (key: string, label: string, extra: Partial<DocField> = {}): DocField => ({ key, label, kind: "text", ...extra });
const ta = (key: string, label: string, extra: Partial<DocField> = {}): DocField => ({ key, label, kind: "textarea", ...extra });
const sel = (key: string, label: string, options: string[], extra: Partial<DocField> = {}): DocField => ({
  key,
  label,
  kind: "select",
  options,
  ...extra,
});

/** Session basics shared by the session-note forms. */
const sessionDetails = (extra: DocField[] = []): DocSection => ({
  key: "sessionDetails",
  title: "Session details",
  fields: [
    sel("mode", "Mode", SESSION_MODE),
    { key: "durationMinutes", label: "Duration (minutes)", kind: "number" },
    ...extra,
  ],
});

export const DOCUMENT_FORMS: Record<string, DocFormDef> = {
  "initial-evaluation": {
    title: "Initial Evaluation",
    subtitle: "Intake assessment: history, mental state and initial formulation",
    dateLabel: "Evaluation date",
    sections: [
      {
        key: "referral",
        title: "Referral",
        fields: [
          t("referralSource", "Referral source", { placeholder: "Self, GP, psychiatrist, family…" }),
          ta("reasonForReferral", "Reason for referral", { rows: 2 }),
        ],
      },
      {
        key: "demographics",
        title: "Background",
        fields: [
          t("occupation", "Occupation"),
          sel("maritalStatus", "Marital status", ["Single", "Married", "In a relationship", "Separated", "Divorced", "Widowed"]),
          t("education", "Education"),
          t("livingSituation", "Living situation", { placeholder: "e.g. Lives with parents" }),
        ],
      },
      {
        key: "presentingProblem",
        title: "Presenting problem",
        fields: [
          ta("chiefComplaint", "Chief complaint", { required: true, hint: "In the patient's own words where possible" }),
          ta("historyOfPresentIllness", "History of present illness", { rows: 4 }),
          t("duration", "Duration of symptoms", { placeholder: "e.g. 6 months" }),
        ],
      },
      {
        key: "history",
        title: "History",
        fields: [
          ta("pastPsychiatricHistory", "Past psychiatric history"),
          ta("medicalHistory", "Medical history"),
          ta("currentMedications", "Current medications", { rows: 2 }),
          ta("familyHistory", "Family psychiatric history"),
          ta("substanceUse", "Substance use", { rows: 2, placeholder: "Alcohol, tobacco, cannabis, other — amount and frequency" }),
          ta("personalAndSocialHistory", "Personal & social history", { hint: "Development, relationships, work, significant events" }),
        ],
      },
      {
        key: "mentalStatusExamination",
        title: "Mental status examination",
        fields: [
          sel("appearance", "Appearance", ["Well groomed", "Appropriately dressed", "Dishevelled", "Poor hygiene"]),
          sel("behaviour", "Behaviour", ["Cooperative", "Guarded", "Withdrawn", "Agitated", "Hostile"]),
          sel("psychomotor", "Psychomotor activity", ["Normal", "Agitated", "Retarded", "Restless"]),
          sel("speech", "Speech", ["Normal", "Pressured", "Slow", "Soft", "Loud", "Mute"]),
          sel("mood", "Mood", ["Euthymic", "Depressed", "Anxious", "Irritable", "Elevated"]),
          sel("moodSeverity", "Mood severity", ["Mild", "Moderate", "Severe"], { showIf: { field: "mood", in: ["Depressed", "Anxious", "Irritable", "Elevated"] } }),
          sel("affect", "Affect", ["Full range", "Restricted", "Blunted", "Flat", "Labile", "Incongruent"]),
          sel("thoughtProcess", "Thought process", ["Logical", "Circumstantial", "Tangential", "Flight of ideas", "Disorganised"]),
          t("thoughtContent", "Thought content", { placeholder: "Preoccupations, obsessions, delusions…" }),
          sel("perception", "Perception", ["No abnormality", "Auditory hallucinations", "Visual hallucinations", "Other"]),
          sel("orientation", "Orientation", ["Oriented ×3", "Partially oriented", "Disoriented"]),
          sel("attentionAndMemory", "Attention & memory", ["Intact", "Mildly impaired", "Impaired"]),
          sel("insight", "Insight", ["Good", "Partial", "Poor", "Absent"]),
          sel("judgment", "Judgment", ["Intact", "Fair", "Impaired"]),
        ],
      },
      {
        key: "riskScreening",
        title: "Risk screening",
        fields: [
          sel("suicidalIdeation", "Suicidal ideation", IDEATION),
          sel("selfHarm", "Self-harm", ["None", "Past history", "Recent"]),
          sel("harmToOthers", "Thoughts of harming others", IDEATION),
          sel("overallRisk", "Overall risk", RISK_LEVEL, { required: true }),
          ta("riskNotes", "Risk notes", { rows: 2 }),
        ],
      },
      {
        key: "clinicalImpression",
        title: "Clinical impression",
        fields: [
          ta("provisionalDiagnosis", "Provisional diagnosis", { rows: 2, hint: "ICD-11 / DSM-5-TR" }),
          ta("formulation", "Formulation", { rows: 4 }),
        ],
      },
      {
        key: "plan",
        title: "Plan",
        fields: [
          ta("treatmentPlan", "Treatment plan", { required: true }),
          t("sessionFrequency", "Session frequency", { placeholder: "e.g. Weekly" }),
          ta("referrals", "Referrals", { rows: 2 }),
        ],
      },
    ],
  },

  "risk-assessment": {
    title: "Risk Assessment",
    subtitle: "Suicide, self-harm and harm-to-others risk",
    dateLabel: "Assessment date",
    sections: [
      {
        key: "suicideRisk",
        title: "Suicide risk",
        fields: [
          sel("suicidalIdeation", "Suicidal ideation", IDEATION, { required: true }),
          sel("intent", "Intent", ["No intent", "Uncertain", "Clear intent"], { required: true, showIf: { field: "suicidalIdeation", in: ["Active"] } }),
          sel("plan", "Plan", ["No plan", "Vague plan", "Specific plan"], { required: true, showIf: { field: "suicidalIdeation", in: ["Active"] } }),
          sel("accessToMeans", "Access to means", ["No access", "Limited access", "Has access"], { required: true, showIf: { field: "suicidalIdeation", in: ["Active"] } }),
          sel("previousAttempts", "Previous attempts", ["None", "One", "Multiple"]),
          ta("details", "Details", { rows: 2 }),
        ],
      },
      {
        key: "selfHarmAndOthers",
        title: "Self-harm & harm to others",
        fields: [
          sel("selfHarm", "Self-harm", ["None", "Past history", "Recent incident"]),
          sel("harmToOthers", "Thoughts of harming others", IDEATION),
          ta("details", "Details", { rows: 2 }),
        ],
      },
      {
        key: "factors",
        title: "Risk & protective factors",
        fields: [
          ta("riskFactors", "Risk factors", { hint: "e.g. recent loss, isolation, substance use, chronic illness" }),
          ta("protectiveFactors", "Protective factors", { hint: "e.g. family support, reasons for living, engagement in care" }),
        ],
      },
      {
        key: "formulation",
        title: "Risk formulation",
        fields: [
          sel("overallRisk", "Overall risk level", RISK_LEVEL, { required: true }),
          sel("safetyPlanAgreed", "Safety plan agreed", YES_NO),
          ta("actionPlan", "Immediate action plan", { required: true }),
          t("reviewBy", "Review", { placeholder: "e.g. Next session, or within 48 hours" }),
        ],
      },
    ],
  },

  "follow-up-note": {
    title: "Follow-Up Session Note",
    subtitle: "Review of progress since the last session",
    dateLabel: "Session date",
    sections: [
      sessionDetails(),
      {
        key: "progress",
        title: "Progress since last session",
        fields: [
          ta("patientReport", "Patient report", { required: true }),
          sel("moodRating", "Mood (0 = worst, 10 = best)", ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]),
          sel("overallChange", "Overall change", ["Improved", "No change", "Worse"]),
          sel("sleep", "Sleep", ["Good", "Fair", "Poor"]),
          sel("appetite", "Appetite", ["Normal", "Increased", "Decreased"]),
          sel("medicationAdherence", "Medication adherence", ["Not on medication", "Good", "Partial", "Poor"]),
          ta("sideEffects", "Side effects", { rows: 2 }),
        ],
      },
      {
        key: "observations",
        title: "Clinical observations",
        fields: [
          ta("mentalState", "Mental state", { rows: 3 }),
          sel("riskLevel", "Current risk", RISK_LEVEL),
        ],
      },
      {
        key: "plan",
        title: "Plan",
        fields: [
          ta("plan", "Plan", { required: true }),
          { key: "nextFollowUp", label: "Next follow-up", kind: "date" },
        ],
      },
    ],
  },

  "individual-therapy-session": {
    title: "Individual Therapy Session",
    subtitle: "Session content, interventions and response",
    dateLabel: "Session date",
    sections: [
      sessionDetails([
        { key: "sessionNumber", label: "Session number", kind: "number" },
        sel("approach", "Therapeutic approach", [
          "CBT",
          "DBT",
          "ACT",
          "Psychodynamic",
          "Person-centred",
          "EMDR",
          "Schema therapy",
          "Solution-focused",
          "Supportive",
          "Integrative",
          "Other",
        ]),
      ]),
      {
        key: "sessionContent",
        title: "Session content",
        fields: [
          ta("focus", "Focus of session", { required: true }),
          ta("goalsAddressed", "Treatment goals addressed", { rows: 2 }),
          ta("interventions", "Interventions used", { required: true }),
          ta("patientResponse", "Patient response", { hint: "Engagement, insight, emotional response" }),
        ],
      },
      {
        key: "status",
        title: "Status",
        fields: [
          t("moodAndAffect", "Mood & affect"),
          sel("riskLevel", "Current risk", RISK_LEVEL),
        ],
      },
      {
        key: "plan",
        title: "Plan",
        fields: [
          ta("homework", "Homework / between-session tasks", { rows: 2 }),
          ta("nextSessionPlan", "Plan for next session", { rows: 2 }),
        ],
      },
    ],
  },

  "crisis-intervention": {
    title: "Crisis Intervention Note",
    subtitle: "Acute crisis: assessment, intervention and outcome",
    dateLabel: "Date of crisis contact",
    sections: [
      {
        key: "crisis",
        title: "Crisis",
        fields: [
          sel("contactType", "Contact", ["In person", "Phone", "Video", "Emergency department"]),
          sel("natureOfCrisis", "Nature of crisis", [
            "Suicidal crisis",
            "Self-harm",
            "Panic / acute anxiety",
            "Psychotic symptoms",
            "Aggression / agitation",
            "Abuse or trauma disclosure",
            "Substance-related",
            "Other",
          ], { required: true }),
          ta("presentingSituation", "Presenting situation", { required: true, rows: 4 }),
          ta("precipitatingFactors", "Precipitating factors", { rows: 2 }),
        ],
      },
      {
        key: "riskAssessment",
        title: "Risk assessment",
        fields: [
          sel("suicidalIdeation", "Suicidal ideation", IDEATION),
          sel("planOrIntent", "Plan or intent", ["None", "Plan without intent", "Plan with intent"], { showIf: { field: "suicidalIdeation", in: ["Active"] } }),
          sel("accessToMeans", "Access to means", ["No access", "Limited access", "Has access"], { showIf: { field: "suicidalIdeation", in: ["Active"] } }),
          sel("harmToOthers", "Risk to others", IDEATION),
          sel("riskLevel", "Risk level", RISK_LEVEL, { required: true }),
        ],
      },
      {
        key: "intervention",
        title: "Intervention",
        fields: [
          ta("interventionsProvided", "Interventions provided", { required: true, hint: "De-escalation, safety planning, means restriction…" }),
          ta("safetyPlan", "Safety plan", { rows: 3 }),
          ta("peopleContacted", "People contacted", { rows: 2, hint: "Family, emergency contact, emergency services, psychiatrist" }),
          sel("referral", "Referral", ["None", "Psychiatrist", "Emergency department", "Inpatient admission", "Crisis helpline", "Other"]),
        ],
      },
      {
        key: "outcome",
        title: "Outcome",
        fields: [
          ta("disposition", "Outcome / disposition", { required: true, rows: 2 }),
          ta("followUpPlan", "Follow-up plan", { required: true, rows: 2 }),
        ],
      },
    ],
  },

  "medication-review": {
    title: "Medication Review",
    subtitle: "Effectiveness, adherence and side effects of current medication",
    dateLabel: "Review date",
    sections: [
      {
        key: "currentMedication",
        title: "Current medication",
        fields: [
          ta("medications", "Medications, doses & frequency", { required: true, rows: 4 }),
          t("prescriber", "Prescriber"),
        ],
      },
      {
        key: "review",
        title: "Review",
        fields: [
          sel("adherence", "Adherence", ["Good", "Partial", "Poor"], { required: true }),
          sel("effectiveness", "Effectiveness", ["Good response", "Partial response", "No response", "Too early to judge"], { required: true }),
          ta("sideEffects", "Side effects", { rows: 2 }),
          ta("patientConcerns", "Patient concerns", { rows: 2 }),
          t("bloodPressure", "Blood pressure", { placeholder: "e.g. 120/80" }),
          t("weight", "Weight", { placeholder: "e.g. 68 kg" }),
          ta("labResults", "Relevant lab results", { rows: 2 }),
        ],
      },
      {
        key: "outcome",
        title: "Outcome",
        fields: [
          sel("decision", "Decision", ["Continue unchanged", "Dose increased", "Dose decreased", "Medication started", "Medication stopped", "Switched medication", "Referred to prescriber"], { required: true }),
          ta("changeDetails", "Details of changes", { rows: 2 }),
          ta("rationale", "Rationale", { rows: 2 }),
          { key: "nextReview", label: "Next review", kind: "date" },
        ],
      },
    ],
  },

  "discharge-summary": {
    title: "Discharge Summary",
    subtitle: "End of treatment: course, status at discharge and aftercare",
    dateLabel: "Discharge date",
    sections: [
      {
        key: "treatment",
        title: "Treatment episode",
        fields: [
          { key: "treatmentStarted", label: "Treatment started", kind: "date" },
          { key: "sessionsAttended", label: "Sessions attended", kind: "number" },
          ta("reasonForReferral", "Reason for referral", { rows: 2 }),
          ta("diagnosis", "Diagnosis", { rows: 2 }),
          ta("courseOfTreatment", "Course of treatment", { required: true, rows: 4 }),
          sel("goalsAchieved", "Treatment goals", ["Fully achieved", "Partially achieved", "Not achieved"]),
        ],
      },
      {
        key: "discharge",
        title: "Discharge",
        fields: [
          sel("reason", "Reason for discharge", [
            "Treatment goals met",
            "Patient's request",
            "Referred elsewhere",
            "Did not return",
            "Moved away",
            "Other",
          ], { required: true }),
          ta("conditionAtDischarge", "Condition at discharge", { required: true }),
          sel("riskLevel", "Risk at discharge", RISK_LEVEL),
        ],
      },
      {
        key: "aftercare",
        title: "Aftercare",
        fields: [
          ta("recommendations", "Recommendations", { required: true }),
          ta("medicationsAtDischarge", "Medications at discharge", { rows: 2 }),
          ta("referrals", "Referrals", { rows: 2 }),
          ta("relapsePrevention", "Relapse prevention & warning signs", { rows: 3 }),
        ],
      },
    ],
  },

  "progress-note-soap": {
    title: "Progress Note (SOAP)",
    subtitle: "Subjective, objective, assessment, plan",
    dateLabel: "Session date",
    sections: [
      sessionDetails(),
      {
        key: "soap",
        title: "SOAP",
        fields: [
          ta("subjective", "Subjective", { required: true, rows: 4, hint: "What the patient reports: symptoms, events, concerns" }),
          ta("objective", "Objective", { required: true, rows: 4, hint: "What you observed: appearance, mood, affect, behaviour, scores" }),
          ta("assessment", "Assessment", { required: true, rows: 4, hint: "Your clinical interpretation and progress toward goals" }),
          ta("plan", "Plan", { required: true, rows: 3, hint: "Next steps, homework, next session" }),
        ],
      },
      {
        key: "risk",
        title: "Risk",
        fields: [sel("riskLevel", "Current risk", RISK_LEVEL)],
      },
    ],
  },

  "psych-testing-report": {
    title: "Psychological Testing Report",
    subtitle: "Assessment battery, results and recommendations",
    dateLabel: "Report date",
    sections: [
      {
        key: "referral",
        title: "Referral",
        fields: [
          t("referredBy", "Referred by"),
          ta("referralQuestion", "Referral question", { required: true, rows: 2 }),
          ta("backgroundInformation", "Background information", { rows: 3 }),
        ],
      },
      {
        key: "assessment",
        title: "Assessment",
        fields: [
          ta("testsAdministered", "Tests administered", { required: true, rows: 3, placeholder: "e.g. WAIS-IV, MMPI-2, BDI-II, Beck Anxiety Inventory" }),
          t("testingDates", "Testing dates"),
          ta("behaviouralObservations", "Behavioural observations", { rows: 3 }),
          sel("validity", "Validity of results", ["Valid", "Valid with caution", "Questionable"]),
        ],
      },
      {
        key: "findings",
        title: "Findings",
        fields: [
          ta("results", "Results & scores", { required: true, rows: 5 }),
          ta("interpretation", "Interpretation", { rows: 4 }),
          ta("diagnosticImpressions", "Diagnostic impressions", { rows: 2 }),
        ],
      },
      {
        key: "recommendations",
        title: "Recommendations",
        fields: [ta("recommendations", "Recommendations", { required: true, rows: 4 })],
      },
    ],
  },
};
