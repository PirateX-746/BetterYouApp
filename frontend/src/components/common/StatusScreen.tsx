import { BrandLogo } from "@/components/common/BrandLogo";
import { Card, CardBody } from "@/components/common/Card";

/**
 * Full-page message for states outside any portal layout: 404, a crashed
 * page, an expired link. Logo above one centred card; `actions` holds the
 * next step (one primary button, optionally a secondary beside it).
 */
export function StatusScreen({
  icon,
  title,
  message,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  actions?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg-page flex flex-col items-center justify-center px-4 py-10">
      <BrandLogo size="md" className="mb-8" />
      <Card className="w-full max-w-md">
        <CardBody className="pt-5">
          <div className="flex items-center gap-3">
            <span className="size-10 rounded-xl grid place-items-center shrink-0 bg-primary/10 text-primary">
              {icon}
            </span>
            <h1 className="text-title-3 font-semibold text-text-primary">{title}</h1>
          </div>
          <p className="text-body text-text-secondary mt-4">{message}</p>
          {actions && <div className="flex flex-wrap gap-2 mt-6">{actions}</div>}
        </CardBody>
      </Card>
    </main>
  );
}
