import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ session: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/server/session", () => ({ serverSession: mocks.session }));
import { GET } from "./route";
import { POST } from "../livekit/token/route";
beforeEach(() => {
  vi.resetAllMocks(); mocks.session.mockResolvedValue({ userId: "verified-owner", client: { query: mocks.query } }); mocks.query.mockResolvedValue(true);
  vi.stubEnv("LIVEKIT_API_KEY", "test-key"); vi.stubEnv("LIVEKIT_API_SECRET", "test-only-signing-material-00000000"); vi.stubEnv("LIVEKIT_URL", "wss://example.test");
});
const getRequest = () => new NextRequest("https://example.test/api/connection-details?roomName=private-room&participantName=DisplayName&identity=victim");
const postRequest = () => new Request("https://example.test/api/livekit/token", { method: "POST", body: JSON.stringify({ roomId: "private-room", identity: "victim" }) });
test("both token routes deny anonymous callers", async () => {
  mocks.session.mockResolvedValue(null); expect((await GET(getRequest())).status).toBe(401); expect((await POST(postRequest())).status).toBe(401); expect(mocks.query).not.toHaveBeenCalled();
});
test("both token routes deny unauthorized rooms", async () => {
  mocks.query.mockResolvedValue(false); expect((await GET(getRequest())).status).toBe(403); expect((await POST(postRequest())).status).toBe(403);
});
test("tokens use the verified identity, exact authorized room and short lifetime", async () => {
  for (const response of [await GET(getRequest()), await POST(postRequest())]) {
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json(); const claims = JSON.parse(Buffer.from((body.participantToken || body.token).split(".")[1], "base64url").toString());
    expect(claims.sub).toBe("verified-owner"); expect(claims.video.room).toBe("private-room"); expect(claims.exp - claims.nbf).toBeLessThanOrEqual(300);
  }
});
test("missing configuration fails closed", async () => {
  vi.stubEnv("LIVEKIT_API_SECRET", ""); expect((await GET(getRequest())).status).toBe(503); expect((await POST(postRequest())).status).toBe(503);
});
