import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), mutation: vi.fn(), stream: vi.fn() }));
vi.mock("@/lib/server/session", () => ({ serverSession: mocks.session }));
vi.mock("ai", () => ({ streamText: mocks.stream }));
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: () => ({ chat: (model: string) => model }) }));
import { POST } from "./route";
function request(body: unknown = { roomId: "room", consent: true }) { return new Request("https://example.test/api/summary", { method: "POST", body: JSON.stringify(body) }); }
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ENABLE_AI_SUMMARIES", "true"); vi.stubEnv("OPENAI_API_KEY", "test-only"); vi.stubEnv("SUMMARY_SERVICE_SECRET", "test-only-service-secret-never-used-live");
  mocks.session.mockResolvedValue({ userId: "owner", client: { mutation: mocks.mutation } });
  mocks.mutation.mockResolvedValueOnce({ runId: "run", source: "SERVER CONTENT", sourceCount: 1, truncated: false }).mockResolvedValue(null);
  mocks.stream.mockReturnValue({ textStream: (async function* () { yield "Final "; yield "summary"; })(), finishReason: Promise.resolve("stop") });
});
test("denies anonymous requests before invoking any provider", async () => {
  mocks.session.mockResolvedValue(null); expect((await POST(request())).status).toBe(401); expect(mocks.stream).not.toHaveBeenCalled();
});
test("disabled or missing configuration fails closed", async () => {
  vi.stubEnv("ENABLE_AI_SUMMARIES", "false"); expect((await POST(request())).status).toBe(503); expect(mocks.mutation).not.toHaveBeenCalled();
});
test("requires explicit consent and rejects client-supplied conversation content", async () => {
  expect((await POST(request({ roomId: "room" }))).status).toBe(400);
  expect((await POST(request({ roomId: "room", consent: true, content: "injected" }))).status).toBe(400);
  expect(mocks.stream).not.toHaveBeenCalled();
});
test("persists the actual final stream before emitting saved", async () => {
  const response = await POST(request()); const events = (await response.text()).trim().split("\n").map(line => JSON.parse(line));
  expect(events.map(e => e.type)).toEqual(["delta", "delta", "saved"]);
  expect(mocks.stream.mock.calls[0][0]).toMatchObject({ prompt: "SERVER CONTENT", maxRetries: 0, maxOutputTokens: 2000 });
  expect(mocks.mutation.mock.calls[1][1]).toMatchObject({ runId: "run", content: "Final summary" });
});
test("does not present persistence failure as success", async () => {
  mocks.mutation.mockReset().mockResolvedValueOnce({ runId: "run", source: "x", sourceCount: 1, truncated: false }).mockRejectedValueOnce(new Error("DB unavailable")).mockResolvedValue(null);
  const text = await (await POST(request())).text(); expect(text).toContain('"type":"error"'); expect(text).not.toContain('"type":"saved"');
});
test("truncated model output is not saved as a complete summary", async () => {
  mocks.stream.mockReturnValue({ textStream: (async function* () { yield "partial"; })(), finishReason: Promise.resolve("length") });
  const text = await (await POST(request())).text(); expect(text).not.toContain('"type":"saved"'); expect(mocks.mutation.mock.calls[1][1].content).toBeNull();
});
test("returns rate limiting without calling the provider", async () => {
  mocks.mutation.mockReset().mockRejectedValue(new Error("RATE_LIMITED")); expect((await POST(request())).status).toBe(429); expect(mocks.stream).not.toHaveBeenCalled();
});
