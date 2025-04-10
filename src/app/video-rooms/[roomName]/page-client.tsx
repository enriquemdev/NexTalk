'use client';

import { decodePassphrase } from '@/lib/client-utils';
import { ConnectionDetails } from '@/lib/types';
import {
  formatChatMessageLinks,
  LiveKitRoom,
  LocalUserChoices,
  PreJoin,
  VideoConference,
} from '@livekit/components-react';
import {
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  RoomConnectOptions,
} from 'livekit-client';
import { useRouter } from 'next/navigation';
import React from 'react';

const CONN_DETAILS_ENDPOINT = '/api/connection-details';

// Add these functions after the imports and before PageClientImpl
// We'll use localStorage to track recent rooms the user has visited
const RECENT_ROOMS_KEY = "nextalk_recent_video_rooms";

interface VideoRoom {
  roomName: string;
  lastVisited: number;
  isActive: boolean;
}

function getRecentRooms(): VideoRoom[] {
  if (typeof window === "undefined") return [];
  
  try {
    const storedRooms = localStorage.getItem(RECENT_ROOMS_KEY);
    if (!storedRooms) return [];
    
    return JSON.parse(storedRooms) as VideoRoom[];
  } catch (error) {
    console.error("Error loading recent rooms:", error);
    return [];
  }
}

function addRecentRoom(roomName: string) {
  if (typeof window === "undefined") return;
  
  try {
    const existingRooms = getRecentRooms();
    
    // Check if room already exists
    const existingRoomIndex = existingRooms.findIndex(r => r.roomName === roomName);
    
    if (existingRoomIndex >= 0) {
      // Update existing room
      existingRooms[existingRoomIndex].lastVisited = Date.now();
      existingRooms[existingRoomIndex].isActive = true;
    } else {
      // Add new room
      existingRooms.push({
        roomName,
        lastVisited: Date.now(),
        isActive: true
      });
    }
    
    // Limit to 10 most recent rooms
    const sortedRooms = existingRooms
      .sort((a, b) => b.lastVisited - a.lastVisited)
      .slice(0, 10);
    
    localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(sortedRooms));
  } catch (error) {
    console.error("Error saving recent room:", error);
  }
}

export function PageClientImpl(props: {
  roomName: string;
  region?: string;
  hq: boolean;
  codec: VideoCodec;
}) {
  const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices | undefined>(
    undefined,
  );
  const preJoinDefaults = React.useMemo(() => {
    return {
      username: '',
      videoEnabled: true,
      audioEnabled: true,
    };
  }, []);
  const [connectionDetails, setConnectionDetails] = React.useState<ConnectionDetails | undefined>(
    undefined,
  );

  const handlePreJoinSubmit = React.useCallback(async (values: LocalUserChoices) => {
    try {
      setPreJoinChoices(values);
      const url = new URL(CONN_DETAILS_ENDPOINT, window.location.origin);
      url.searchParams.append('roomName', props.roomName);
      url.searchParams.append('participantName', values.username || 'Anonymous');
      if (props.region) {
        url.searchParams.append('region', props.region);
      }
      
      console.log('Fetching connection details from:', url.toString());
      
      const connectionDetailsResp = await fetch(url.toString());
      if (!connectionDetailsResp.ok) {
        const errorText = await connectionDetailsResp.text();
        console.error('Connection details response error:', connectionDetailsResp.status, errorText);
        throw new Error(`Failed to get connection details: ${errorText}`);
      }
      
      const connectionDetailsData = await connectionDetailsResp.json();
      console.log('Connection details received successfully');
      
      // Validate the token
      if (!connectionDetailsData.participantToken || typeof connectionDetailsData.participantToken !== 'string') {
        console.error('Invalid token in connection details:', connectionDetailsData);
        throw new Error('Invalid token received from server');
      }
      
      setConnectionDetails(connectionDetailsData);
    } catch (error) {
      console.error('Error in handlePreJoinSubmit:', error);
      alert(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [props.roomName, props.region]);

  const handlePreJoinError = React.useCallback((e: Error) => {
    console.error('PreJoin error:', e);
    
    // Provide more helpful error messages for common issues
    if (e.name === 'NotReadableError' || e.message.includes('Could not start video source')) {
      alert('Camera access error: Your camera may be in use by another application or there might be a hardware issue. Please close other applications using your camera and try again.');
    } else if (e.name === 'NotAllowedError' || e.message.includes('Permission denied')) {
      alert('Permission denied: Please allow camera and microphone access in your browser settings and try again.');
    } else if (e.name === 'NotFoundError' || e.message.includes('Requested device not found')) {
      alert('No camera detected: Please connect a camera to your device and try again.');
    } else {
      alert(`Error joining room: ${e.message}`);
    }
  }, []);

  return (
    <main data-lk-theme="default" style={{ height: '100%' }}>
      {connectionDetails === undefined || preJoinChoices === undefined ? (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <PreJoin
            defaults={preJoinDefaults}
            onSubmit={handlePreJoinSubmit}
            onError={handlePreJoinError}
          />
        </div>
      ) : (
        <VideoConferenceComponent
          connectionDetails={connectionDetails}
          userChoices={preJoinChoices}
          options={{ codec: props.codec, hq: props.hq }}
        />
      )}
    </main>
  );
}

function VideoConferenceComponent(props: {
  userChoices: LocalUserChoices;
  connectionDetails: ConnectionDetails;
  options: {
    hq: boolean;
    codec: VideoCodec;
  };
}) {
  const e2eePassphrase =
    typeof window !== 'undefined' && decodePassphrase(location.hash.substring(1));

  const worker =
    typeof window !== 'undefined' &&
    e2eePassphrase &&
    new Worker(new URL('livekit-client/e2ee-worker', import.meta.url));
  const e2eeEnabled = !!(e2eePassphrase && worker);
  const keyProvider = new ExternalE2EEKeyProvider();
  const [e2eeSetupComplete, setE2eeSetupComplete] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);

  // Log connection details for debugging
  React.useEffect(() => {
    console.log('Connecting with details:', {
      serverUrl: props.connectionDetails.serverUrl,
      roomName: props.connectionDetails.roomName,
      tokenLength: props.connectionDetails.participantToken?.length || 0,
      // Don't log the full token for security reasons
    });
  }, [props.connectionDetails]);

  const roomOptions = React.useMemo((): RoomOptions => {
    let videoCodec: VideoCodec | undefined = props.options.codec ? props.options.codec : 'vp9';
    if (e2eeEnabled && (videoCodec === 'av1' || videoCodec === 'vp9')) {
      videoCodec = undefined;
    }
    return {
      videoCaptureDefaults: {
        deviceId: props.userChoices.videoDeviceId ?? undefined,
        resolution: props.options.hq ? VideoPresets.h1080 : VideoPresets.h720, // Lowered from h2160 to h1080 which is more compatible
      },
      publishDefaults: {
        dtx: false,
        videoSimulcastLayers: props.options.hq
          ? [VideoPresets.h720, VideoPresets.h540]  // Reduced quality to improve compatibility
          : [VideoPresets.h540, VideoPresets.h216],
        red: !e2eeEnabled,
        videoCodec,
      },
      audioCaptureDefaults: {
        deviceId: props.userChoices.audioDeviceId ?? undefined,
        echoCancellation: true,
        noiseSuppression: true,
      },
      adaptiveStream: { pixelDensity: 'screen' },
      dynacast: true,
      e2ee: e2eeEnabled
        ? {
            keyProvider,
            worker,
          }
        : undefined,
    };
  }, [props.userChoices, props.options.hq, props.options.codec, e2eeEnabled, worker]);

  const room = React.useMemo(() => new Room(roomOptions), [roomOptions]);

  React.useEffect(() => {
    if (e2eeEnabled && e2eePassphrase) {
      keyProvider
        .setKey(e2eePassphrase)
        .then(() => {
          room.setE2EEEnabled(true).catch((e) => {
            if (e instanceof DeviceUnsupportedError) {
              alert(
                `You're trying to join an encrypted meeting, but your browser does not support it. Please update it to the latest version and try again.`,
              );
              console.error(e);
            } else {
              console.error('E2EE error:', e);
              throw e;
            }
          });
        })
        .then(() => setE2eeSetupComplete(true))
        .catch(error => {
          console.error('Error setting up E2EE:', error);
          setE2eeSetupComplete(true); // Continue without E2EE
        });
    } else {
      setE2eeSetupComplete(true);
    }
  }, [e2eeEnabled, room, e2eePassphrase, keyProvider]);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  const router = useRouter();
  const handleOnLeave = React.useCallback(() => {
    // Update the room status to inactive
    const existingRooms = getRecentRooms();
    const roomIndex = existingRooms.findIndex(r => r.roomName === props.connectionDetails.roomName);
    
    if (roomIndex >= 0) {
      existingRooms[roomIndex].isActive = false;
      localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(existingRooms));
    }
    
    router.push('/');
  }, [router, props.connectionDetails.roomName]);

  const handleError = React.useCallback((error: Error) => {
    console.error('LiveKit connection error:', error);
    setConnectionError(error.message);
    alert(`Connection error: ${error.message}. Please try again or check your internet connection.`);
  }, []);
  
  const handleEncryptionError = React.useCallback((error: Error) => {
    console.error('LiveKit encryption error:', error);
    alert(
      `Encryption error: ${error.message}. E2EE may not work in this session.`,
    );
  }, []);

  // Track this room in recent rooms
  React.useEffect(() => {
    addRecentRoom(props.connectionDetails.roomName);
  }, [props.connectionDetails.roomName]);

  if (connectionError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black text-white p-4">
        <h2 className="text-xl mb-4">Connection Error</h2>
        <p className="mb-4">{connectionError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <LiveKitRoom
        connect={e2eeSetupComplete}
        room={room}
        token={props.connectionDetails.participantToken}
        serverUrl={props.connectionDetails.serverUrl}
        connectOptions={connectOptions}
        video={props.userChoices.videoEnabled}
        audio={props.userChoices.audioEnabled}
        onDisconnected={handleOnLeave}
        onEncryptionError={handleEncryptionError}
        onError={handleError}
      >
        <VideoConference
          chatMessageFormatter={formatChatMessageLinks}
        />
      </LiveKitRoom>
    </>
  );
} 