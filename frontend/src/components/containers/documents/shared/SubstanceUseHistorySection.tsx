type Props = {
    data: any;
    onChange: (field: string, value: string) => void;
};

export default function SubstanceUseHistorySection({
    data,
    onChange,
}: Props) {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-medium">
                Substance Use History
            </h2>

            <input
                placeholder="Alcohol use"
                value={data.alcoholUse || ""}
                onChange={(e) =>
                    onChange("alcoholUse", e.target.value)
                }
                className="input"
            />

            <input
                placeholder="Tobacco use"
                value={data.tobaccoUse || ""}
                onChange={(e) =>
                    onChange("tobaccoUse", e.target.value)
                }
                className="input"
            />

            <input
                placeholder="Other substances"
                value={data.otherSubstances || ""}
                onChange={(e) =>
                    onChange("otherSubstances", e.target.value)
                }
                className="input"
            />
        </div>
    );
}
