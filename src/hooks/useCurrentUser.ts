"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useEffect } from "react";

export function useCurrentUser() {
  const { userId: clerkUserId, isLoaded: isAuthLoaded } = useAuth();
  const createOrUpdateUser = useMutation(api.users.createOrUpdate);
  
  // Get the user from Convex based on the Clerk ID
  const user = useQuery(
    api.users.getByToken,
    clerkUserId ? { tokenIdentifier: `clerk:${clerkUserId}` } : "skip"
  );

  // Create a user in Convex if one doesn't exist
  useEffect(() => {
    const syncUser = async () => {
      if (clerkUserId && isAuthLoaded && !user) {
        try {
          await createOrUpdateUser({
            tokenIdentifier: `clerk:${clerkUserId}`,
            name: "",
            email: "",
          });
        } catch (error) {
          console.error("Failed to create user in Convex:", error);
        }
      }
    };

    syncUser();
  }, [clerkUserId, isAuthLoaded, user, createOrUpdateUser]);

  // Return null during initial loading or if not authenticated
  if (!isAuthLoaded || !clerkUserId) {
    return { 
      user: null, 
      userId: null, 
      isLoading: !isAuthLoaded 
    };
  }

  return {
    user,
    userId: user?._id as Id<"users"> | null,
    isLoading: false,
  };
} 