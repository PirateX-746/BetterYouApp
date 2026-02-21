type Props = {
    data: any;
    onChange: (field: string, value: string) => void;
};

export default function RiskSummarySection({
    data,
    onChange,
}: Props) {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-medium">
                Risk Summary & Clinical Impression
            </h2>

            <textarea
                placeholder="Overall clinical risk assessment..."
                value={data.riskSummary || ""}
                onChange={(e) =>
                    onChange("riskSummary", e.target.value)
                }
                rows={4}
                className="input resize-none"
            />

            <textarea
                placeholder="Diagnostic impression..."
                value={data.diagnosis || ""}
                onChange={(e) =>
                    onChange("diagnosis", e.target.value)
                }
                rows={3}
                className="input resize-none"
            />

            <textarea
                placeholder="Treatment plan..."
                value={data.treatmentPlan || ""}
                onChange={(e) =>
                    onChange("treatmentPlan", e.target.value)
                }
                rows={3}
                className="input resize-none"
            />
        </div>
    );
}
