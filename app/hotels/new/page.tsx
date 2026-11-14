import Link from "next/link";
import { CreateHotelForm } from "../../../components/create-hotel-form";
import { AdminShell } from "../../../components/admin-shell";
import { requireAdmin } from "../../../lib/auth/session";

export default async function NewHotelPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell name={admin.name}>
      <main className="p-5 lg:p-7">
        <Link href="/dashboard" className="text-xs text-[var(--muted)]">← Hotels</Link>
        <h1 className="mt-4 text-2xl font-bold">Create hotel</h1>
        <p className="text-sm text-[var(--muted)]">Admin-created hotels are tagged separately and do not require payment.</p>
        <CreateHotelForm />
      </main>
    </AdminShell>
  );
}
