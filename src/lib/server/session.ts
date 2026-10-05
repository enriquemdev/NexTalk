import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

export async function serverSession() {
  const session = await auth();
  if (!session.userId) return null;
  const token = await session.getToken({ template: "convex" });
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("SERVICE_UNAVAILABLE");
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return { client, userId: session.userId };
}
