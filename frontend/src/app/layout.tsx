import "@/styles/appointments.css";
import "@/styles/notifications.css";
import "./globals.css";


import { ThemeProvider } from "@/components/containers/layout/ThemeProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
