// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import type { Id } from "convex/_generated/dataModel";
import { VideoRoomCard } from "./video-room-card";
import { JoinPrivateRoomButton } from "./join-private-room-button";

const mocks = vi.hoisted(() => ({ push: vi.fn(), mutation: vi.fn(), query: vi.fn(), success: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("convex/react", () => ({ useMutation: () => mocks.mutation, useConvex: () => ({ query: mocks.query, mutation: mocks.mutation }) }));
vi.mock("sonner", () => ({ toast: { success: mocks.success } }));
vi.mock("./invite-users", () => ({ InviteUsers: ({ trigger }: { trigger: React.ReactNode }) => trigger }));
beforeEach(() => { vi.resetAllMocks(); });
const roomId = "test-room" as Id<"rooms">;

test.each(["audio", "video"] as const)("routes a live %s room to its actual surface", async roomType => {
  const user = userEvent.setup();
  render(<VideoRoomCard roomId={roomId} roomName="Demo room" isPrivate={false} roomType={roomType} status="live" />);
  expect(screen.getByText("Live")).toBeVisible();
  expect(screen.getByText(roomType === "video" ? "Public video room" : "Public chat room")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Join" }));
  expect(mocks.push).toHaveBeenCalledWith(roomType === "video" ? `/video-rooms/${roomId}` : `/rooms/${roomId}`);
});

test.each(["scheduled", "ended"])("does not offer joining a %s video room", async status => {
  const user = userEvent.setup();
  render(<VideoRoomCard roomId={roomId} roomName="Demo" isPrivate={false} roomType="video" status={status} />);
  const button = screen.getByRole("button", { name: status === "ended" ? "Ended" : "Not started" });
  expect(button).toBeDisabled();
  await user.click(button);
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Invite" })).not.toBeInTheDocument();
});

test("ended chat offers history rather than a live call", async () => {
  render(<VideoRoomCard roomId={roomId} roomName="Demo" isPrivate={false} roomType="audio" status="ended" />);
  await userEvent.click(screen.getByRole("button", { name: "View chat" }));
  expect(mocks.push).toHaveBeenCalledWith(`/rooms/${roomId}`);
});

test("private card preserves mixed-case codes and does not navigate on rejection", async () => {
  mocks.mutation.mockResolvedValue(false);
  const user = userEvent.setup();
  render(<VideoRoomCard roomId={roomId} roomName="Demo" isPrivate roomType="audio" status="live" />);
  await user.click(screen.getByRole("button", { name: "Join" }));
  await user.type(screen.getByLabelText("Code"), "AbCd1234xYz9");
  await user.click(screen.getByRole("button", { name: "Join Room" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid access code");
  expect(mocks.push).not.toHaveBeenCalled();
  mocks.mutation.mockResolvedValue(true);
  await user.click(screen.getByRole("button", { name: "Join Room" }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(`/rooms/${roomId}`));
  expect(mocks.mutation).toHaveBeenLastCalledWith({ roomId, accessCode: "AbCd1234xYz9" });
});

test("join-by-code keeps case and navigates only after membership is accepted", async () => {
  mocks.query.mockResolvedValue({ roomId, type: "video" });
  mocks.mutation.mockResolvedValue(true);
  const user = userEvent.setup();
  render(<JoinPrivateRoomButton />);
  await user.click(screen.getByRole("button", { name: "Join Private Room" }));
  await user.type(screen.getByLabelText("Code"), "AbCd1234xYz9");
  await user.click(screen.getByRole("button", { name: "Find & Join Room" }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(`/video-rooms/${roomId}`));
  expect(mocks.query).toHaveBeenCalledWith(expect.anything(), { accessCode: "AbCd1234xYz9" });
  expect(mocks.mutation).toHaveBeenCalledWith(expect.anything(), { roomId, accessCode: "AbCd1234xYz9" });
});

test("join-by-code errors are visible without exposing backend details", async () => {
  mocks.query.mockRejectedValue(new Error("internal backend details"));
  const user = userEvent.setup();
  render(<JoinPrivateRoomButton />);
  await user.click(screen.getByRole("button", { name: "Join Private Room" }));
  await user.type(screen.getByLabelText("Code"), "AbCd1234xYz9");
  await user.click(screen.getByRole("button", { name: "Find & Join Room" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to join this room");
  expect(screen.queryByText(/internal backend details/)).not.toBeInTheDocument();
  expect(mocks.push).not.toHaveBeenCalled();
});
