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

/**
 * LiveKit service for handling connection to LiveKit servers
 */

import { ConnectionDetails } from '@/lib/types';

/**
 * Sanitizes a room name to ensure it's valid for LiveKit
 * @param roomName - The raw room name
 * @returns A sanitized room name safe for use with LiveKit
 */
export function sanitizeRoomName(roomName: string): string {
  if (!roomName || roomName === 'undefined' || roomName === 'null') {
    throw new Error('Invalid room name');
  }
  
  // Remove any characters that aren't alphanumeric, spaces, or hyphens
  const sanitized = roomName
    .replace(/[^\w\s-]/g, '')  
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .toLowerCase();            // Convert to lowercase for consistency
  
  // If after sanitization we have nothing left, throw an error
  if (!sanitized) {
    throw new Error('Room name contains only invalid characters');
  }
  
  return sanitized;
}

/**
 * Fetches connection details from the server
 */
export async function getConnectionDetails(
  roomName: string,
  participantName: string,
  region?: string
): Promise<ConnectionDetails> {
  // Validate and sanitize inputs
  if (!roomName || roomName === 'undefined' || roomName === 'null') {
    throw new Error('Invalid room name');
  }
  
  // Sanitize the room name
  const sanitizedRoomName = sanitizeRoomName(roomName);

  if (!participantName) {
    throw new Error('Participant name is required');
  }
  
  // Sanitize participant name (basic)
  const sanitizedParticipantName = participantName.substring(0, 100).trim() || 'Anonymous';

  // Create the URL with parameters
  const url = new URL('/api/connection-details', window.location.origin);
  url.searchParams.append('roomName', sanitizedRoomName);
  url.searchParams.append('participantName', sanitizedParticipantName);
  
  if (region) {
    url.searchParams.append('region', region);
  }

  console.log(`Fetching LiveKit connection details for room: ${sanitizedRoomName}`);

  // Fetch the connection details
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to get connection details:', response.status, errorText);
    throw new Error(`Connection error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  // Validate the response data
  if (!data.serverUrl) {
    console.error('Invalid response data - missing serverUrl:', data);
    throw new Error('Server URL is missing in the response');
  }
  
  if (!data.participantToken || typeof data.participantToken !== 'string') {
    console.error('Invalid response data - invalid token:', typeof data.participantToken);
    throw new Error('Invalid participant token received');
  }
  
  console.log('Successfully received LiveKit connection details');
  return data as ConnectionDetails;
}

/**
 * Checks if the LiveKit server is properly configured
 */
export async function checkLiveKitConfiguration(): Promise<boolean> {
  try {
    const url = new URL('/api/connection-details', window.location.origin);
    url.searchParams.append('check', 'true');
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.configured === true;
  } catch (error) {
    console.error('Error checking LiveKit configuration:', error);
    return false;
  }
} 