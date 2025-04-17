import React, { Dispatch, SetStateAction } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { User } from "@/infrastructure/interfaces/user";

export const UserProfile = ({
  isModalOpen,
  setIsModalOpen,
  selectedUser,
}: {
  isModalOpen: boolean;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedUser: User;
}) => {
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
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex justify-center w-full items-center ">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage
              src={selectedUser.image || "/placeholder.svg"}
              alt={selectedUser.name}
            />
            <AvatarFallback>
              {selectedUser.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <DialogTitle className="text-xl font-bold">
            {selectedUser.name}
          </DialogTitle>
          <DialogDescription>@{selectedUser.name}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center py-4">
          <div className="flex gap-4 mb-6">
            <div className="text-center">
              <div className="font-bold">{followers?.length}</div>
              <div className="text-sm text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="font-bold">{following?.length}</div>
              <div className="text-sm text-muted-foreground">Following</div>
            </div>
          </div>

          {selectedUser._id !== userId ? (
            <Button
              onClick={handleFollow}
              variant={followingUser ? "outline" : "default"}
              className="w-full"
            >
              {}
              {followingUser ? "Unfollow" : "Follow"}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
