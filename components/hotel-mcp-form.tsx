"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HotelMcpForm({ hotelId, active, mcpHotelId }: { hotelId: string; active: boolean; mcpHotelId: string | null }) {
  const router = useRouter();
  const [activeMcp, setActiveMcp] = useState(active);
  const [hotelMcpId, setHotelMcpId] = useState(mcpHotelId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch(`/api/hotels/${hotelId}/mcp`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activeMcp, mcpHotelId: hotelMcpId }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error === "MCP_HOTEL_ID_REQUIRED" ? "Paste the MCP hotel ID before activating." : "Could not save.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-6 rounded-xl border bg-white p-5"><h2 className="font-bold">MCP</h2><p className="mt-1 text-sm text-[var(--muted)]">Paste an existing MCP hotel ID. Saving updates only this hotel in the database.</p><label className="mt-4 block text-xs font-bold">MCP hotel ID<input value={hotelMcpId} onChange={(event) => { setHotelMcpId(event.target.value); setSaved(false); }} maxLength={128} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-mono text-sm" placeholder="Paste MCP hotel ID" /></label><label className="mt-4 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={activeMcp} onChange={(event) => { setActiveMcp(event.target.checked); setSaved(false); }} className="h-4 w-4" />MCP active</label>{error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}{saved ? <p className="mt-3 text-sm text-green-700">Saved.</p> : null}<button type="button" disabled={busy} onClick={() => void save()} className="mt-4 cursor-pointer rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button></section>;
}
