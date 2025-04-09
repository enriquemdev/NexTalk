"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useState, useEffect, useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAudioContext } from "@/providers/audio-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { MicIcon, MicOffIcon, Users2Icon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Id, Doc } from "convex/_generated/dataModel";

// STUN servers for WebRTC
const ICE_SERVERS = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "stun:stun1.l.google.com:19302",
    },
  ],
};

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as Id<"rooms">;
  const { userId } = useCurrentUser();
  const { toast } = useToast();
  
  // Audio context for WebRTC
  const {
    remoteStreams,
    isMuted,
    startLocalStream,
    stopLocalStream,
    toggleMute,
    addRemoteStream,
  } = useAudioContext();

  // Fetch room data
  const room = useQuery(api.rooms.get, { roomId });
  
  // Fetch room participants
  const participants = useQuery(api.rooms.getParticipants, { roomId }) || [];
  
  // Get room creator data
  const creatorId = room?.createdBy;
  const roomCreator = useQuery(api.users.get, creatorId ? { userId: creatorId } : "skip");
  
  // Get all participant user data in one batch
  const participantUserIds = useMemo(() => {
    return participants
      .filter(p => !p.leftAt)
      .map(p => p.userId);
  }, [participants]);
  
  // Fetch all participant user data
  const participantUsers = useQuery(
    api.users.getMultiple, 
    participantUserIds.length > 0 ? { userIds: participantUserIds } : "skip"
  ) || [];
  
  // Create a map of user data for easy lookup
  const userDataMap = useMemo(() => {
    const map = new Map<Id<"users">, Doc<"users">>();
    participantUsers.forEach(user => {
      if (user) map.set(user._id, user);
    });
    return map;
  }, [participantUsers]);
  
  // Mutations
  const joinRoomMutation = useMutation(api.rooms.joinRoom);
  const leaveRoomMutation = useMutation(api.rooms.leaveRoom);
  const toggleMuteMutation = useMutation(api.rooms.toggleMute);

  // State
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<Id<"roomParticipants"> | null>(null);
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());

  // Find my participant record
  const myParticipant = participants.find(p => p.userId === userId && !p.leftAt);
  
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
      // First get microphone access
      const stream = await startLocalStream();
      
      // Join room in database
      const participantId = await joinRoomMutation({ roomId, userId });
      setMyParticipantId(participantId);
      
      toast({
        title: "Joined Room",
        description: "You've successfully joined the audio room",
      });
      
      // Setup WebRTC connections with existing participants
      if (stream) {
        setupWebRTC(stream);
      }
      
    } catch (error) {
      console.error("Failed to join room:", error);
      toast({
        title: "Failed to Join",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      stopLocalStream();
    } finally {
      setIsJoining(false);
    }
  };
  
  // Leave the room
  const leaveRoom = async () => {
    if (!myParticipantId) return;
    
    setIsLeaving(true);
    
    try {
      await leaveRoomMutation({ participantId: myParticipantId });
      
      // Close all peer connections
      peerConnections.forEach((pc) => {
        pc.close();
      });
      setPeerConnections(new Map());
      
      // Stop local stream
      stopLocalStream();
      
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
  
  // Toggle mute status
  const handleToggleMute = async () => {
    if (!myParticipantId) return;
    
    toggleMute();
    
    try {
      await toggleMuteMutation({
        participantId: myParticipantId,
        isMuted: !isMuted,
      });
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  };
  
  // Set up WebRTC connections
  const setupWebRTC = (stream: MediaStream) => {
    // Create peer connections for each existing participant
    participants
      .filter(p => p.userId !== userId && !p.leftAt) // Only connect to other active participants
      .forEach(participant => {
        // Create and store a new peer connection
        const peerConnection = new RTCPeerConnection(ICE_SERVERS);
        
        // Add our local audio tracks to the connection
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });
        
        // Handle ICE candidates (network connection info)
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            // In a production app, you would send this candidate to the peer
            // For now, we'll log it (this would typically use a signaling system)
            console.log("ICE candidate for", participant.userId, event.candidate);
          }
        };
        
        // Handle incoming remote tracks (audio from other participants)
        peerConnection.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            addRemoteStream(participant.userId, event.streams[0]);
          }
        };
        
        // Create an offer to start the connection
        peerConnection
          .createOffer()
          .then(offer => peerConnection.setLocalDescription(offer))
          .then(() => {
            // In a production app, you would send this offer to the peer through signaling
            console.log("Created offer for", participant.userId);
          })
          .catch(error => {
            console.error("Error creating offer:", error);
          });
          
        // Store the connection
        setPeerConnections(prev => {
          const newConnections = new Map(prev);
          newConnections.set(participant.userId, peerConnection);
          return newConnections;
        });
      });
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
  
  if (!room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-2xl">Loading room...</div>
        </div>
      </div>
    );
  }
  
  const isLive = room.status === "live";
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{room.name}</h1>
              <Badge className={room.status === "live" ? "bg-green-500" : "bg-gray-500"}>
                {room.status === "live" ? "Live" : room.status === "scheduled" ? "Scheduled" : "Ended"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{room.description}</p>
            {room.startedAt && (
              <p className="text-sm text-muted-foreground mt-1">
                Started {formatDistanceToNow(room.startedAt, { addSuffix: true })}
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
              {isJoining ? "Joining..." : "Join Audio Room"}
            </Button>
          ) : (
            <Button 
              onClick={leaveRoom} 
              variant="destructive" 
              disabled={isLeaving}
              className="px-4"
            >
              {isLeaving ? "Leaving..." : "Leave Room"}
            </Button>
          )}
        </div>
      </div>
      
      {/* Room controls */}
      {myParticipant && (
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
                    size="icon" 
                    variant={isMuted ? "destructive" : "outline"} 
                    onClick={handleToggleMute}
                  >
                    {isMuted ? <MicOffIcon className="w-4 h-4" /> : <MicIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Participants list */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users2Icon className="w-5 h-5" />
          Participants ({participants.filter(p => !p.leftAt).length})
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {participants
            .filter(p => !p.leftAt)
            .map((participant) => {
              const userData = userDataMap.get(participant.userId);
              
              return (
                <Card key={participant._id.toString()} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={userData?.image || ""} alt={userData?.name || "User"} />
                        <AvatarFallback>{userData?.name?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{userData?.name || "Unknown User"}</p>
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
                            <MicOffIcon className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {/* Audio indicator - visual feedback when someone is speaking */}
                      <div className="w-2 h-2 rounded-full bg-green-500 opacity-0"></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
      
      {/* Remote audio elements - hidden but used for playback */}
      <div className="hidden">
        {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
          <audio
            key={userId}
            autoPlay
            ref={(element) => {
              if (element && stream) {
                element.srcObject = stream;
              }
            }}
          />
        ))}
      </div>
    </div>
  );
} 