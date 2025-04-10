import { type Metadata } from 'next';
import RoomClientComponent from './RoomClientComponent';
import { type Id } from "convex/_generated/dataModel";

// Next.js 15.2.4 requires Promise-based params in page components
export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await the params Promise
  const resolvedParams = await params;
  
  // Get the id from params
  const { id } = resolvedParams;
  const roomId = id as Id<"rooms">;

  // Pass the roomId to the client component
  return <RoomClientComponent roomId={roomId} />;
}

// Update generateMetadata to use the correct Promise-based params
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  return {
    title: `Video Room: ${id}`,
    description: `Join the video room ${id} for seamless video conferencing.`,
  };
}

// Generar parámetros estáticos (opcional, si necesitas rutas estáticas)
export async function generateStaticParams() {
  // Example: Fetch actual room IDs from your data source if needed
  // For now, using placeholder IDs
  const roomIds = ['room1-id', 'room2-id', 'room3-id'];

  return roomIds.map(roomId => ({
    id: roomId,
  }));
}