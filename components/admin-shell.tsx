"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode } from "react";

export function AdminShell({ name, children }: { name: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  async function logout() { await fetch("/api/logout", { method: "POST" }); router.replace("/login"); router.refresh(); }
  const item = (href: string, label: string) => <Link href={href} className={`mt-2 block rounded-lg px-3 py-2 text-xs ${pathname.startsWith(href) ? "bg-[var(--accent)]" : "hover:bg-white/10"}`}>{label}</Link>;
  return <div className="min-h-screen bg-[var(--bg)] lg:flex">
    <aside className="w-[220px] bg-[var(--navy)] p-4 text-white">
      <div className="flex items-center gap-3"><Image src="/logo-icon.png" alt="" width={36} height={36} className="rounded bg-white p-1" /><b>QualityFriend</b></div>
      <p className="mt-8 text-[9px] uppercase text-white/35">Overview</p>
      {item("/dashboard", "🏨 Hotels")}
      {item("/billing", "💳 PayPal billing")}
      {item("/coupons", "🎟️ Coupons")}
      <p className="mt-[calc(100vh-240px)] text-xs">{name}<span className="block text-[9px] text-white/35">Super administrator</span></p>
    </aside>
    <div className="flex-1"><header className="flex h-16 items-center border-b bg-white px-7"><b>Platform administration</b><button onClick={() => void logout()} className="ml-auto h-9 w-9 cursor-pointer rounded-lg border" title="Sign out">↪</button></header>{children}</div>
  </div>;
}
