import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { requireAdmin } from "../../../lib/auth/session";
import { prisma } from "../../../lib/prisma";

const formatDate = (value: Date) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(value);

export default async function HotelPage({ params }: { params: Promise<{ id: string }> }) {
  const admin=await requireAdmin(),{id}=await params,hotel=await prisma.hotelTenant.findUnique({where:{id},include:{users:{where:{isDeleted:false},orderBy:{firstName:"asc"}},_count:{select:{paymentEvents:{where:{eventType:"PAYMENT.SALE.COMPLETED"}}}}}});
  if(!hotel)notFound();
  const details=[
    ["English name",hotel.hotelNameEn],["German name",hotel.hotelNameDe],["Italian name",hotel.hotelNameIt],["Created",formatDate(hotel.createdAt)],
    ["Email",hotel.email],["Contact",hotel.contactPerson],["Phone",hotel.phoneNumber],["Address",`${hotel.streetAddress}, ${hotel.postalCode} ${hotel.city}`],
    ["Country",hotel.country],["Language",hotel.hotelLanguage],["VAT ID",hotel.vatId],["Tripadvisor ID",hotel.tripadvisorId],
    ["Hotel status",hotel.isActive?"Active":"Inactive"],["Subscription",hotel.subscriptionStatus.replaceAll("_"," ")],["Next billing",hotel.subscriptionCurrentPeriodEnd?formatDate(hotel.subscriptionCurrentPeriodEnd):null],
  ];
  return <AdminShell name={admin.name}><main className="p-5 lg:p-7"><Link href="/dashboard" className="text-xs text-[var(--muted)]">← Hotels</Link><div className="mt-4 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">{hotel.hotelNameEn}</h1><p className="text-sm text-[var(--muted)]">{hotel.companyName}</p></div><Link href={`/hotels/${hotel.id}/transactions`} className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white">💳 Transactions ({hotel._count.paymentEvents})</Link></div><section className="mt-6 rounded-xl border bg-white p-5"><h2 className="font-bold">Hotel details</h2><div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{details.map(([key,value])=><div key={key}><small className="font-bold uppercase text-[var(--muted)]">{key}</small><p className="text-sm">{value||"—"}</p></div>)}</div></section><section className="mt-6 overflow-x-auto rounded-xl border bg-white"><h2 className="p-5 font-bold">Users ({hotel.users.length})</h2><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-[#f8f7f5] text-xs text-[var(--muted)]"><tr><th className="p-4">User</th><th>Email</th><th>Role</th><th>Language</th><th>Status</th><th>Last login</th></tr></thead><tbody>{hotel.users.map(user=><tr key={user.id} className="border-t"><td className="p-4 font-semibold">{user.firstName} {user.lastName}</td><td>{user.email}</td><td>{user.role.replace("_"," ")}</td><td>{user.language}</td><td>{user.isActive?"Active":"Inactive"}</td><td>{user.lastLoginAt?formatDate(user.lastLoginAt):"Never"}</td></tr>)}</tbody></table></section></main></AdminShell>;
}
