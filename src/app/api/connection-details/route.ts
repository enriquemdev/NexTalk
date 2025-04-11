import { randomString as randomStringUtil } from '@/lib/client-utils';
import { ConnectionDetails } from '@/lib/types';
import { AccessToken, AccessTokenOptions, VideoGrant } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic responses from this API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Explicitly load environment variables from process.env
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL; // Try both
const COOKIE_KEY = 'random-participant-postfix';

// Function to check all LiveKit env variables
function checkLiveKitEnv() {
  console.log('==== LIVEKIT ENV VARIABLES CHECK ====');
  console.log('API_KEY present:', !!API_KEY, API_KEY ? `(length: ${API_KEY.length})` : '(missing)');
  console.log('API_SECRET present:', !!API_SECRET, API_SECRET ? `(length: ${API_SECRET.length})` : '(missing)');
  console.log('LIVEKIT_URL:', LIVEKIT_URL || '(missing)');
  console.log('NEXT_PUBLIC_LIVEKIT_URL:', process.env.NEXT_PUBLIC_LIVEKIT_URL || '(missing)');
  
  // Return a status object indicating which variables are missing
  return {
    hasApiKey: !!API_KEY,
    hasApiSecret: !!API_SECRET,
    hasLiveKitUrl: !!LIVEKIT_URL,
    allConfigured: !!API_KEY && !!API_SECRET && !!LIVEKIT_URL
  };
}

// Call the check function but don't store the result if unused
checkLiveKitEnv();

// Create a participant token
function createParticipantToken(userInfo: AccessTokenOptions, roomName: string) {
  if (!API_KEY || !API_SECRET) {
    throw new Error('LiveKit API Key or Secret is not configured');
  }
  const at = new AccessToken(API_KEY, API_SECRET, userInfo);
  at.ttl = '5m';
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}

// Get the LiveKit server URL for a given region
function getLiveKitURL(region: string | null): string {
  let targetKey = 'LIVEKIT_URL';
  if (region) {
    targetKey = `LIVEKIT_URL_${region}`.toUpperCase();
  }
  const url = process.env[targetKey];
  if (!url) {
    console.error(`Environment variable ${targetKey} is not defined`);
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
    const livekitServerUrl = region ? getLiveKitURL(region) : LIVEKIT_URL;
    let randomParticipantPostfix = request.cookies.get(COOKIE_KEY)?.value;

    if (livekitServerUrl === undefined) {
      console.error('LiveKit URL is undefined. Region:', region);
      return new NextResponse('Invalid LiveKit server configuration', { status: 500 });
    }

    if (typeof roomName !== 'string') {
      return new NextResponse('Missing required query parameter: roomName', { status: 400 });
    }
    if (participantName === null) {
      return new NextResponse('Missing required query parameter: participantName', { status: 400 });
    }

    // Generate participant token
    if (!randomParticipantPostfix) {
      randomParticipantPostfix = randomStringUtil(4);
    }
    const participantToken = await createParticipantToken(
      {
        identity: `${participantName}__${randomParticipantPostfix}`,
        name: participantName,
        metadata,
      },
      roomName,
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: livekitServerUrl,
      roomName: roomName,
      participantToken: participantToken,
      participantName: participantName,
    };
    
    // Return response with connection details and set cookie
    return new NextResponse(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${COOKIE_KEY}=${randomParticipantPostfix}; Path=/; HttpOnly; SameSite=Strict; Secure; Expires=${getCookieExpirationTime()}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      },
    });
  } catch (error) {
    console.error('Error in /api/connection-details:', error);
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Unknown error generating connection details', { status: 500 });
  }
}

function getCookieExpirationTime(): string {
  const now = new Date();
  const time = now.getTime();
  const expireTime = time + 60 * 120 * 1000; // 2 hours from now
  now.setTime(expireTime);
  return now.toUTCString();
} 