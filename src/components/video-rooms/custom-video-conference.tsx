'use client';

import React, { useState } from 'react';
import {
  ConnectionStateToast,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  RoomAudioRenderer,
  useCreateLayoutContext,
  usePinnedTracks,
  useTracks,
  CarouselLayout,
  Chat,
  MessageFormatter,
  ParticipantTile as LiveKitParticipantTile,
  useRoomContext,
  ControlBar,
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import { isEqualTrackRef, isTrackReference, TrackReferenceOrPlaceholder } from '@livekit/components-core';
import { UserPlus } from 'lucide-react';
import { InviteModal } from './invite-modal';
import { Button } from '@/components/ui/button';

export interface CustomVideoConferenceProps extends React.HTMLAttributes<HTMLDivElement> {
  chatMessageFormatter?: MessageFormatter;
}

export function CustomVideoConference({
  chatMessageFormatter,
  ...props
}: CustomVideoConferenceProps) {
  const [widgetState, setWidgetState] = useState({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const room = useRoomContext();

  const lastAutoFocusedScreenShareTrack = React.useRef<TrackReferenceOrPlaceholder | null>(null);

  // Track all camera and screen share publications
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const layoutContext = useCreateLayoutContext();

  // Filter to get only screen share tracks
  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);

  // Get the currently pinned track
  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  
  // All tracks that should appear in the carousel (those not being focused)
  const carouselTracks = tracks.filter((track) => !isEqualTrackRef(track, focusTrack));

  // Auto-focus on screen share logic
  React.useEffect(() => {
    // If screen share tracks are published, and no pin is set explicitly, auto set the screen share
    if (
      screenShareTracks.some((track) => track.publication.isSubscribed) &&
      lastAutoFocusedScreenShareTrack.current === null
    ) {
      layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: screenShareTracks[0] });
      lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];
    } 
    // Clear pin when screen share ends
    else if (
      lastAutoFocusedScreenShareTrack.current &&
      !screenShareTracks.some(
        (track) =>
          track.publication.trackSid ===
          lastAutoFocusedScreenShareTrack.current?.publication?.trackSid,
      )
    ) {
      layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
      lastAutoFocusedScreenShareTrack.current = null;
    }
  }, [
    screenShareTracks
      .map((ref) => `${ref.publication.trackSid}_${ref.publication.isSubscribed}`)
      .join(),
    focusTrack?.publication?.trackSid,
    tracks,
    layoutContext.pin,
  ]);

  return (
    <div className="lk-video-conference" {...props}>
      <LayoutContextProvider
        value={layoutContext}
        onWidgetChange={setWidgetState}
      >
        <div className="lk-video-conference-inner">
          {!focusTrack ? (
            <div className="lk-grid-layout-wrapper rounded-xl overflow-hidden">
              <GridLayout tracks={tracks} className="gap-3 p-3">
                <LiveKitParticipantTile />
              </GridLayout>
            </div>
          ) : (
            <div className="lk-focus-layout-wrapper rounded-xl overflow-hidden">
              <FocusLayoutContainer>
                <CarouselLayout tracks={carouselTracks}>
                  <LiveKitParticipantTile />
                </CarouselLayout>
                {focusTrack && <FocusLayout trackRef={focusTrack} />}
              </FocusLayoutContainer>
            </div>
          )}
          
          <ControlBar />
          
          {/* Invite Button */}
          <div className="fixed top-5 left-5 z-20">
            <Button 
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-5 w-5" />
              <span>Invite</span>
            </Button>
          </div>
        </div>
        <Chat
          style={{ display: widgetState.showChat ? 'grid' : 'none' }}
          messageFormatter={chatMessageFormatter}
        />
      </LayoutContextProvider>
      <RoomAudioRenderer />
      <ConnectionStateToast />
      
      {/* Invite Modal */}
      {room && (
        <InviteModal 
          isOpen={isInviteModalOpen} 
          onClose={() => setIsInviteModalOpen(false)} 
          roomName={room.name}
        />
      )}
    </div>
  );
} 