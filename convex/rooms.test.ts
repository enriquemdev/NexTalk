/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const userId = await ctx.db.insert("users", { tokenIdentifier: "clerk:demo-owner", createdAt: Date.now() });
    const rooms = [];
    for (const [name, status, isPrivate, type, isDeleted] of [
      ["Public live", "live", false, "video", false],
      ["Private live", "live", true, "video", false],
      ["Public ended", "ended", false, "video", false],
      ["Public scheduled", "scheduled", false, "video", false],
      ["Deleted live", "live", false, "video", true],
      ["Deleted scheduled", "scheduled", false, "video", true],
      ["Live chat", "live", false, "audio", false],
    ] as const) {
      rooms.push(await ctx.db.insert("rooms", {
        name, status, isPrivate, type, isDeleted, createdBy: userId, createdAt: Date.now(), isRecorded: false,
        ...(status === "scheduled" ? { scheduledFor: Date.now() + 3_600_000 } : {}),
        ...(isPrivate ? { accessCode: "AbCd1234xYz9" } : {}),
      }));
    }
    return { userId, rooms };
  });
  return { t, owner: t.withIdentity({ subject: "demo-owner" }), ...ids };
}

test("combines status and visibility before applying the limit", async () => {
  const { t } = await fixture();
  const live = await t.query(api.rooms.list, { status: "live", isPrivate: false });
  expect(live.map(room => room.name).sort()).toEqual(["Live chat", "Public live"]);
  const limited = await t.query(api.rooms.list, { status: "live", isPrivate: false, limit: 1 });
  expect(limited).toHaveLength(1);
  expect(limited[0]).toMatchObject({ status: "live", isPrivate: false });
  const privateRooms = await t.query(api.rooms.list, { status: "live", isPrivate: true });
  expect(privateRooms.map(room => room.name)).toEqual(["Private live"]);
  expect(privateRooms[0]).not.toHaveProperty("accessCode");
});

test("video discovery excludes ended/deleted rooms without discarding scheduled ones", async () => {
  const { t } = await fixture();
  const rooms = await t.query(api.rooms.listByType, { type: "video" });
  expect(rooms.map(room => room.name).sort()).toEqual(["Private live", "Public live", "Public scheduled"]);
  expect(rooms.every(room => !("accessCode" in room))).toBe(true);
});

test("upcoming rooms excludes soft-deleted entries", async () => {
  const { t } = await fixture();
  expect((await t.query(api.rooms.listScheduled, {})).map(room => room.name)).toEqual(["Public scheduled"]);
});

test("private codes are case-sensitive and require authentication", async () => {
  const { t, owner, rooms } = await fixture();
  await expect(t.query(api.rooms.findRoomByAccessCode, { accessCode: "AbCd1234xYz9" })).rejects.toThrow("UNAUTHENTICATED");
  expect(await owner.query(api.rooms.findRoomByAccessCode, { accessCode: "ABCD1234XYZ9" })).toBeNull();
  expect(await owner.query(api.rooms.findRoomByAccessCode, { accessCode: "AbCd1234xYz9" })).toEqual({ roomId: rooms[1], type: "video" });
  expect(await owner.mutation(api.rooms.checkAccessCode, { roomId: rooms[1], accessCode: "AbCd1234xYz9" })).toBe(true);
});
