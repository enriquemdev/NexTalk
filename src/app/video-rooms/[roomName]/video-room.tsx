'use client';

import { PageClientImpl } from './page-client';
import '@livekit/components-styles';
import { Metadata } from 'next';

// Metadata function
export function generateMetadata({ params }: { params: { roomName: string } }): Metadata {
  return {
    title: `${params.roomName} | NextTalk Video Room`,
    description: `Join the ${params.roomName} video call on NextTalk.`,
  };
}

// Main video room component
export default function VideoRoom(props: {
  params: { roomName: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { params, searchParams } = props;
  const roomName = params.roomName;
  
  // Process parameters
  const region = typeof searchParams.region === 'string' ? searchParams.region : undefined;
  
  // Parse hq parameter
  const hq = searchParams.hq !== 'false';
  
  // Parse codec parameter
  let codec: 'vp8' | 'vp9' | 'h264' | 'av1' = 'vp9';
  if (typeof searchParams.codec === 'string') {
    if (['vp8', 'h264', 'av1'].includes(searchParams.codec)) {
      codec = searchParams.codec as 'vp8' | 'h264' | 'av1';
    }
  }

  return (
    <div className="fixed inset-0 bg-black">
      <PageClientImpl
        roomName={roomName}
        region={region}
        hq={hq}
        codec={codec}
      />
    </div>
  );
} 