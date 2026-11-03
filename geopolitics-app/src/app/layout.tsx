import { Suspense } from "react";
import type { Metadata } from "next";
import Script from "next/script";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import TourGuide from "@/components/TourGuide";

export const metadata: Metadata = {
  title: "Geopolitics",
  description: "A single-player conquer-the-world strategy game",
};

// Runs before the page is painted, so there is no flash of the wrong theme.
// Uses the saved choice, otherwise the computer's light/dark setting.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <AuthProvider>
          <Suspense fallback={<div className="h-[76px]" />}>
            <NavBar />
          </Suspense>
          {children}
          <Footer />
          <TourGuide />
        </AuthProvider>
      </body>
    </html>
  );
}
