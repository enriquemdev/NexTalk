import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AudioContextProvider } from "@/providers/audio-provider";
import "@livekit/components-styles";
import { AuthSync } from "@/components/auth/auth-sync";
import { ThemeToggle } from "@/components/core/theme-toggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextTalk - Live Audio Discussions",
  description:
    "Join real-time audio discussions with speakers around the world",
  keywords: ["audio rooms", "live discussions", "podcasts", "NextTalk"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ClerkProvider>
          <ConvexClientProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AudioContextProvider>
                <AuthSync />
                {children}

                <Toaster />
              </AudioContextProvider>
              <AuthSync />
              <main className="min-h-screen bg-gradient-to-b from-background to-background/90">
                <header className="border-b">
                  <div className="container mx-auto py-4 px-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">NextTalk</h1>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <ThemeToggle />
                      </div>
                    </div>
                  </div>
                </header>
                {children}
              </main>
              <Toaster />
            </ThemeProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
