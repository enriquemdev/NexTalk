import { PageClientImpl } from './page-client';
import '@livekit/components-styles';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { roomName: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export function generateMetadata({ params }: PageProps): Metadata {
  return {
    title: `${params.roomName} | NextTalk Video Room`,
    description: `Join the ${params.roomName} video call on NextTalk.`,
  };
}

export default function Page({ params, searchParams }: PageProps) {
  const region = searchParams.region as string | undefined;
  
  // Parse the hq parameter - default to true if not specified
  let hq = true;
  if (searchParams.hq !== undefined) {
    hq = searchParams.hq !== 'false';
  }

  // Parse the codec parameter - default to vp9
  let codec: 'vp8' | 'vp9' | 'h264' | 'av1' = 'vp9';
  if (
    searchParams.codec === 'vp8' ||
    searchParams.codec === 'h264' ||
    searchParams.codec === 'av1'
  ) {
    codec = searchParams.codec;
  }

  return (
    <div className="fixed inset-0 bg-black">
      <PageClientImpl
        roomName={params.roomName}
        region={region}
        hq={hq}
        codec={codec}
      />
    </div>
  );
} 