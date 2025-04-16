import React, { Dispatch, SetStateAction } from "react";
import { Dialog, DialogContent, DialogHeader } from "../ui/dialog";

import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { User } from "@/infrastructure/interfaces/user";
import { cn } from "@/lib/utils";

interface UserProfileContentProps {
  selectedUser: User;
  variant?: "modal" | "inline";
  className?: string;
  showFollowButton?: boolean;
  avatarSize?: "sm" | "md" | "lg";
  onFollowChange?: () => void;
}

interface UserProfileModalProps
  extends Omit<UserProfileContentProps, "variant"> {
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
}

const getAvatarSize = (size: "sm" | "md" | "lg") => {
  switch (size) {
    case "sm":
      return "h-16 w-16";
    case "lg":
      return "h-32 w-32";
    default:
      return "h-24 w-24";
  }
};

export const UserProfileContent = ({
  selectedUser,
  variant = "modal",
  className,
  showFollowButton = true,
  avatarSize = "md",
  onFollowChange,
}: UserProfileContentProps) => {
  const { userId } = useCurrentUser();
  const followers = useQuery(api.users.getFollowers, {
    userId: selectedUser._id,
  });

  const following = useQuery(api.users.getFollowing, {
    userId: selectedUser._id,
  });

  const follow = useMutation(api.users.followUser);
  const unfollow = useMutation(api.users.unfollowUser);

  const followingUser = followers?.find((follower) => follower?._id === userId);

  const handleFollow = async () => {
    if (followingUser) {
      await unfollow({
        followerId: followingUser._id,
        followingId: selectedUser._id,
      });
    } else {
      await follow({
        followerId: userId!,
        followingId: selectedUser._id,
      });
    }
    onFollowChange?.();
  };

  const content = (
    <div
      className={cn(
        "flex flex-col items-center",
        variant === "inline" ? className : "py-4"
      )}
    >
      <div
        className={cn(
          "flex justify-center w-full items-center",
          variant === "inline" ? "flex-row gap-4" : "flex-col"
        )}
      >
        <Avatar
          className={cn(
            getAvatarSize(avatarSize),
            variant === "modal" ? "mb-4" : ""
          )}
        >
          <AvatarImage
            src={selectedUser.image || "/placeholder.svg"}
            alt={selectedUser.name}
          />
          <AvatarFallback>
            {selectedUser.name?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={cn(variant === "inline" ? "" : "text-center")}>
          <div className="text-xl font-bold">{selectedUser.name}</div>
          <div className="text-sm text-muted-foreground">
            @{selectedUser.name?.replaceAll(/\s/g, "").toLowerCase()}
          </div>
        </div>
      </div>

      <div className={cn("flex gap-4", variant === "inline" ? "mt-4" : "mb-6")}>
        <div className="text-center">
          <div className="font-bold">{followers?.length}</div>
          <div className="text-sm text-muted-foreground">Followers</div>
        </div>
        <div className="text-center">
          <div className="font-bold">{following?.length}</div>
          <div className="text-sm text-muted-foreground">Following</div>
        </div>
      </div>

      {showFollowButton && selectedUser._id !== userId && (
        <Button
          onClick={handleFollow}
          variant={followingUser ? "outline" : "default"}
          className={cn(variant === "inline" ? "mt-4" : "w-full")}
        >
          {followingUser ? "Unfollow" : "Follow"}
        </Button>
      )}
    </div>
  );

  return content;
};

export const UserProfile = ({
  isModalOpen,
  setIsModalOpen,
  ...contentProps
}: UserProfileModalProps) => {
  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <UserProfileContent variant="modal" {...contentProps} />
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
