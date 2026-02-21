type Props = {
    data: any;
    onChange: (field: string, value: string) => void;
};

export default function MSESection({ data, onChange }: Props) {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-medium">
                Mental State Examination (MSE)
            </h2>

            {Object.keys(data).map((field) => (
                <textarea
                    key={field}
                    placeholder={field}
                    value={data[field]}
                    onChange={(e) => onChange(field, e.target.value)}
                    className="textarea"
                />
            ))}
        </div>
    );
}
