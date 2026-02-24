import "@/styles/appointments.css";
import "@/styles/notifications.css";
import "./globals.css";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/containers/layout/ThemeProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
