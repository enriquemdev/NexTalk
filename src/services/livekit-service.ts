/**
 * LiveKit service for handling LiveKit room functionality
 */

/**
 * Fetches a LiveKit token for a given room
 */
export async function getLiveKitToken(
  roomId: string, 
  name?: string, 
  metadata?: Record<string, unknown>
): Promise<string> {
  try {
    const response = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        name,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get LiveKit token');
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error getting LiveKit token:', error);
    throw error;
  }
}

/**
 * Creates a room name based on a Convex room ID
 * LiveKit room names must be URL safe
 */
export function createLiveKitRoomName(roomId: string): string {
  // Replace any non-alphanumeric characters with underscore
  return `nextalk_room_${roomId.replace(/[^a-zA-Z0-9]/g, '_')}`;
} 