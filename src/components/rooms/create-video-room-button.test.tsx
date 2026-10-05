// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { Toaster } from "sonner";
import { CreateVideoRoomButton } from "./create-video-room-button";

const mocks = vi.hoisted(() => ({ push: vi.fn(), create: vi.fn(), query: vi.fn(), currentUser: { userId: "demo-owner" as string | null, isLoading: false } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("convex/react", () => ({ useMutation: () => mocks.create, useQuery: (...args: unknown[]) => mocks.query(...args) }));
vi.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: () => mocks.currentUser }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser = { userId: "demo-owner", isLoading: false };
});
async function open() {
  const user = userEvent.setup();
  render(<><CreateVideoRoomButton /><Toaster /></>);
  await user.click(screen.getByRole("button", { name: "New Video Room" }));
  return user;
}

test("keeps the display title intact and navigates using the returned ID", async () => {
  mocks.create.mockResolvedValue({ roomId: "created-demo" });
  const user = await open();
  await user.type(screen.getByLabelText("Room Name (Optional)"), "  Reunión de Diseño  ");
  await user.click(screen.getByRole("button", { name: "Create Room" }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/video-rooms/created-demo"));
  expect(mocks.create).toHaveBeenCalledWith({ name: "Reunión de Diseño", userId: "demo-owner", isPrivate: false, type: "video" });
  expect(await screen.findByText("Room created successfully!")).toBeVisible();
});

test("preserves fields on failure, shows inline feedback and a visible Sonner notification", async () => {
  mocks.create.mockRejectedValue(new Error("offline test"));
  const user = await open();
  await user.type(screen.getByLabelText("Room Name (Optional)"), "Demo title");
  await user.click(screen.getByRole("button", { name: "Create Room" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not create the room");
  expect(screen.getByLabelText("Room Name (Optional)")).toHaveValue("Demo title");
  expect(await screen.findByText("Failed to create room. Please try again.")).toBeVisible();
  expect(mocks.push).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Create Room" })).toBeEnabled();
});

test("prevents changing or closing the form while creation is pending", async () => {
  let resolve!: (result: { roomId: string }) => void;
  mocks.create.mockImplementation(() => new Promise(r => { resolve = r; }));
  const user = await open();
  await user.click(screen.getByRole("button", { name: "Create Room" }));
  expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
  expect(screen.getByLabelText("Room Name (Optional)")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await user.keyboard("{Escape}");
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(mocks.create).toHaveBeenCalledTimes(1);
  resolve({ roomId: "created-demo" });
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/video-rooms/created-demo"));
});

test("signed-out users get a sign-in action without making a mutation", async () => {
  mocks.currentUser = { userId: null, isLoading: false };
  const user = await open();
  await user.click(screen.getByRole("button", { name: "Sign in to create" }));
  expect(mocks.push).toHaveBeenCalledWith("/sign-in");
  expect(mocks.create).not.toHaveBeenCalled();
});

test("waits for user loading and does not eagerly load invitation users", () => {
  mocks.currentUser = { userId: null, isLoading: true };
  render(<CreateVideoRoomButton />);
  expect(screen.getByRole("button", { name: "New Video Room" })).toBeDisabled();
  expect(mocks.query.mock.calls.every(([, args]) => args === "skip")).toBe(true);
});

test("private creation shows the code and enters only after confirmation", async () => {
  mocks.create.mockResolvedValue({ roomId: "private-demo", accessCode: "AbCd1234xYz9" });
  const user = await open();
  await user.click(screen.getByRole("switch"));
  await user.click(screen.getByRole("button", { name: "Create Room" }));
  expect(await screen.findByRole("alertdialog")).toHaveTextContent("AbCd1234xYz9");
  expect(mocks.push).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Got it! Go to Room" }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/video-rooms/private-demo"));
});
