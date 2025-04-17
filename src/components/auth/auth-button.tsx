"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function AuthButton() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Loading state
  if (!isLoaded) {
    return (
      <div className="h-9 w-24 animate-pulse bg-muted rounded-md" />
    );
  }

  // Not logged in - show sign in button
  if (!user) {
    return (
      <Button
        onClick={() => router.push("/sign-in")}
        className="font-medium"
      >
        Sign In
      </Button>
    );
  }

  // Logged in - show user button
  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          userButtonAvatarBox: "h-9 w-9",
        },
      }}
    />
  );
} 