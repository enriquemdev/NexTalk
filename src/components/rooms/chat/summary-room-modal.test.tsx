// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("convex/react", () => ({ useQuery: mocks.query }));
import { SummaryRoomModal } from "./summary-room-modal";
import type { Id } from "convex/_generated/dataModel";
const props = { roomId: "room" as Id<"rooms">, isOpen: true, onOpenChange: vi.fn(), canGenerate: true };
function stream(events: object[]) { return new Response(events.map(e => JSON.stringify(e)).join("\n") + "\n"); }
beforeEach(() => { vi.restoreAllMocks(); mocks.query.mockReturnValue(null); });
test("requires consent and never generates automatically", async () => {
  const fetch = vi.spyOn(globalThis, "fetch"); render(<SummaryRoomModal {...props} />);
  expect(screen.getByRole("button", { name: "Generate summary" })).toBeDisabled();
  expect(fetch).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("button", { name: "Generate summary" })).toBeEnabled();
});
test("allows download only after the server confirms persistence", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(stream([{ type: "delta", text: "Final summary" }, { type: "saved" }]));
  render(<SummaryRoomModal {...props} />);
  await userEvent.click(screen.getByRole("checkbox")); await userEvent.click(screen.getByRole("button", { name: "Generate summary" }));
  expect(await screen.findByText("Summary saved")).toBeInTheDocument();
  expect(screen.getByText("Final summary")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
});
test("partial output without saved receipt is not downloadable", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(stream([{ type: "delta", text: "Incomplete" }]));
  render(<SummaryRoomModal {...props} />);
  await userEvent.click(screen.getByRole("checkbox")); await userEvent.click(screen.getByRole("button", { name: "Generate summary" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("before the summary was saved");
  expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
});
test("denies generation for non-owners while allowing existing summaries", async () => {
  mocks.query.mockReturnValue({ content: "Saved result" }); render(<SummaryRoomModal {...props} canGenerate={false} />);
  await userEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("button", { name: "Generate summary" })).toBeDisabled(); expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
});
test("cancel does not report successful saving", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }));
  render(<SummaryRoomModal {...props} />);
  await userEvent.click(screen.getByRole("checkbox")); await userEvent.click(screen.getByRole("button", { name: "Generate summary" }));
  await userEvent.click(await screen.findByRole("button", { name: "Cancel generation" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Generation cancelled"));
  expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
});
