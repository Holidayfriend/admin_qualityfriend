import Link from "next/link";
import { notFound } from "next/navigation";
import { UserMcpForm } from "../../../../../components/user-mcp-form";
import { AdminShell } from "../../../../../components/admin-shell";
import { requireAdmin } from "../../../../../lib/auth/session";
import { prisma } from "../../../../../lib/prisma";

export default async function HotelUserPage({ params }: { params: Promise<{ id: string; userId: string }> }) {
  const current = await requireAdmin();
  const { id, userId } = await params;
  const user = await prisma.user.findFirst({
    where: { id: userId, hotelTenantId: id, isDeleted: false },
    include: { hotelRole: true, hotelTenant: { select: { hotelNameEn: true } } },
  });
  if (!user) notFound();
  const mcpEmail = user.mcpUserEmail || user.email;
  return (
    <AdminShell name={current.name}>
      <main className="p-5 lg:p-7">
        <Link href={`/hotels/${id}`} className="text-xs text-[var(--muted)]">← {user.hotelTenant.hotelNameEn}</Link>
        <h1 className="mt-4 text-2xl font-bold">{user.firstName} {user.lastName}</h1>
        <p className="text-sm text-[var(--muted)]">{user.hotelRole.nameEn} · QualityFriend email {user.email}</p>
        <UserMcpForm hotelId={id} userId={user.id} mcpEmail={mcpEmail} mcpPassword={user.mcpUserPassword || ""} />
      </main>
    </AdminShell>
  );
}
