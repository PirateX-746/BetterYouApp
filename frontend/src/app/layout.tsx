import "@/styles/appointments.css";
import "@/styles/notifications.css";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg-page text-text-primary">{children}</body>
    </html>
  );
}
