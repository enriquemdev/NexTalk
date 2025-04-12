"use client";

import { useState, useEffect } from "react";
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useParticipants, 
  useTracks,
  useLocalParticipant
} from "@livekit/components-react";
import { Track, TrackPublication } from "livekit-client";
import { getLiveKitToken, createLiveKitRoomName } from "@/services/livekit-service";
import { Id } from "convex/_generated/dataModel";

interface LiveKitRoomProps {
  roomId: Id<"rooms">;
  participantName?: string;
  isMuted?: boolean;
  onMicrophoneStatusChange?: (isMuted: boolean) => void;
}

export function LiveKitAudioRoom({ 
  roomId, 
  participantName, 
  isMuted = false,
  onMicrophoneStatusChange
}: LiveKitRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  
  const liveKitRoomName = createLiveKitRoomName(roomId);
  
  // Fetch LiveKit token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        setIsConnecting(true);
        const roomToken = await getLiveKitToken(liveKitRoomName, participantName);
        console.log('Token received for room:', liveKitRoomName);
        setToken(roomToken);
        setIsConnecting(false);
      } catch (err) {
        console.error("Error getting token:", err);
        setError("Failed to connect to audio room");
        setIsConnecting(false);
      }
    };
    
    fetchToken();
  }, [liveKitRoomName, participantName]);
  
  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }
  
  if (isConnecting || !token) {
    return <div className="animate-pulse p-4">Connecting to audio room...</div>;
  }
  
  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      audio={true}
      video={false}
      connect={true}
      onError={(error) => {
        console.error("LiveKit connection error:", error);
        setError("Error connecting to audio room");
      }}
    >
      {/* This renders the audio of other participants */}
      <RoomAudioRenderer />
      
      {/* Invisible audio management component */}
      <AudioParticipantsControl 
        isMuted={isMuted} 
        onMicrophoneStatusChange={onMicrophoneStatusChange}
      />
    </LiveKitRoom>
  );
}

// Component to control audio settings
function AudioParticipantsControl({ 
  isMuted = false,
  onMicrophoneStatusChange
}: { 
  isMuted?: boolean;
  onMicrophoneStatusChange?: (isMuted: boolean) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const tracks = useTracks(
    [
      { source: Track.Source.Microphone, withPlaceholder: true },
    ]
  );
  
  // Initial mic setup when participant connects
  useEffect(() => {
    if (localParticipant) {
      console.log('Local participant connected:', localParticipant.identity);
      // Apply initial mic state when first connected
      localParticipant.setMicrophoneEnabled(!isMuted);
      
      // Check the actual state and sync with UI if needed
      if (onMicrophoneStatusChange) {
        // Use a short delay to ensure track is published
        const timer = setTimeout(() => {
          const micTrack = localParticipant.getTrackPublications().find(
            pub => pub.source === Track.Source.Microphone
          );
          if (micTrack) {
            console.log('Microphone track found:', micTrack.isMuted ? 'Muted' : 'Unmuted');
            if (micTrack.isMuted !== isMuted && onMicrophoneStatusChange) {
              onMicrophoneStatusChange(micTrack.isMuted);
            }
          } else {
            console.log('No microphone track found for local participant');
          }
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [localParticipant, isMuted, onMicrophoneStatusChange]);
  
  // Handle mute state changes
  useEffect(() => {
    if (localParticipant) {
      console.log('Setting microphone state to:', isMuted ? 'Muted' : 'Unmuted');
      localParticipant.setMicrophoneEnabled(!isMuted);
    }
  }, [isMuted, localParticipant]);
  
  // Notify parent component when microphone state changes
  useEffect(() => {
    if (!localParticipant || !onMicrophoneStatusChange) return;
    
    const handleMuteChanged = (pub: TrackPublication) => {
      if (pub.source === Track.Source.Microphone) {
        console.log('Microphone state changed:', pub.isMuted ? 'Muted' : 'Unmuted');
        onMicrophoneStatusChange(pub.isMuted);
      }
    };
    
    localParticipant.on('trackMuted', handleMuteChanged);
    localParticipant.on('trackUnmuted', handleMuteChanged);
    
    return () => {
      localParticipant.off('trackMuted', handleMuteChanged);
      localParticipant.off('trackUnmuted', handleMuteChanged);
    };
  }, [localParticipant, onMicrophoneStatusChange]);
  
  // Logs for debugging
  useEffect(() => {
    console.log(`Connected participants: ${participants.length}`);
    console.log(`Audio tracks: ${tracks.length}`);
    participants.forEach(participant => {
      console.log(`Participant: ${participant.identity}, Audio tracks: ${participant.getTrackPublications().filter(pub => pub.source === Track.Source.Microphone).length}`);
    });
  }, [participants, tracks]);
  
  return null; // This component doesn't render anything visible
} 