import { Track } from "livekit-client";
import { useTracks, VideoTrack } from "@livekit/components-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";

interface ParticipantMetadata {
  imageUrl?: string;
}

interface ParticipantInfo {
  identity: string;
  name?: string;
  metadata?: ParticipantMetadata;
  isMicrophoneEnabled: boolean;
}

interface ParticipantTileProps {
  participant: ParticipantInfo;
  className?: string;
}

export const ParticipantTile = ({ participant, className }: ParticipantTileProps) => {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true }
  ]);

  const videoTrack = tracks.find(track => 
    track.participant.identity === participant.identity && 
    track.source === Track.Source.Camera
  );

  const isMuted = !participant.isMicrophoneEnabled;

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative min-h-[200px] min-w-[200px] rounded-xl bg-background">
        {videoTrack ? (
          <VideoTrack 
            trackRef={videoTrack}
            className="rounded-xl"
          />
        ) : (
          <Avatar className="h-full w-full">
            <AvatarImage src={participant.metadata?.imageUrl} />
            <AvatarFallback>
              {participant.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="absolute bottom-2 right-2 rounded-md bg-background/50 p-1.5">
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center space-x-2">
        <span className="text-xs font-semibold">
          {participant.name || participant.identity}
        </span>
      </div>
    </div>
  );
} 