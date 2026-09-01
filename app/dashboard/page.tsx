import Link from "next/link";
import { AdminShell } from "../../components/admin-shell";
import { requireAdmin } from "../../lib/auth/session";
import { prisma } from "../../lib/prisma";

const money = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const date = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const nextYear = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [hotels, userCount, payments] = await Promise.all([
    prisma.hotelTenant.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { users: { where: { isDeleted: false } } } } } }),
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.paymentEvent.findMany({ where: { eventType: "PAYMENT.SALE.COMPLETED", transactionAt: { gte: yearStart, lt: nextYear }, amount: { not: null } }, orderBy: { transactionAt: "desc" }, include: { hotelTenant: { select: { hotelNameEn: true } } } }),
  ]);
  const monthIncome = payments.filter((payment) => payment.transactionAt && payment.transactionAt >= monthStart).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const yearIncome = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const months = Array.from({ length: 12 }, (_, month) => ({ label: new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(Date.UTC(now.getUTCFullYear(), month, 1))), value: payments.filter((payment) => payment.transactionAt?.getUTCMonth() === month).reduce((sum, payment) => sum + Number(payment.amount), 0) }));
  return <AdminShell name={admin.name}><main className="p-5 lg:p-7">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-[var(--muted)]">QualityFriend platform and subscription overview.</p></div><Link href="/billing" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white">Manage PayPal plan</Link></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Card title="Total hotels" value={String(hotels.length)} icon="🏨"/><Card title="Active hotels" value={String(hotels.filter(h=>h.isActive&&h.subscriptionStatus==="ACTIVE").length)} icon="✅"/><Card title="Total users" value={String(userCount)} icon="👥"/><Card title="This month income" value={money.format(monthIncome)} icon="📅"/><Card title="This year income" value={money.format(yearIncome)} icon="💶"/></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><section className="rounded-xl border bg-white p-5"><div><h2 className="font-bold">Monthly income</h2><p className="text-xs text-[var(--muted)]">Verified PayPal payments in {now.getUTCFullYear()}</p></div><RevenueChart data={months}/></section><section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-5"><h2 className="font-bold">Recent transactions</h2></div>{payments.slice(0,6).length?payments.slice(0,6).map(payment=><div key={payment.id} className="flex items-center justify-between gap-3 border-b px-5 py-3 last:border-0"><div><p className="text-sm font-semibold">{payment.hotelTenant?.hotelNameEn||"Deleted hotel"}</p><p className="text-xs text-[var(--muted)]">{payment.transactionAt?date.format(payment.transactionAt):"Unknown date"}</p></div><span className="font-bold text-green-700">{money.format(Number(payment.amount))}</span></div>):<p className="p-5 text-sm text-[var(--muted)]">No completed payments this year.</p>}</section></div>
    <section className="mt-6 overflow-x-auto rounded-xl border bg-white"><div className="border-b p-5"><h2 className="font-bold">Hotels</h2><p className="text-xs text-[var(--muted)]">All registered QualityFriend hotels.</p></div><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#f8f7f5] text-xs text-[var(--muted)]"><tr><th className="p-4">Hotel</th><th>Location</th><th>Created</th><th>Users</th><th>Subscription</th><th/></tr></thead><tbody>{hotels.map(h=><tr key={h.id} className="border-t"><td className="p-4"><b>{h.hotelNameEn}</b><small className="block text-[var(--muted)]">{h.companyName}</small></td><td>{h.city}, {h.country}</td><td>{date.format(h.createdAt)}</td><td>{h._count.users}</td><td><Status value={h.subscriptionStatus}/></td><td className="pr-4 text-right"><Link href={`/hotels/${h.id}`} className="font-semibold text-[var(--accent)]">View details →</Link></td></tr>)}</tbody></table></section>
  </main></AdminShell>;
}

function Card({title,value,icon}:{title:string;value:string;icon:string}){return <div className="rounded-xl border bg-white p-5"><div className="flex items-start justify-between"><p className="text-xs text-[var(--muted)]">{title}</p><span>{icon}</span></div><b className="mt-2 block text-2xl">{value}</b></div>}
function Status({value}:{value:string}){const active=value==="ACTIVE";return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${active?"bg-green-50 text-green-700":"bg-amber-50 text-amber-700"}`}>{value.replaceAll("_"," ")}</span>}
function RevenueChart({data}:{data:{label:string;value:number}[]}){const max=Math.max(...data.map(item=>item.value),1);return <div className="mt-6 flex h-64 items-end gap-2 border-b border-l px-3 pt-4">{data.map(item=><div key={item.label} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"><span className="mb-1 text-[9px] font-semibold text-[var(--muted)]">{item.value?money.format(item.value):""}</span><div title={`${item.label}: ${money.format(item.value)}`} className="mx-auto w-full max-w-10 rounded-t bg-[var(--accent)] transition-all" style={{height:`${Math.max(item.value/max*82,item.value?4:1)}%`,opacity:item.value?1:.15}}/><span className="mt-2 pb-2 text-[10px] text-[var(--muted)]">{item.label}</span></div>)}</div>}
