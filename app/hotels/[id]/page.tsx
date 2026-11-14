import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { HotelMcpForm } from "../../../components/hotel-mcp-form";
import { requireAdmin } from "../../../lib/auth/session";
import { prisma } from "../../../lib/prisma";

const formatDate = (value: Date) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(value);

export default async function HotelPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  const hotel = await prisma.hotelTenant.findUnique({
    where: { id },
    include: {
      users: { where: { isDeleted: false }, include: { hotelRole: true }, orderBy: { firstName: "asc" } },
      _count: { select: { paymentEvents: { where: { eventType: "PAYMENT.SALE.COMPLETED" } } } },
    },
  });
  if (!hotel) notFound();
  const adminCreated = hotel.creationSource === "ADMIN";
  const details: [string, string | null][] = [
    ["English name", hotel.hotelNameEn],
    ["German name", hotel.hotelNameDe],
    ["Italian name", hotel.hotelNameIt],
    ["Created", formatDate(hotel.createdAt)],
    ["Email", hotel.email],
    ["Contact", hotel.contactPerson],
    ["Phone", hotel.phoneNumber],
    ["Address", `${hotel.streetAddress}, ${hotel.postalCode} ${hotel.city}`],
    ["Country", hotel.province ? `${hotel.country}, ${hotel.province}` : hotel.country],
    ["Language", hotel.hotelLanguage],
    ["VAT ID", hotel.vatId],
    ["Tripadvisor ID", hotel.tripadvisorId],
    ["Hotel status", hotel.isActive ? "Active" : "Inactive"],
    ["Created from", adminCreated ? "Admin" : "Hotel registration"],
    ["MCP active", hotel.activeMcp ? "Yes" : "No"],
    ["MCP hotel ID", hotel.mcpHotelId],
    ["Subscription", adminCreated ? "No subscription" : hotel.subscriptionStatus.replaceAll("_", " ")],
    ["Next billing", adminCreated ? null : hotel.subscriptionCurrentPeriodEnd ? formatDate(hotel.subscriptionCurrentPeriodEnd) : null],
  ];
  return (
    <AdminShell name={admin.name}>
      <main className="p-5 lg:p-7">
        <Link href="/dashboard" className="text-xs text-[var(--muted)]">← Hotels</Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{hotel.hotelNameEn}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${adminCreated ? "bg-sky-50 text-sky-800" : "bg-[#f3f1ec] text-[var(--muted)]"}`}>{adminCreated ? "Admin created" : "Self registered"}</span>
            </div>
            <p className="text-sm text-[var(--muted)]">{hotel.companyName}</p>
          </div>
          <Link href={`/hotels/${hotel.id}/transactions`} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white">💳 Transactions ({hotel._count.paymentEvents})</Link>
        </div>
        {created === "1" ? <p className="mt-4 rounded-lg bg-sky-50 p-4 text-sm text-sky-900">{hotel.email} can sign in on the hotel app now. No payment or subscription was created.</p> : null}
        <section className="mt-6 rounded-xl border bg-white p-5">
          <h2 className="font-bold">Hotel details</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{details.map(([key, value]) => <div key={key}><small className="font-bold uppercase text-[var(--muted)]">{key}</small><p className="break-all text-sm">{value || "—"}</p></div>)}</div>
        </section>
        <HotelMcpForm hotelId={hotel.id} active={hotel.activeMcp} mcpHotelId={hotel.mcpHotelId} />
        <section className="mt-6 overflow-x-auto rounded-xl border bg-white">
          <h2 className="p-5 font-bold">Users ({hotel.users.length})</h2>
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[#f8f7f5] text-xs text-[var(--muted)]"><tr><th className="p-4">User</th><th>Email</th><th>Role</th><th>Language</th><th>Status</th><th>Last login</th><th /></tr></thead>
            <tbody>{hotel.users.map((user) => <tr key={user.id} className="border-t"><td className="p-4 font-semibold">{user.firstName} {user.lastName}</td><td>{user.email}</td><td>{user.hotelRole.nameEn}</td><td>{user.language}</td><td>{user.isActive ? "Active" : "Inactive"}</td><td>{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}</td><td className="pr-4 text-right"><Link href={`/hotels/${hotel.id}/users/${user.id}`} className="font-semibold text-[var(--accent)]">MCP login</Link></td></tr>)}</tbody>
          </table>
        </section>
      </main>
    </AdminShell>
  );
}
