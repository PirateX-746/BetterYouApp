type Props = {
    data: any;
    onChange: (field: string, value: string) => void;
};

export default function FamilyHistorySection({
    data,
    onChange,
}: Props) {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-medium">
                Family Psychiatric History
            </h2>

            <textarea
                placeholder="Family history of psychiatric disorders..."
                value={data.familyPsychHistory || ""}
                onChange={(e) =>
                    onChange("familyPsychHistory", e.target.value)
                }
                rows={3}
                className="input resize-none"
            />

            <textarea
                placeholder="Family medical history..."
                value={data.familyMedicalHistory || ""}
                onChange={(e) =>
                    onChange("familyMedicalHistory", e.target.value)
                }
                rows={3}
                className="input resize-none"
            />
        </div>
    );
}
