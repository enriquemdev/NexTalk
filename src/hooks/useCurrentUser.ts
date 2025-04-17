"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuth, useUser } from "@clerk/nextjs";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useEffect } from "react";

export function useCurrentUser() {
  const { userId: clerkUserId, isLoaded: isAuthLoaded } = useAuth();
  const { user: clerkUser } = useUser();
  const createOrUpdateUser = useMutation(api.users.createOrUpdate);
  
  // Get the user from Convex based on the Clerk ID
  const user = useQuery(
    api.users.getByToken,
    clerkUserId ? { tokenIdentifier: `clerk:${clerkUserId}` } : "skip"
  );

  // Create a user in Convex if one doesn't exist
  useEffect(() => {
    const syncUser = async () => {
      if (clerkUserId && isAuthLoaded && !user && clerkUser) {
        try {
          // Extract name with multiple fallbacks
          let name = "";
          if (clerkUser.fullName) {
            name = clerkUser.fullName;
          } else if (clerkUser.firstName && clerkUser.lastName) {
            name = `${clerkUser.firstName} ${clerkUser.lastName}`;
          } else if (clerkUser.firstName) {
            name = clerkUser.firstName;
          } else if (clerkUser.username) {
            name = clerkUser.username;
          } else {
            name = "User";
          }
          
          // Extract email with fallbacks
          let email = "";
          if (clerkUser.primaryEmailAddress?.emailAddress) {
            email = clerkUser.primaryEmailAddress.emailAddress;
          } else if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
            for (const emailObj of clerkUser.emailAddresses) {
              if (emailObj.emailAddress) {
                email = emailObj.emailAddress;
                break;
              }
            }
          }

          await createOrUpdateUser({
            tokenIdentifier: `clerk:${clerkUserId}`,
            name,
            email,
            image: clerkUser.imageUrl,
          });
        } catch (error) {
          console.error("Failed to create user in Convex:", error);
        }
      }
    };

    syncUser();
  }, [clerkUserId, isAuthLoaded, user, clerkUser, createOrUpdateUser]);

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