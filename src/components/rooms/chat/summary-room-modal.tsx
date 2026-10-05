"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props { canGenerate?: boolean; roomId: Id<"rooms">; isOpen: boolean; onOpenChange: (open: boolean) => void; }
export function SummaryRoomModal({ roomId, isOpen, onOpenChange, canGenerate = false }: Props) {
  const saved = useQuery(api.summaries.getSummary, isOpen ? { roomId } : "skip");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [consent, setConsent] = useState(false);
  const generation = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => { generation.current++; abortRef.current?.abort(); }, []);
  useEffect(() => { generation.current++; abortRef.current?.abort(); setBusy(false); setText(""); setConfirmed(false); setConsent(false); setError(""); }, [roomId]);
  async function generate() {
    if (!canGenerate || !consent || busy) return;
    const operation = ++generation.current;
    setBusy(true); setError(""); setText(""); setConfirmed(false);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const response = await fetch("/api/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId, consent: true }), signal: controller.signal });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Unable to generate summary"); }
      if (!response.body) throw new Error("Summary stream unavailable");
      const reader = response.body.getReader(); const decoder = new TextDecoder();
      let buffer = "", completed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (operation !== generation.current) return;
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "delta") setText(previous => previous + event.text);
          else if (event.type === "saved") { completed = true; setConfirmed(true); }
          else if (event.type === "error") throw new Error(event.message);
        }
        if (done) break;
      }
      if (!completed) throw new Error("The connection ended before the summary was saved");
    } catch (err) {
      if (operation !== generation.current) return;
      setError(controller.signal.aborted ? "Generation cancelled. Reopen the summary to check whether saving finished." : err instanceof Error ? err.message : "Unable to generate summary");
    } finally { if (operation === generation.current) { setBusy(false); abortRef.current = null; } }
  }
  const displayed = text || saved?.content || "";
  const downloadable = !busy && !error && (text ? confirmed : !!saved);
  function download() {
    if (!downloadable) return;
    const url = URL.createObjectURL(new Blob([displayed], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "nextalk-summary.txt"; link.click(); URL.revokeObjectURL(url);
  }
  return <Dialog open={isOpen} onOpenChange={open => { if (!open) abortRef.current?.abort(); onOpenChange(open); }}>
    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>AI conversation summary</DialogTitle><DialogDescription>Summarizes existing chat messages and finalized captions. Automatic audio transcription is not enabled. Only the room owner can generate a summary.</DialogDescription></DialogHeader>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy} />I authorize sending this room’s recent conversation content to OpenAI. Up to 100 messages and 100 captions are considered, within a 30,000-character limit.</label>
      {saved?.truncated && <p className="text-sm">The saved summary covers a limited excerpt, not the full conversation.</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <p role="status">{busy ? "Generating — not saved yet…" : confirmed ? "Summary saved" : ""}</p>
      <div className="whitespace-pre-wrap text-sm border rounded p-4 min-h-24">{displayed || "No saved summary yet."}</div>
      <DialogFooter>
        {busy && <Button variant="outline" onClick={() => abortRef.current?.abort()}>Cancel generation</Button>}
        <Button variant="outline" disabled={!downloadable} onClick={download}>Download</Button>
        <Button disabled={!canGenerate || !consent || busy || saved === undefined} onClick={generate}>{busy ? "Generating…" : "Generate summary"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
