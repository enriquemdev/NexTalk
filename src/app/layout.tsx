import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { AudioContextProvider } from "@/providers/audio-provider";
import "@livekit/components-styles";
import { AuthSync } from "@/components/auth/auth-sync";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NexTalk - Video & Chat Rooms",
  description:
    "Create a video room or join a real-time chat conversation",
  keywords: ["video rooms", "live discussions", "chat", "NexTalk"],
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
                <SonnerToaster richColors closeButton />
              </AudioContextProvider>
            </ThemeProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
