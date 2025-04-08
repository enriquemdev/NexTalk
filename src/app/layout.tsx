import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./context/convex-context";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { ThemeProvider } from "./providers/theme-provider";
import { ThemeToggle } from "@/components/core/theme-toggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextTalk - Real-time Audio Discussions",
  description: "Join live audio discussions with NextTalk",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ConvexClientProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              enableColorScheme
              disableTransitionOnChange
              themes={["light", "dark", "pink", "terra-theme"]}
            >
              <div className="min-h-screen bg-background">
                <header className="border-b">
                  <div className="container mx-auto py-4 px-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">NextTalk</h1>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <SignedOut>
                          <div className="flex gap-2">
                            <SignInButton />
                            <SignUpButton />
                          </div>
                        </SignedOut>
                        <SignedIn>
                          <UserButton />
                        </SignedIn>
                        <ThemeToggle />
                      </div>
                    </div>
                  </div>
                </header>
                {children}
              </div>
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
