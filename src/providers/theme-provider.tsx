"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Define a more specific type for theme provider props
type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: string;
  storageKey?: string;
  themes?: string[];
  forcedTheme?: string;
  enableSystem?: boolean;
  enableColorScheme?: boolean;
  disableTransitionOnChange?: boolean;
  attribute?: string;
};

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Use type assertion to avoid type conflicts
  return <NextThemesProvider {...props as any}>{children}</NextThemesProvider>;
} 