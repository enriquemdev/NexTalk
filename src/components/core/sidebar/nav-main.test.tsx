// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { NavMain } from "./nav-main";
import { SidebarProvider } from "@/components/ui/sidebar";

const mocks = vi.hoisted(() => ({ live: undefined as unknown, scheduled: undefined as unknown }));
vi.mock("@/hooks/useRooms", () => ({ useRooms: () => ({ useLiveRooms: () => mocks.live, useScheduledRooms: () => mocks.scheduled }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.ComponentProps<"a">) => <a href={href} {...props}>{children}</a> }));
beforeEach(() => { mocks.live = []; mocks.scheduled = []; });
function show() { render(<SidebarProvider><NavMain /></SidebarProvider>); }

test("empty navigation has no fake room links and marks recordings unavailable", () => {
  show();
  expect(screen.getByText("No live rooms yet")).toBeVisible();
  expect(screen.getByText("No upcoming rooms")).toBeVisible();
  expect(screen.queryAllByRole("link")).toHaveLength(0);
  expect(screen.getByRole("button", { name: "Recordings · not available" })).toBeDisabled();
});

test("loading is distinct from the empty state", () => {
  mocks.live = undefined;
  mocks.scheduled = undefined;
  show();
  expect(screen.getAllByRole("status")).toHaveLength(2);
  expect(screen.queryByText("No live rooms yet")).not.toBeInTheDocument();
});

test("live links respect type, with stable IDs for duplicate room names", () => {
  mocks.live = [{ _id: "video-id", name: "Demo", type: "video", status: "live" }, { _id: "chat-id", name: "Demo", type: "audio", status: "live" }];
  show();
  expect(screen.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/video-rooms/video-id", "/rooms/chat-id"]);
});

test("upcoming names do not offer a join before the room starts", () => {
  mocks.scheduled = [{ _id: "scheduled-id", name: "Planning", type: "video", status: "scheduled" }];
  show();
  expect(screen.getByText("Planning · not started")).toBeVisible();
  expect(screen.queryAllByRole("link")).toHaveLength(0);
});
