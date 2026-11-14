"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const fields = [
  { name: "company", label: "Company", placeholder: "Sample Ltd." },
  { name: "hotelName", label: "Hotel name", placeholder: "Hotel Alpenblick" },
  { name: "firstName", label: "Admin first name" },
  { name: "lastName", label: "Admin last name" },
  { name: "email", label: "Admin email", type: "email", placeholder: "name@hotel.com" },
  { name: "password", label: "Admin password", type: "password", placeholder: "At least 8 characters" },
  { name: "phone", label: "Phone (optional)", optional: true },
  { name: "vatId", label: "Tax code (optional)", optional: true },
  { name: "country", label: "Country" },
  { name: "province", label: "Province (optional)", optional: true },
  { name: "city", label: "City" },
  { name: "streetAddress", label: "Street address" },
  { name: "zip", label: "ZIP / Postal code" },
] as const;

export function CreateHotelForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    setError("");
    const response = await fetch("/api/hotels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok || !result?.id) {
      setError(result?.error === "EMAIL_EXISTS" ? "That email is already used by another hotel user." : "Check the required fields. Password must be at least 8 characters.");
      setBusy(false);
      return;
    }
    router.push(`/hotels/${result.id}?created=1`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-2">
      <p className="text-sm text-[var(--muted)] md:col-span-2">Creates the hotel and its administrator. They can sign in on the hotel app immediately. No PayPal subscription is created. Hotels that register themselves still pay as they do now.</p>
      <label className="text-xs font-bold">Language
        <select name="language" defaultValue="EN" className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-normal">
          <option value="EN">English</option>
          <option value="DE">Deutsch</option>
          <option value="IT">Italiano</option>
        </select>
      </label>
      {fields.map((field) => (
        <label key={field.name} className="text-xs font-bold">{field.label}
          <input name={field.name} type={"type" in field ? field.type : "text"} required={!("optional" in field && field.optional)} placeholder={"placeholder" in field ? field.placeholder : undefined} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-normal" />
        </label>
      ))}
      {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
      <button disabled={busy} className="cursor-pointer rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 md:col-span-2 md:justify-self-start">{busy ? "Creating…" : "Create hotel"}</button>
    </form>
  );
}
