import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

// Do not cache endpoint result
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // Get authentication info
    const auth = getAuth(req);
    
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = auth.userId;
    
    // Get request data
    const { roomId, name } = await req.json();
    
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }
    
    // Check environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'LiveKit API credentials not configured' }, 
        { status: 500 }
      );
    }
    
    // Create token with identity set to Clerk user ID
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: name || 'User',
    });
    
    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
    });
    
    // Generate JWT token
    const token = await at.toJwt();
    
    return NextResponse.json(
      { token },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' }, 
      { status: 500 }
    );
  }
} 