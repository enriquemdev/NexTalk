// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { InviteButton } from "./invite-button";
import type { Id } from "../../../convex/_generated/dataModel";
const mocks = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", vi.fn()); });
async function open() { const user = userEvent.setup(); render(<InviteButton roomId={"room" as Id<"rooms">} />); await user.click(screen.getByRole("button", { name: "Invite" })); return user; }
test("opens the actual dialog", async () => { await open(); expect(screen.getByRole("dialog")).toBeInTheDocument(); });
test("submits room-bound invitation and confirms only on success", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 })); const user = await open();
  await user.type(screen.getByPlaceholderText("Enter email address"), "person@example.test"); await user.click(screen.getByRole("button", { name: "Send Invitation" }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Invitation sent" })));
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ roomId: "room", email: "person@example.test" });
});
test("delivery failure stays an error and never becomes a success toast", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 502 })); const user = await open(); await user.type(screen.getByPlaceholderText("Enter email address"), "person@example.test"); await user.click(screen.getByRole("button", { name: "Send Invitation" }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
  expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Invitation sent" }));
});
