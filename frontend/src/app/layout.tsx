import "@/styles/appointments.css";
import "@/styles/notifications.css";
import "./globals.css";

import { ThemeProvider } from "@/components/containers/layout/ThemeProvider";
import AppToaster from "@/components/containers/layout/AppToaster";
import ServiceWorkerRegister from "@/components/containers/layout/ServiceWorkerRegister";
import InstallAppPrompt from "@/components/containers/layout/InstallAppPrompt";
import { THEME_COLOR } from "@/lib/pwa";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "BetterYou – Psychology & Wellness Portal",
  description: "Appointment booking and patient management for psychology practitioners.",
  applicationName: "BetterYou",
  // Home-screen launch on iOS/iPadOS: full screen, no Safari chrome. The
  // "default" status bar keeps content below it, so the topbar needs no offset.
  appleWebApp: { capable: true, title: "BetterYou", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  // Stop iOS turning phone-number-like IDs and dates into tap-to-call links.
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Draw edge to edge; fixed bars pad themselves with env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
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
          <InstallAppPrompt />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
