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
    localStream,
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
  const sendSignalMutation = useMutation(api.webrtc.sendSignal);
  const markSignalProcessedMutation = useMutation(api.webrtc.markSignalProcessed);

  // State
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<Id<"roomParticipants"> | null>(null);
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());

  // Get WebRTC signals meant for this user
  const webrtcSignals = useQuery(
    api.webrtc.getRoomSignals, 
    userId && roomId ? { roomId, userId } : "skip"
  ) || [];

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
      await startLocalStream();
      
      // Join room in database
      const participantId = await joinRoomMutation({ roomId, userId });
      setMyParticipantId(participantId);
      
      toast({
        title: "Joined Room",
        description: "You've successfully joined the audio room",
      });
      
      // We'll initialize connections when we see other participants
      
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
  
  // Create a peer connection for a participant
  const createPeerConnection = (participantUserId: Id<"users">) => {
    if (!userId || !localStream) return null;
    
    console.log(`Creating peer connection for participant: ${participantUserId}`);
    
    // Create a new RTCPeerConnection
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local tracks to the connection
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to the peer through signaling
        sendSignalMutation({
          roomId,
          senderUserId: userId,
          receiverUserId: participantUserId,
          type: "ice-candidate",
          payload: JSON.stringify(event.candidate),
        });
      }
    };
    
    // Handle incoming remote tracks
    peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        console.log(`Received remote stream from participant: ${participantUserId}`);
        addRemoteStream(participantUserId, event.streams[0]);
      }
    };
    
    // Store the connection
    setPeerConnections(prev => {
      const newConnections = new Map(prev);
      newConnections.set(participantUserId, peerConnection);
      return newConnections;
    });
    
    return peerConnection;
  };
  
  // Create an offer for a peer connection
  const createOffer = async (participantUserId: Id<"users">) => {
    if (!userId) return;
    
    try {
      // Get or create peer connection
      let peerConnection = peerConnections.get(participantUserId);
      if (!peerConnection) {
        peerConnection = createPeerConnection(participantUserId);
        if (!peerConnection) return;
      }
      
      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      // Send offer to peer
      if (peerConnection.localDescription) {
        await sendSignalMutation({
          roomId,
          senderUserId: userId,
          receiverUserId: participantUserId,
          type: "offer",
          payload: JSON.stringify(peerConnection.localDescription),
        });
      }
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };
  
  // Handle an offer from another participant
  const handleOffer = async (
    offerUserId: Id<"users">, 
    sessionDescription: RTCSessionDescriptionInit
  ) => {
    if (!userId || !localStream) return;
    
    try {
      // Get or create peer connection
      let peerConnection = peerConnections.get(offerUserId);
      if (!peerConnection) {
        peerConnection = createPeerConnection(offerUserId);
        if (!peerConnection) return;
      }
      
      // Set remote description from offer
      await peerConnection.setRemoteDescription(sessionDescription);
      
      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      // Send answer back to peer
      if (peerConnection.localDescription) {
        await sendSignalMutation({
          roomId,
          senderUserId: userId,
          receiverUserId: offerUserId,
          type: "answer",
          payload: JSON.stringify(peerConnection.localDescription),
        });
      }
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };
  
  // Handle an answer from another participant
  const handleAnswer = async (
    answerUserId: Id<"users">,
    sessionDescription: RTCSessionDescriptionInit
  ) => {
    try {
      const peerConnection = peerConnections.get(answerUserId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(sessionDescription);
      }
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  };
  
  // Handle an ICE candidate from another participant
  const handleIceCandidate = async (
    iceUserId: Id<"users">,
    candidate: RTCIceCandidate
  ) => {
    try {
      const peerConnection = peerConnections.get(iceUserId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  };
  
  // Process incoming WebRTC signals
  useEffect(() => {
    if (!webrtcSignals.length) return;
    
    const processSignals = async () => {
      for (const signal of webrtcSignals) {
        try {
          const { senderUserId, type, payload, _id } = signal;
          const data = JSON.parse(payload);
          
          switch (type) {
            case "offer":
              await handleOffer(senderUserId, data);
              break;
            case "answer":
              await handleAnswer(senderUserId, data);
              break;
            case "ice-candidate":
              await handleIceCandidate(senderUserId, data);
              break;
          }
          
          // Mark signal as processed
          await markSignalProcessedMutation({ signalId: _id });
        } catch (error) {
          console.error("Error processing signal:", error);
        }
      }
    };
    
    processSignals();
  }, [webrtcSignals]);
  
  // Initiate connections with new participants
  useEffect(() => {
    if (!userId || !localStream || !myParticipantId) return;
    
    // Get participants that we don't have connections with yet
    const activeParticipants = participants.filter(
      p => p.userId !== userId && !p.leftAt && !peerConnections.has(p.userId)
    );
    
    // Create connections with new participants
    activeParticipants.forEach(async (participant) => {
      await createOffer(participant.userId);
    });
  }, [participants, userId, localStream, myParticipantId, peerConnections]);
  
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