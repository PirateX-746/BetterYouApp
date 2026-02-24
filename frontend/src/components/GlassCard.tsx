export default function GlassCard({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            className="
      backdrop-blur-2xl
      bg-white/70
      border border-blue-100/40
      rounded-3xl
      shadow-[0_25px_60px_rgba(15,23,42,0.12)]
      p-8
    "
        >
            {children}
        </div>
    );
}