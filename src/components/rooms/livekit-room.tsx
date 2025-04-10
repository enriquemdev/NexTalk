"use client";

import { useState, useEffect } from "react";
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useParticipants, 
  useTracks
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { getLiveKitToken, createLiveKitRoomName } from "@/services/livekit-service";
import { Id } from "convex/_generated/dataModel";

interface LiveKitRoomProps {
  roomId: Id<"rooms">;
  participantName?: string;
}

export function LiveKitAudioRoom({ roomId, participantName }: LiveKitRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const liveKitRoomName = createLiveKitRoomName(roomId);
  
  // Fetch LiveKit token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const roomToken = await getLiveKitToken(liveKitRoomName, participantName);
        setToken(roomToken);
      } catch (err) {
        console.error("Error getting token:", err);
        setError("Failed to connect to audio room");
      }
    };
    
    fetchToken();
  }, [liveKitRoomName, participantName]);
  
  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }
  
  if (!token) {
    return <div className="animate-pulse p-4">Connecting to audio room...</div>;
  }
  
  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://nextalk-nzthcprn.livekit.cloud"}
      audio={true}
      video={false}
    >
      {/* This renders the audio of other participants */}
      <RoomAudioRenderer />
      
      {/* Invisible audio management component */}
      <AudioParticipantsControl />
    </LiveKitRoom>
  );
}

// Component to control audio settings
function AudioParticipantsControl() {
  const participants = useParticipants();
  const tracks = useTracks(
    [
      { source: Track.Source.Microphone, withPlaceholder: true },
    ]
  );
  
  // Logs for debugging
  useEffect(() => {
    console.log(`Connected participants: ${participants.length}`);
    console.log(`Audio tracks: ${tracks.length}`);
  }, [participants.length, tracks.length]);
  
  return null; // This component doesn't render anything visible
} 