import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Display face, used only for the wordmark and page-level headings. Keeping it
// to the weights actually used avoids shipping the rest of the family.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "Kynetic · AI Fitness Coach",
    template: "%s",
  },
  description:
    "An AI fitness coach that generates personalized workouts, counts your reps through your camera, checks your form, and adapts to every session you complete.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} flex min-h-screen flex-col`}>
        <Providers>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
