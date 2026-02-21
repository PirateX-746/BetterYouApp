type Props = {
    data: any;
    onChange: (field: string, value: string) => void;
};

export default function PresentingComplaintsSection({
    data,
    onChange,
}: Props) {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-medium">
                Presenting Complaints
            </h2>

            <textarea
                placeholder="Primary concerns reported by patient..."
                value={data.presentingComplaint || ""}
                onChange={(e) =>
                    onChange("presentingComplaint", e.target.value)
                }
                rows={3}
                className="input resize-none"
            />

            <textarea
                placeholder="Duration of symptoms..."
                value={data.duration || ""}
                onChange={(e) =>
                    onChange("duration", e.target.value)
                }
                rows={2}
                className="input resize-none"
            />

            <textarea
                placeholder="Triggering factors..."
                value={data.triggers || ""}
                onChange={(e) =>
                    onChange("triggers", e.target.value)
                }
                rows={2}
                className="input resize-none"
            />
        </div>
    );
}
