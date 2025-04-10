"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";

export function AuthSync() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const createOrUpdateUser = useMutation(api.users.createOrUpdate);

  useEffect(() => {
    if (!isSignedIn || !userId || !user) return;

    // Create or update the user in Convex when auth state changes
    const syncUser = async () => {
      try {
        await createOrUpdateUser({
          tokenIdentifier: `clerk:${userId}`,
          name: user.fullName || user.username || "",
          email: user.primaryEmailAddress?.emailAddress,
          image: user.imageUrl,
        });
      } catch (error) {
        console.error("Failed to sync user with Convex:", error);
      }
    };

    syncUser();
  }, [isSignedIn, userId, user, createOrUpdateUser]);

  // This component doesn't render anything
  return null;
} 