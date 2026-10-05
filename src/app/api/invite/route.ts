import { Resend } from "resend";
import { z } from "zod";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { serverSession } from "@/lib/server/session";
import { boundedJson } from "@/lib/server/body";
const input = z.object({ roomId: z.string().min(1).max(100), email: z.string().email().max(254) });
export async function POST(request: Request) {
  try {
    const session = await serverSession();
    if (!session) return Response.json({ error: "Authentication required" }, { status: 401 });
    let parsed;
    try { parsed = input.safeParse(await boundedJson(request)); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
    if (!parsed.success) return Response.json({ error: "Room ID and valid email are required" }, { status: 400 });
    const key = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM_EMAIL, base = process.env.NEXT_PUBLIC_APP_URL;
    if (!key || !from || !base) return Response.json({ error: "Invitations are not configured" }, { status: 503 });
    let invitation;
    try { invitation = await session.client.mutation(api.invitations.createInvitation, { roomId: parsed.data.roomId as Id<"rooms">, email: parsed.data.email.toLowerCase() }); }
    catch { return Response.json({ error: "Invitation not permitted or limit reached" }, { status: 403 }); }
    if (!invitation) return Response.json({ error: "Unable to prepare invitation" }, { status: 503 });
    const link = new URL(`/invite/${encodeURIComponent(invitation.token)}`, base).toString();
    const { error } = await new Resend(key).emails.send({ from, to: parsed.data.email, subject: "Invitation to NexTalk", text: `You have been invited to a NexTalk room. Sign in with this email address to accept the invitation: ${link}` }, { idempotencyKey: `nextalk-invite-${invitation._id}` });
    if (error) return Response.json({ error: "Unable to deliver invitation" }, { status: 502 });
    return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Invitation service unavailable" }, { status: 503 }); }
}
