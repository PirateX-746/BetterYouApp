import "@/styles/appointments.css";
import "@/styles/notifications.css";
import "./globals.css";

import { ThemeProvider } from "@/components/containers/layout/ThemeProvider";
import AppToaster from "@/components/containers/layout/AppToaster";

export const metadata = {
  title: "BetterYou – Psychology & Wellness Portal",
  description: "Appointment booking and patient management for psychology practitioners.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent dark mode flash by reading localStorage before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var t=localStorage.getItem('theme');
              var d=document.documentElement;
              var wantsDark=t==='dark'||((t===null||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);
              if(wantsDark){d.classList.add('dark')}
              var accent=localStorage.getItem('accentColor');
              if(accent&&accent.toLowerCase()!=='#5b8def'&&/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(accent)){
                d.style.setProperty('--primary',accent);
                d.style.setProperty('--ring',accent);
                d.style.setProperty('--accent-foreground',accent);
              }
            }catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
