import { AdminShell } from "../../components/admin-shell";
import { DeveloperJobs } from "../../components/developer-jobs";
import { requireAdmin } from "../../lib/auth/session";
export default async function Page(){const admin=await requireAdmin();return <AdminShell name={admin.name}><DeveloperJobs/></AdminShell>}
