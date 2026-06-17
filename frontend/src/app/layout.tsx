import "@/styles/appointments.css";
import "@/styles/notifications.css";
import "./globals.css";

import { ThemeProvider } from "@/components/containers/layout/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";

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
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){d.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
          <HotToaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: "12px",
                fontSize: "14px",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
