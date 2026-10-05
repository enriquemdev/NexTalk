import { AccessToken } from "livekit-server-sdk";
import { NextRequest } from "next/server";
import { api } from "convex/_generated/api";
import { serverSession } from "@/lib/server/session";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await serverSession();
    if (!session) return Response.json({ error: "Authentication required" }, { status: 401 });
    const roomName = request.nextUrl.searchParams.get("roomName");
    const participantName = request.nextUrl.searchParams.get("participantName")?.slice(0, 100) || "Participant";
    if (!roomName || roomName.length > 150) return Response.json({ error: "Invalid room" }, { status: 400 });
    const allowed = await session.client.query(api.rooms.authorizeVideoRoom, { roomName });
    if (!allowed) return Response.json({ error: "Room access denied" }, { status: 403 });
    const key = process.env.LIVEKIT_API_KEY, secret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!key || !secret || !url) return Response.json({ error: "Video service unavailable" }, { status: 503 });
    const token = new AccessToken(key, secret, { identity: session.userId, name: participantName, ttl: "5m" });
    token.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
    return Response.json({ serverUrl: url, roomName, participantName, participantToken: await token.toJwt() }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Video service unavailable" }, { status: 503 }); }
}
