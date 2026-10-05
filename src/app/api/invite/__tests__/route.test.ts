import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), mutation: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/server/session", () => ({ serverSession: mocks.session }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
import { POST } from "../route";
const request = (body: unknown) => new Request("https://example.test/api/invite", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks(); mocks.session.mockResolvedValue({ client: { mutation: mocks.mutation } }); mocks.mutation.mockResolvedValue({ _id: "invite", token: "server-token" }); mocks.send.mockResolvedValue({ error: null });
  vi.stubEnv("RESEND_API_KEY", "test-only"); vi.stubEnv("RESEND_FROM_EMAIL", "test@example.test"); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
});
test("rejects unauthenticated email requests", async () => { mocks.session.mockResolvedValue(null); expect((await POST(request({}))).status).toBe(401); expect(mocks.send).not.toHaveBeenCalled(); });
test("validates recipient and room", async () => { expect((await POST(request({ email: "invalid" }))).status).toBe(400); expect(mocks.send).not.toHaveBeenCalled(); });
test("uses the server invitation token and idempotency key, not supplied host HTML", async () => {
  expect((await POST(request({ roomId: "room", email: "person@example.test", hostName: "<script>bad</script>" }))).status).toBe(200);
  expect(mocks.send.mock.calls[0][0].text).toContain("/invite/server-token"); expect(JSON.stringify(mocks.send.mock.calls)).not.toContain("<script>");
  expect(mocks.send.mock.calls[0][1]).toEqual({ idempotencyKey: "nextalk-invite-invite" });
});
test("does not send when authorization fails", async () => { mocks.mutation.mockRejectedValue(new Error("FORBIDDEN")); expect((await POST(request({ roomId: "room", email: "person@example.test" }))).status).toBe(403); expect(mocks.send).not.toHaveBeenCalled(); });
test("reports actual provider delivery errors", async () => { mocks.send.mockResolvedValue({ error: { message: "private provider detail" } }); const response = await POST(request({ roomId: "room", email: "person@example.test" })); expect(response.status).toBe(502); expect(await response.text()).not.toContain("private provider detail"); });
