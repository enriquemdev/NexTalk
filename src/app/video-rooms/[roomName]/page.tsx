// Importar los componentes necesarios
import { type Metadata } from 'next';
import { VideoCodec } from 'livekit-client';
import { PageClientImpl } from './page-client';

// Mark as dynamic
export const dynamic = 'force-dynamic';

// Next.js 15.2.4 requires Promise-based params in page components
export default async function VideoRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomName: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Await the params Promise
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  // Get the roomName from params
  const { roomName } = resolvedParams;
  
  // Default to standard quality with VP8 codec for maximum compatibility
  const hq = resolvedSearchParams.hq === 'true';
  let codec: VideoCodec = 'vp8'; // Default to VP8 for maximum compatibility
  
  // Only use more advanced codecs if explicitly requested
  if (resolvedSearchParams.codec === 'h264') {
    codec = 'h264';
  } else if (resolvedSearchParams.codec === 'vp9') {
    codec = 'vp9';
  }
  
  return (
    <div style={{ height: '100dvh' }}>
      <PageClientImpl
        roomName={roomName}
        hq={hq}
        codec={codec}
      />
    </div>
  );
}

// Metadata generation
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ roomName: string }> 
}): Promise<Metadata> {
  const resolvedParams = await params;
  const roomName = decodeURIComponent(resolvedParams.roomName);
  return {
    title: `${roomName} | NextTalk Video Room`,
    description: `Join the ${roomName} video room on NextTalk for real-time video conferencing.`,
  };
} 