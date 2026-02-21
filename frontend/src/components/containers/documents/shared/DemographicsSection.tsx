type Props = {
    data: any;
    onChange: (field: string, value: string) => void;
};

export default function DemographicsSection({ data, onChange }: Props) {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-medium">Demographics</h2>

            <input
                placeholder="Occupation"
                value={data.occupation}
                onChange={(e) => onChange("occupation", e.target.value)}
                className="input"
            />

            <input
                placeholder="Marital Status"
                value={data.maritalStatus}
                onChange={(e) => onChange("maritalStatus", e.target.value)}
                className="input"
            />

            <input
                placeholder="Education"
                value={data.education}
                onChange={(e) => onChange("education", e.target.value)}
                className="input"
            />
        </div>
    );
}
