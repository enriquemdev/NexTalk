"use client";

// import React, { useEffect, useState, useMemo } from "react";
// import { Button } from "@/components/ui/button";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
// import { LiveKitAudioRoom } from "@/components/rooms/livekit-room";
import { useCurrentUser } from "@/hooks/useCurrentUser";
// import { Badge } from "@/components/ui/badge";
// import { Card, CardContent } from "@/components/ui/card";
// import { formatDistanceToNow } from "date-fns";
// import { Users2Icon, Mic, MicOff, FileText } from "lucide-react";
import { RoomHeader } from "@/components/rooms/chat/room-header";
import { MessageList } from "@/components/rooms/chat/message-list";
import { MessageInput } from "@/components/rooms/chat/message-input";
import { SummaryRoomModal } from "@/components/rooms/chat/summary-room-modal";
import { Button } from "@/components/ui/button";

interface RoomClientComponentProps {
  roomId: Id<"rooms">;
}

const RoomClientComponent: React.FC<RoomClientComponentProps> = ({
  roomId,
}) => {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();

  // Fetch room data
  const room = useQuery(api.rooms.get, { roomId });

  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/sign-in");
    }
  }, [user, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-2xl">Loading...</div>
        </div>
      </div>
    );
  }

  // Show login message if not authenticated
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-4 min-h-[50vh]">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-muted-foreground text-center max-w-md">
            You need to be logged in to access this room.
          </p>
          <Button 
            onClick={() => router.push("/sign-in")}
            className="mt-4"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-2xl">Loading room...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <RoomHeader
        roomId={room._id}
        roomName={room.name}
        status={room.status as 'scheduled' | 'live' | 'ended'}
        participantCount={room.participantCount}
        isPrivate={room.isPrivate}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto p-4">
            <MessageList roomId={room._id} />
          </div>
          <div className="border-t p-4 bg-background">
            <MessageInput roomId={room._id} />
          </div>
        </div>
        {/* {showParticipants && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
            <ParticipantList participants={participants} />
          </div>
        )} */}

        <SummaryRoomModal
          roomId={room._id}
          isOpen={true}
          onOpenChange={() => {}}
        />
        {/* <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">{room.name}</h1>
                <Badge
                  className={
                    room.status === "live" ? "bg-green-500" : "bg-gray-500"
                  }
                >
                  {room.status === "live"
                    ? "Live"
                    : room.status === "scheduled"
                      ? "Scheduled"
                      : "Ended"}
                </Badge>
              </div>
              <p className="text-muted-foreground">{room.description}</p>
              {room.startedAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Started{" "}
                  {formatDistanceToNow(room.startedAt, { addSuffix: true })}
                </p>
              )}
              {roomCreator && (
                <p className="text-sm mt-2">
                  Host: {roomCreator.name || "Unknown"}
                </p>
              )}
            </div>

            {!myParticipant ? (
              <Button
                onClick={joinRoom}
                disabled={isJoining || !isLive}
                className="px-4"
              >
                {isJoining ? "Joining..." : "Join Room"}
              </Button>
            ) : (
              <div className="flex flex-wrap sm:flex-row gap-2 justify-end">
                <Button
                  onClick={leaveRoom}
                  variant="outline"
                  disabled={isLeaving}
                  className="px-4 hidden md:flex"
                >
                  {isLeaving ? "Leaving..." : "Leave Room"}
                </Button>

                {/* Only show delete button for host */}
        {/* {myParticipant.role === "host" &&
                  room &&
                  room.createdBy === userId &&
                  (confirmDelete ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setConfirmDelete(false)}
                        variant="outline"
                        className="px-3 min-h-10"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={deleteRoom}
                        variant="destructive"
                        disabled={isDeleting}
                        className="px-3 min-h-10"
                      >
                        {isDeleting ? "Deleting..." : "Confirm Delete"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setConfirmDelete(true)}
                      variant="destructive"
                      disabled={isDeleting}
                      className="px-4 min-h-10"
                    >
                      Delete Room
                    </Button>
                  ))}
              </div> */}
        {/* )} */}
        {/* </div>
        </div> */}
        {/* LiveKit Room */}
        {/* {showLiveKit && userId && (
          <div className="mb-6">
            <LiveKitAudioRoom
              roomId={roomId}
              participantName={user?.name || undefined}
              isMuted={isMicMuted}
              onMicrophoneStatusChange={handleMicrophoneStatusChange}
            />
          </div>
        )} */}
        {/* Room controls */}
        {/* {myParticipant && (
          <div className="mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {myParticipant.role === "host"
                        ? "Host"
                        : myParticipant.role === "co-host"
                          ? "Co-Host"
                          : myParticipant.role === "speaker"
                            ? "Speaker"
                            : "Listener"}
                    </Badge>
                    <span className="text-sm">You are in this room</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleMicToggle}
                      className={`p-2 rounded-full ${isMicMuted ? "bg-gray-500" : "bg-green-500"} transition-colors`}
                      aria-label={
                        isMicMuted ? "Unmute microphone" : "Mute microphone"
                      }
                    >
                      {isMicMuted ? (
                        <MicOff className="h-5 w-5" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                    </Button>

                    {confirmLeave ? (
                      <div className="flex gap-2 md:hidden">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmLeave(false)}
                          className="px-3"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={leaveRoom}
                          disabled={isLeaving}
                          className="px-3"
                        >
                          {isLeaving ? "Leaving..." : "Confirm"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmLeave(true)}
                        disabled={isLeaving}
                        className="ml-2 md:hidden"
                      >
                        Leave
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )} */}
        {/* Participants list */}
        {/* <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users2Icon className="w-5 h-5" />
            Participants ({participants.filter((p) => !p.leftAt).length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants
              .filter((p) => !p.leftAt)
              .map((participant) => {
                const userData = userDataMap.get(participant.userId);

                return (
                  <Card
                    key={participant._id.toString()}
                    className="overflow-hidden"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={userData?.image || ""}
                            alt={userData?.name || "User"}
                          />
                          <AvatarFallback>
                            {userData?.name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {userData?.name || "Unknown User"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {participant.role === "host"
                                ? "Host"
                                : participant.role === "co-host"
                                  ? "Co-Host"
                                  : participant.role === "speaker"
                                    ? "Speaker"
                                    : "Listener"}
                            </Badge>

                            {participant.isMuted && (
                              <MicOff className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default RoomClientComponent;
