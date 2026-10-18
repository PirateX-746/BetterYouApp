import { Sparkles, type LucideIcon } from "lucide-react";

export default function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 py-24 px-6">
      <div className="relative w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Icon size={28} className="text-primary" />
        <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center">
          <Sparkles size={13} />
        </span>
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        <p className="text-sm text-text-secondary max-w-sm">{description}</p>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-bg-hover text-text-disabled">
        Coming soon
      </span>
    </div>
  );
}
