"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UserMcpForm({ hotelId, userId, mcpEmail, mcpPassword }: { hotelId: string; userId: string; mcpEmail: string; mcpPassword: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(mcpEmail);
  const [password, setPassword] = useState(mcpPassword);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    const response = await fetch(`/api/hotels/${hotelId}/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mcpEmail: email, mcpPassword: password }),
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(result?.error === "INVALID_FIELDS" ? "Enter a valid MCP email and a password of at least 8 characters." : result?.error || "Could not save the MCP login.");
      setBusy(false);
      return;
    }
    setSaved(true);
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="mt-6 max-w-xl rounded-xl border bg-white p-5">
      <h2 className="font-bold">MCP login</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">These are the email and password sent to MCP when this person signs in. The QualityFriend password is unchanged.</p>
      <label className="mt-4 block text-xs font-bold">MCP email
        <input value={email} onChange={(event) => { setEmail(event.target.value); setSaved(false); }} type="email" required className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-normal" />
      </label>
      <label className="mt-4 block text-xs font-bold">MCP password
        <input value={password} onChange={(event) => { setPassword(event.target.value); setSaved(false); }} required minLength={8} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-mono text-sm font-normal" />
      </label>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-green-700">MCP login saved.</p> : null}
      <button disabled={busy} className="mt-4 cursor-pointer rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Save MCP login"}</button>
    </form>
  );
}
