"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { toast } from "sonner";

export function AuthSync() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const createOrUpdateUser = useMutation(api.users.createOrUpdate);

  useEffect(() => {
    if (!isSignedIn || !userId || !user) return;

    // Create or update the user in Convex when auth state changes
    const syncUser = async () => {
      try {
        // Extract name with multiple fallbacks
        let name = "";
        if (user.fullName) {
          name = user.fullName;
        } else if (user.firstName && user.lastName) {
          name = `${user.firstName} ${user.lastName}`;
        } else if (user.firstName) {
          name = user.firstName;
        } else if (user.username) {
          name = user.username;
        } else if (user.emailAddresses && user.emailAddresses.length > 0) {
          // Use email prefix as last resort for name
          name = user.emailAddresses[0].emailAddress.split('@')[0];
        } else {
          name = "User";
        }
        
        // Extract email with fallbacks
        let email = "";
        if (user.primaryEmailAddress?.emailAddress) {
          email = user.primaryEmailAddress.emailAddress;
        } else if (user.emailAddresses && user.emailAddresses.length > 0) {
          for (const emailObj of user.emailAddresses) {
            if (emailObj.emailAddress) {
              email = emailObj.emailAddress;
              break;
            }
          }
        }
        
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
        toast.error("Failed to sync user data. Please try refreshing the page.");
      }
    };

    // Run sync immediately and set up an interval to sync periodically
    syncUser();
    const syncInterval = setInterval(syncUser, 5 * 60 * 1000); // Sync every 5 minutes

    // Cleanup interval on unmount
    return () => clearInterval(syncInterval);
  }, [isSignedIn, userId, user, createOrUpdateUser]);

  // This component doesn't render anything
  return null;
} 