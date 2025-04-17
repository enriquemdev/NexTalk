import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { sendRoomInviteEmail } from "@/lib/email";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse, NextRequest } from "next/server";
import { Id } from "../../../../convex/_generated/dataModel";
import { z } from 'zod';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Email validation schema
const emailSchema = z.string().email();

// Rate Limiter configuration (e.g., 5 requests per minute per user)
const rateLimiter = new RateLimiterMemory({
  points: 5, // Number of points
  duration: 60, // Per 60 seconds
});

/**
 * API route to send an invitation email for a room.
 * POST /api/invite
 * @body {roomId: string, email: string}
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth details from the request
    const auth = getAuth(request);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Consume rate limiter point
    try {
      await rateLimiter.consume(userId);
    } catch (_rejRes) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { roomId, email } = await request.json();
    if (!roomId || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    try {
      emailSchema.parse(email);
    } catch (_error) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Create invitation in Convex
    const invitationResult = await convex.mutation(api.invitations.createInvitation, {
      roomId: roomId as Id<"rooms">,
      email: email,
    });

    // Robust check for successful invitation creation and token existence
    if (!invitationResult || typeof invitationResult !== 'object' || !('token' in invitationResult) || typeof invitationResult.token !== 'string') {
      console.error("Invalid invitation result from Convex:", invitationResult);
      throw new Error("Failed to create invitation token in Convex");
    }
    const inviteToken = invitationResult.token;

    // Get room details
    const room = await convex.query(api.rooms.get, { roomId: roomId as Id<"rooms"> });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Get inviter details - assuming getByToken expects the Clerk user ID
    const inviter = await convex.query(api.users.getByToken, { 
      tokenIdentifier: userId
    });
    if (!inviter) {
      return NextResponse.json({ error: "Inviting user not found" }, { status: 404 });
    }

    // Generate invitation link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const inviteLink = `${baseUrl}/invite/${inviteToken}`;

    // Send email
    const emailParams = {
      to: email,
      inviterName: inviter.name || "A NexTalk user",
      roomName: room.name,
      inviteLink,
    };
    await sendRoomInviteEmail(emailParams);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite API error:", error);
    return NextResponse.json(
      { error: "Failed to process invitation" }, 
      { status: 500 }
    );
  }
} 