// Importar los componentes necesarios
import VideoRoom from './video-room-client';
import { Metadata } from 'next';

// Mark as dynamic
export const dynamic = 'force-dynamic';

// Metadata generation
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ roomName: string }> 
}): Promise<Metadata> {
  const _params = await params;
  const roomName = decodeURIComponent(_params.roomName);
  return {
    title: `${roomName} | NextTalk Video Room`,
    description: `Join the ${roomName} video call on NextTalk.`,
  };
}

// Definir el componente de la página con tipos específicos que funcionan con Next.js 15
export default async function Page({ 
  params, 
  searchParams 
}: {
  params: Promise<{ roomName: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Await promises
  const _params = await params;
  const _searchParams = await searchParams;
  
  // Ensure roomName is properly decoded from the URL
  const decodedParams = {
    ..._params,
    roomName: decodeURIComponent(_params.roomName)
  };

  return <VideoRoom params={decodedParams} searchParams={_searchParams} />;
} 