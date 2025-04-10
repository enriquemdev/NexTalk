import { AccessToken, VideoGrant } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const COOKIE_KEY = 'random-participant-postfix';

// Generate a random string for participant identity
function randomString(length: number) {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Get cookie expiration time (2 hours from now)
function getCookieExpirationTime(): string {
  const now = new Date();
  const time = now.getTime();
  const expireTime = time + 60 * 120 * 1000;
  now.setTime(expireTime);
  return now.toUTCString();
}

// Create a participant token
function createParticipantToken(
  identity: string,
  name: string,
  metadata: string,
  roomName: string
) {
  if (!API_KEY || !API_SECRET) {
    console.error('LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not defined');
    throw new Error('LiveKit API credentials are not configured properly');
  }
  
  // Don't generate tokens for invalid room names
  if (!roomName || roomName === 'undefined') {
    console.error('Invalid room name provided:', roomName);
    throw new Error('Invalid room name provided');
  }

  try {
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity,
      name,
      metadata,
    });
    at.ttl = '5m';
    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };
    at.addGrant(grant);
    
    const token = at.toJwt();
    console.log('Generated token successfully for room:', roomName);
    return token;
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    throw new Error(`Failed to generate LiveKit token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get the LiveKit server URL for a given region
function getLiveKitURL(region: string | null): string {
  let targetKey = 'LIVEKIT_URL';
  if (region) {
    targetKey = `LIVEKIT_URL_${region}`.toUpperCase();
  }
  const url = process.env[targetKey];
  if (!url) {
    throw new Error(`${targetKey} is not defined`);
  }
  return url;
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const roomName = request.nextUrl.searchParams.get('roomName');
    const participantName = request.nextUrl.searchParams.get('participantName');
    const metadata = request.nextUrl.searchParams.get('metadata') ?? '';
    const region = request.nextUrl.searchParams.get('region');
    const isConfigCheck = request.nextUrl.searchParams.get('check') === 'true';
    
    console.log('Connection details request:', { roomName, participantName, region });
    
    // If this is just a configuration check, return a simplified response
    if (isConfigCheck) {
      if (!API_KEY || !API_SECRET || !LIVEKIT_URL) {
        console.error('Configuration check failed: missing LiveKit credentials');
        return new NextResponse(JSON.stringify({ 
          error: 'LiveKit configuration missing',
          configured: false 
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      return new NextResponse(JSON.stringify({ 
        configured: true,
        info: 'LiveKit configuration is available'
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    if (!API_KEY || !API_SECRET || !LIVEKIT_URL) {
      console.error('LiveKit environment variables are not set correctly');
      console.error('API_KEY:', !!API_KEY, 'API_SECRET:', !!API_SECRET, 'LIVEKIT_URL:', LIVEKIT_URL);
      return new NextResponse('Server configuration error: LiveKit credentials not properly configured', { status: 500 });
    }
    
    // Check for valid room name
    if (!roomName || roomName === 'undefined') {
      console.error('Invalid room name provided:', roomName);
      return new NextResponse('Invalid room name: must not be empty or "undefined"', { status: 400 });
    }
    
    // Check LiveKit URL
    const livekitServerUrl = region ? getLiveKitURL(region) : LIVEKIT_URL;
    console.log('Using LiveKit server URL:', livekitServerUrl);
    
    if (!livekitServerUrl) {
      console.error('LiveKit server URL is undefined');
      return new NextResponse('Invalid LiveKit server configuration', { status: 500 });
    }

    if (!participantName) {
      return new NextResponse('Missing required query parameter: participantName', { status: 400 });
    }

    // Generate participant token
    let randomParticipantPostfix = request.cookies.get(COOKIE_KEY)?.value;
    if (!randomParticipantPostfix) {
      randomParticipantPostfix = randomString(4);
    }
    
    const identity = `${participantName}__${randomParticipantPostfix}`;
    const participantToken = createParticipantToken(
      identity,
      participantName,
      metadata,
      roomName
    );

    // Check token is valid
    if (!participantToken || typeof participantToken !== 'string') {
      console.error('Failed to generate valid token');
      return new NextResponse('Failed to generate connection token', { status: 500 });
    }

    // Return connection details
    const data = {
      serverUrl: livekitServerUrl,
      roomName: roomName,
      participantToken: participantToken,
      participantName: participantName,
    };
    
    console.log('Returning connection details successfully');
    
    return new NextResponse(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Set-Cookie': `${COOKIE_KEY}=${randomParticipantPostfix}; Path=/; HttpOnly; SameSite=Strict; Secure; Expires=${getCookieExpirationTime()}`,
      },
    });
  } catch (error) {
    console.error('Error generating connection details:', error);
    if (error instanceof Error) {
      return new NextResponse(`Error: ${error.message}`, { status: 500 });
    }
    return new NextResponse('Unknown error', { status: 500 });
  }
} 