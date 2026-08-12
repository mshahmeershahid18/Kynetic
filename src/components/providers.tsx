"use client";

import { ThemeProvider } from "next-themes";
import { HashParser } from "./hash-parser";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <HashParser />
      {children}
    </ThemeProvider>
  );
}
