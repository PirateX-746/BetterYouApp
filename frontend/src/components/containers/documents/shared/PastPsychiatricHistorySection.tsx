type Props = {
    data: any;
    onChange: (field: string, value: string) => void;
};

export default function PastPsychiatricHistorySection({
    data,
    onChange,
}: Props) {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-medium">
                Past Psychiatric History
            </h2>

            <textarea
                placeholder="Previous diagnoses..."
                value={data.previousDiagnoses || ""}
                onChange={(e) =>
                    onChange("previousDiagnoses", e.target.value)
                }
                rows={3}
                className="input resize-none"
            />

            <textarea
                placeholder="Previous hospitalizations..."
                value={data.hospitalizations || ""}
                onChange={(e) =>
                    onChange("hospitalizations", e.target.value)
                }
                rows={2}
                className="input resize-none"
            />

            <textarea
                placeholder="Previous medications and response..."
                value={data.previousMedications || ""}
                onChange={(e) =>
                    onChange("previousMedications", e.target.value)
                }
                rows={3}
                className="input resize-none"
            />
        </div>
    );
}
