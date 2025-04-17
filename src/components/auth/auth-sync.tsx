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
        // Extract user information with fallbacks
        const name = user.fullName || 
                     user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 
                     user.username || 
                     "User";
        
        const email = user.primaryEmailAddress?.emailAddress || 
                      user.emailAddresses?.[0]?.emailAddress || 
                      "";
        
        // For debugging - log the data we're sending to Convex
        console.log("Syncing user data to Convex:", {
          userId,
          name,
          email,
          imageUrl: user.imageUrl
        });

        await createOrUpdateUser({
          tokenIdentifier: `clerk:${userId}`,
          name, 
          email,
          image: user.imageUrl,
        });

        console.log("User sync completed successfully");
      } catch (error) {
        console.error("Failed to sync user with Convex:", error);
      }
    };

    syncUser();
  }, [isSignedIn, userId, user, createOrUpdateUser]);

  // This component doesn't render anything
  return null;
} 