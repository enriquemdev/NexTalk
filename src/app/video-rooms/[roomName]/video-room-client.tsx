'use client';

import { PageClientImpl } from './page-client';
import { VideoCodec } from 'livekit-client';

// This is a client component that processes the props and renders the video room
export default function VideoRoomClient({ 
  params,
  searchParams,
}: {
  params: { roomName: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Extract values from params
  const { roomName } = params;
  
  // Process region
  const region = typeof searchParams.region === 'string' ? searchParams.region : undefined;
  
  // Parse hq parameter
  const hqParam = searchParams.hq;
  const hq = hqParam !== 'false';
  
  // Parse codec parameter
  let codec: VideoCodec = 'vp9';
  
  if (typeof searchParams.codec === 'string') {
    if (['vp8', 'h264', 'av1'].includes(searchParams.codec)) {
      codec = searchParams.codec as VideoCodec;
    }
  }

  return (
    <PageClientImpl
      roomName={roomName}
      region={region}
      hq={hq}
      codec={codec}
    />
  );
} 