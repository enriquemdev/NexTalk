"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id, Doc } from "convex/_generated/dataModel";
import { LiveKitAudioRoom } from "@/components/rooms/livekit-room";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Users2Icon, Mic, MicOff, FileText } from "lucide-react";
import { RoomHeader } from "@/components/rooms/chat/room-header";
import { MessageList } from "@/components/rooms/chat/message-list";
import { MessageInput } from "@/components/rooms/chat/message-input";
import { SummaryRoomModal } from "@/components/rooms/chat/summary-room-modal";

interface RoomClientComponentProps {
  roomId: Id<"rooms">;
}

const RoomClientComponent: React.FC<RoomClientComponentProps> = ({
  roomId,
}) => {
  const { userId, user } = useCurrentUser();
  const { toast } = useToast();

  // Fetch room data
  const room = useQuery(api.rooms.get, { roomId });

  // Fetch room participants
  const participants = useQuery(api.rooms.getParticipants, { roomId }) || [];

  // Get room creator data
  const creatorId = room?.createdBy;
  const roomCreator = useQuery(
    api.users.get,
    creatorId ? { userId: creatorId } : "skip"
  );

  // Get all participant user data in one batch
  const participantUserIds = useMemo(() => {
    return participants.filter((p) => !p.leftAt).map((p) => p.userId);
  }, [participants]);

  // Fetch all participant user data
  const participantUsers =
    useQuery(
      api.users.getMultiple,
      participantUserIds.length > 0 ? { userIds: participantUserIds } : "skip"
    ) || [];

  // Create a map of user data for easy lookup
  const userDataMap = useMemo(() => {
    const map = new Map<Id<"users">, Doc<"users">>();
    participantUsers.forEach((user) => {
      if (user) map.set(user._id, user);
    });
    return map;
  }, [participantUsers]);

  // Mutations
  const joinRoomMutation = useMutation(api.rooms.joinRoom);
  const leaveRoomMutation = useMutation(api.rooms.leaveRoom);
  const deleteRoomMutation = useMutation(api.rooms.deleteRoom);

  // State
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [myParticipantId, setMyParticipantId] =
    useState<Id<"roomParticipants"> | null>(null);
  const [showLiveKit, setShowLiveKit] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);

  // Find my participant record
  const myParticipant = participants.find(
    (p) => p.userId === userId && !p.leftAt
  );

  // Join the room
  const joinRoom = async () => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to join a room",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      // Join room in database
      const participantId = await joinRoomMutation({ roomId, userId });
      setMyParticipantId(participantId);
      setShowLiveKit(true);

      toast({
        title: "Joined Room",
        description: "You've successfully joined the audio room",
      });
    } catch (error) {
      console.error("Failed to join room:", error);
      toast({
        title: "Failed to Join",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  // Leave the room
  const leaveRoom = async () => {
    if (!myParticipantId) return;

    // Reset confirm state if it was open
    setConfirmLeave(false);
    setIsLeaving(true);

    try {
      await leaveRoomMutation({ participantId: myParticipantId });

      // Hide LiveKit room
      setShowLiveKit(false);

      toast({
        title: "Left Room",
        description: "You've left the audio room",
      });

      setMyParticipantId(null);
    } catch (error) {
      console.error("Failed to leave room:", error);
      toast({
        title: "Error",
        description: "Failed to leave room properly",
        variant: "destructive",
      });
    } finally {
      setIsLeaving(false);
    }
  };

  // Delete the room
  const deleteRoom = async () => {
    if (!userId || !room) return;

    setIsDeleting(true);

    try {
      // First, leave the room if we're in it
      if (myParticipantId) {
        await leaveRoomMutation({ participantId: myParticipantId });
        setShowLiveKit(false);
        setMyParticipantId(null);
      }

      // Then delete the room
      await deleteRoomMutation({ roomId, userId });

      toast({
        title: "Room Deleted",
        description: "The room has been deleted successfully",
      });

      // Navigate back to home page
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to delete room:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete room",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  // Clean up when leaving the page
  useEffect(() => {
    return () => {
      // If user navigates away, leave the room
      if (myParticipantId) {
        leaveRoom();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myParticipantId]);

  const handleMicToggle = () => {
    if (!user) return;

    const newMuteState = !isMicMuted;
    setIsMicMuted(newMuteState);

    if (newMuteState) {
      toast({ title: "Microphone muted" });
    } else {
      toast({ title: "Microphone unmuted" });
    }
  };

  // Add a LiveKit connection handler
  const handleMicrophoneStatusChange = (muted: boolean) => {
    if (isMicMuted !== muted) {
      setIsMicMuted(muted);
    }
  };

  // Add an effect to monitor microphone status changes
  useEffect(() => {
    // Empty effect, we just want to trigger toasts in the handleMicToggle function directly
  }, [isMicMuted]);

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
          <div className="border-t border-gray-200 px-4 pt-8 pb-4 bg-background mt-8">
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
