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
    // Log that we're requesting a token - helpful for debugging
    console.log(`Requesting LiveKit token for room: ${roomId}, user: ${name || 'anonymous'}`);
    
    const response = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        name,
        metadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('LiveKit token error response:', errorData);
      throw new Error(errorData.error || 'Failed to get LiveKit token');
    }

    const data = await response.json();
    
    // Log success, but don't log the actual token for security reasons
    console.log('Successfully received LiveKit token');
    
    // Check if token is valid before returning
    if (!data.token || typeof data.token !== 'string') {
      console.error('Invalid token format received:', data);
      throw new Error('Invalid token format received');
    }
    
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