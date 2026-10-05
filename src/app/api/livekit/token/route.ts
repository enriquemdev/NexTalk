import { AccessToken } from "livekit-server-sdk";
import { z } from "zod";
import { api } from "convex/_generated/api";
import { serverSession } from "@/lib/server/session";
import { boundedJson } from "@/lib/server/body";
export const revalidate = 0;
export async function POST(request: Request) {
  try {
    const session = await serverSession();
    if (!session) return Response.json({ error: "Authentication required" }, { status: 401 });
    let body;
    try { body = z.object({ roomId: z.string().min(1).max(150), name: z.string().max(100).optional() }).parse(await boundedJson(request)); }
    catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
    if (!await session.client.query(api.rooms.authorizeVideoRoom, { roomName: body.roomId })) return Response.json({ error: "Room access denied" }, { status: 403 });
    const key = process.env.LIVEKIT_API_KEY, secret = process.env.LIVEKIT_API_SECRET;
    if (!key || !secret) return Response.json({ error: "Video service unavailable" }, { status: 503 });
    const token = new AccessToken(key, secret, { identity: session.userId, name: body.name || "Participant", ttl: "5m" });
    token.addGrant({ roomJoin: true, room: body.roomId, canPublish: true, canSubscribe: true });
    return Response.json({ token: await token.toJwt() }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Video service unavailable" }, { status: 503 }); }
}
