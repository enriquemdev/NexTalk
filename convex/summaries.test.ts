/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
const modules = import.meta.glob("./**/*.ts");
const serviceSecret = "local-test-only-not-a-real-secret-00000000";
beforeEach(() => { vi.stubEnv("SUMMARY_SERVICE_SECRET", serviceSecret); });
async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner", email: "owner@example.test", emailVerified: true });
  const stranger = t.withIdentity({ subject: "stranger", email: "stranger@example.test", emailVerified: true });
  const ids = await t.run(async ctx => {
    const userId = await ctx.db.insert("users", { tokenIdentifier: "clerk:owner", createdAt: Date.now() });
    const otherId = await ctx.db.insert("users", { tokenIdentifier: "clerk:stranger", createdAt: Date.now() });
    const roomId = await ctx.db.insert("rooms", { name: "Test room", createdBy: userId, createdAt: Date.now(), status: "live", isPrivate: true, accessCode: "test-code", isRecorded: false, type: "audio" });
    await ctx.db.insert("messages", { roomId, userId, content: "We agreed to review the catalog on Monday.", type: "text", createdAt: Date.now() });
    return { userId, otherId, roomId };
  });
  return { t, owner, stranger, ...ids };
}
test("requires authentication, room ownership and server secret before generation", async () => {
  const { t, owner, stranger, roomId } = await fixture();
  const args = { roomId, serviceSecret, model: "test-model" };
  await expect(t.mutation(api.summaries.reserve, args)).rejects.toThrow("UNAUTHENTICATED");
  await expect(stranger.mutation(api.summaries.reserve, args)).rejects.toThrow("FORBIDDEN");
  await expect(owner.mutation(api.summaries.reserve, { ...args, serviceSecret: "wrong" })).rejects.toThrow();
  expect(await t.run(ctx => ctx.db.query("summaryRuns").collect())).toHaveLength(0);
});
test("stores the final result with provenance and survives a fresh query", async () => {
  const { owner, roomId } = await fixture();
  const run = await owner.mutation(api.summaries.reserve, { roomId, serviceSecret, model: "test-model" });
  expect(run.source).toContain("review the catalog");
  await owner.mutation(api.summaries.finish, { runId: run.runId, serviceSecret, content: "Review the catalog on Monday." });
  expect(await owner.query(api.summaries.getSummary, { roomId })).toMatchObject({ content: "Review the catalog on Monday.", model: "test-model", sourceCount: 1 });
  await expect(owner.mutation(api.summaries.finish, { runId: run.runId, serviceSecret, content: "overwrite" })).rejects.toThrow("RUN_ALREADY_FINISHED");
});
test("strangers cannot read or finish room summaries", async () => {
  const { owner, stranger, roomId } = await fixture();
  const run = await owner.mutation(api.summaries.reserve, { roomId, serviceSecret, model: "test-model" });
  await expect(stranger.query(api.summaries.getSummary, { roomId })).rejects.toThrow("FORBIDDEN");
  await expect(stranger.mutation(api.summaries.finish, { runId: run.runId, serviceSecret, content: "forged" })).rejects.toThrow("FORBIDDEN");
});
test("failed attempts still consume the room cooldown and do not create a summary", async () => {
  const { owner, roomId } = await fixture();
  const args = { roomId, serviceSecret, model: "test-model" };
  const run = await owner.mutation(api.summaries.reserve, args);
  await owner.mutation(api.summaries.finish, { runId: run.runId, serviceSecret, content: null });
  expect(await owner.query(api.summaries.getSummary, { roomId })).toBeNull();
  await expect(owner.mutation(api.summaries.reserve, args)).rejects.toThrow("RATE_LIMITED");
});
test("enforces per-user daily and global daily limits", async () => {
  const { t, owner, roomId, userId, otherId } = await fixture();
  await t.run(async ctx => { for (let i = 0; i < 10; i++) await ctx.db.insert("summaryRuns", { roomId, userId, createdAt: Date.now() - 120000, state: "failed", model: "test", sourceCount: 1, truncated: false }); });
  await expect(owner.mutation(api.summaries.reserve, { roomId, serviceSecret, model: "test" })).rejects.toThrow("RATE_LIMITED");
  await t.run(async ctx => { for (const run of await ctx.db.query("summaryRuns").collect()) await ctx.db.delete(run._id); for (let i = 0; i < 100; i++) await ctx.db.insert("summaryRuns", { roomId, userId: otherId, createdAt: Date.now() - 120000, state: "failed", model: "test", sourceCount: 1, truncated: false }); });
  await expect(owner.mutation(api.summaries.reserve, { roomId, serviceSecret, model: "test" })).rejects.toThrow("RATE_LIMITED");
});
test("bounds source size and excludes deleted messages and unfinished captions", async () => {
  const { t, owner, roomId, userId } = await fixture();
  await t.run(async ctx => {
    await ctx.db.insert("messages", { roomId, userId, content: "DELETED_SECRET", isDeleted: true, type: "text", createdAt: Date.now() });
    await ctx.db.insert("captions", { roomId, userId, content: "UNFINISHED_SECRET", isProcessed: false, startTime: Date.now() });
    for (let i = 0; i < 20; i++) await ctx.db.insert("messages", { roomId, userId, content: "x".repeat(3000), type: "text", createdAt: Date.now() });
  });
  const run = await owner.mutation(api.summaries.reserve, { roomId, serviceSecret, model: "test" });
  expect(run.source.length).toBeLessThanOrEqual(30000); expect(run.truncated).toBe(true);
  expect(run.source).not.toMatch(/DELETED_SECRET|UNFINISHED_SECRET/);
});
test("rejects expired and oversized results without saving", async () => {
  const { t, owner, roomId } = await fixture();
  const run = await owner.mutation(api.summaries.reserve, { roomId, serviceSecret, model: "test" });
  await expect(owner.mutation(api.summaries.finish, { runId: run.runId, serviceSecret, content: "x".repeat(12001) })).rejects.toThrow("INVALID_SUMMARY");
  await t.run(ctx => ctx.db.patch(run.runId, { createdAt: Date.now() - 121000 }));
  await expect(owner.mutation(api.summaries.finish, { runId: run.runId, serviceSecret, content: "late" })).rejects.toThrow("INVALID_SUMMARY");
});
test("blocks identity spoofing and destructive operations", async () => {
  const { t, owner, stranger, roomId, userId } = await fixture();
  await expect(stranger.mutation(api.users.createOrUpdate, { tokenIdentifier: "clerk:owner" })).rejects.toThrow("FORBIDDEN");
  await expect(stranger.mutation(api.rooms.deleteRoom, { roomId, userId })).rejects.toThrow("FORBIDDEN");
  await expect(owner.mutation(api.rooms.triggerDeleteAllRooms, {})).rejects.toThrow("FORBIDDEN");
  await expect(t.mutation(api.users.deleteAllUsers, { confirmationPhrase: "ERASE_ALL_USERS_CONFIRM" })).rejects.toThrow("FORBIDDEN");
  expect(await t.run(ctx => ctx.db.get(roomId))).not.toBeNull();
});
test("does not leak private codes and refuses stranger video tokens", async () => {
  const { t, stranger, roomId } = await fixture();
  expect(await stranger.query(api.rooms.authorizeVideoRoom, { roomName: roomId })).toBe(false);
  const rooms = await t.query(api.rooms.list, {});
  expect(JSON.stringify(rooms)).not.toContain("test-code");
  expect(JSON.stringify(await t.query(api.rooms.get, { roomId }))).not.toContain("test-code");
});
test("private-code grant enables joining and closed-room history remains member-only", async () => {
  const { t, stranger, owner, roomId, otherId } = await fixture();
  expect(await stranger.query(api.rooms.canReadRoom, { roomId })).toBe(false);
  await expect(stranger.mutation(api.rooms.joinRoom, { roomId, userId: otherId })).rejects.toThrow();
  await stranger.mutation(api.rooms.checkAccessCode, { roomId, accessCode: "test-code" });
  expect(await stranger.query(api.rooms.authorizeVideoRoom, { roomName: roomId })).toBe(true);
  await stranger.mutation(api.rooms.joinRoom, { roomId, userId: otherId });
  expect(await stranger.query(api.rooms.canReadRoom, { roomId })).toBe(true);
  await t.run(ctx => ctx.db.patch(roomId, { status: "ended" }));
  expect(await stranger.query(api.rooms.canReadRoom, { roomId })).toBe(true);
  expect(await owner.query(api.rooms.canReadRoom, { roomId })).toBe(true);
  expect(await stranger.query(api.rooms.authorizeVideoRoom, { roomName: roomId })).toBe(false);
});
test("empty sources never reserve budget or produce fake summaries", async () => {
  const { t, owner, roomId } = await fixture();
  await t.run(async ctx => { for (const m of await ctx.db.query("messages").collect()) await ctx.db.delete(m._id); });
  await expect(owner.mutation(api.summaries.reserve, { roomId, serviceSecret, model: "test" })).rejects.toThrow("NO_CONTENT");
  expect(await t.run(ctx => ctx.db.query("summaryRuns").collect())).toHaveLength(0);
});
test("a newer run prevents an old result from overwriting it", async () => {
  const { t, owner, roomId } = await fixture();
  const first = await owner.mutation(api.summaries.reserve, { roomId, serviceSecret, model: "test" });
  await t.run(ctx => ctx.db.patch(first.runId, { createdAt: Date.now() - 61000 }));
  await owner.mutation(api.summaries.reserve, { roomId, serviceSecret, model: "test" });
  await expect(owner.mutation(api.summaries.finish, { runId: first.runId, serviceSecret, content: "Old" })).rejects.toThrow("STALE_RUN");
});
test("email invitation creation is owner-only and acceptance requires verified matching email", async () => {
  const { t, owner, stranger, roomId } = await fixture();
  await expect(stranger.mutation(api.invitations.createInvitation, { roomId, email: "stranger@example.test" })).rejects.toThrow("FORBIDDEN");
  const invite = await owner.mutation(api.invitations.createInvitation, { roomId, email: "stranger@example.test" });
  expect(invite?.token.length).toBe(32);
  const unverified = t.withIdentity({ subject: "stranger", email: "stranger@example.test", emailVerified: false });
  await expect(unverified.mutation(api.invitations.useInvitation, { token: invite!.token })).rejects.toThrow("FORBIDDEN");
  await expect(owner.mutation(api.invitations.useInvitation, { token: invite!.token })).rejects.toThrow("FORBIDDEN");
  await stranger.mutation(api.invitations.useInvitation, { token: invite!.token });
  expect(await stranger.query(api.rooms.authorizeVideoRoom, { roomName: roomId })).toBe(true);
});
