import "server-only";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";

const globalJobs = globalThis as typeof globalThis & { developerPool?: Pool };
const pool = globalJobs.developerPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
export async function listJobs(state: string, page: number) {
  const filter = ["created","retry","active","completed","failed","cancelled"].includes(state) ? state : null;
  const [jobs, counts] = await Promise.all([
    pool.query(`SELECT j.id,j.name,j.state,j.retry_count,j.retry_limit,j.created_on,j.started_on,j.completed_on,
      j.start_after,j.output,j.data->>'hotelTenantId' AS hotel_id,h.hotel_name_en AS hotel,
      r.status AS import_status,r.records_read,r.records_created,r.records_updated,r.error_summary
      FROM pgboss.job j LEFT JOIN hotel_tenants h ON h.id::text=j.data->>'hotelTenantId'
      LEFT JOIN import_runs r ON r.id::text=j.data->>'runId' AND r.hotel_tenant_id=h.id
      WHERE ($1::text IS NULL OR j.state::text=$1) ORDER BY j.created_on DESC,j.id LIMIT 50 OFFSET $2`,[filter,(page-1)*50]),
    pool.query("SELECT state,count(*)::int AS count FROM pgboss.job GROUP BY state"),
  ]);
  return {jobs:jobs.rows,counts:counts.rows,page};
}
export async function jobLogs(id: string, name: string) {
  const job = await pool.query("SELECT data->>'runId' AS run_id,data->>'hotelTenantId' AS hotel_id,output FROM pgboss.job WHERE id=$1 AND name=$2",[id,name]);
  if(!job.rows[0])return null;
  const logs = await pool.query(`SELECT id,action,description,changes,created_at FROM audit_logs
    WHERE entity_id::text=$1 AND hotel_tenant_id::text=$2 ORDER BY created_at DESC LIMIT 100`,[job.rows[0].run_id??id,job.rows[0].hotel_id]);
  return {logs:logs.rows,output:job.rows[0].output};
}

export async function manageJob(id:string,name:string,action:"retry"|"delete",adminId:string) {
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const found=await client.query("SELECT id,name,state,data,singleton_key FROM pgboss.job WHERE id=$1 AND name=$2 FOR UPDATE NOWAIT",[id,name]);
    const job=found.rows[0];
    if(!job)throw new Error("Job not found.");
    if(!["failed","cancelled","completed"].includes(job.state))throw new Error("Only finished, failed or cancelled jobs can be managed. Running/queued jobs are protected.");
    if(action==="retry"){
      if(job.state==="completed")throw new Error("Completed jobs cannot be retried.");
      if(name==="housekeeping-import-failed")throw new Error("Retry the original housekeeping-import job instead.");
      const busy=await client.query("SELECT 1 FROM pgboss.job WHERE name=$1 AND singleton_key=$2 AND state IN ('created','retry','active') LIMIT 1",[name,job.singleton_key]);
      if(job.singleton_key&&busy.rowCount)throw new Error("Another job for this hotel is already queued or running.");
      if(name==="housekeeping-import"){
        const run=await client.query("SELECT status FROM import_runs WHERE id=$1 AND hotel_tenant_id=$2 FOR UPDATE",[job.data.runId,job.data.hotelTenantId]);
        if(!run.rows[0]||run.rows[0].status==="SUCCEEDED")throw new Error("Import missing or already completed.");
        const dead=await client.query("SELECT state FROM pgboss.job WHERE source_id=$1 AND source_name=$2 AND state='active'",[id,name]);
        if(dead.rowCount)throw new Error("Failure handling is still active. Try again shortly.");
        await client.query("DELETE FROM pgboss.job WHERE source_id=$1 AND source_name=$2 AND state IN ('created','retry')",[id,name]);
        await client.query("UPDATE import_runs SET status='QUEUED',finished_at=NULL,error_summary=NULL,updated_at=NOW() WHERE id=$1 AND hotel_tenant_id=$2",[job.data.runId,job.data.hotelTenantId]);
        // Replace the old failure receipt when this same run eventually completes.
        await client.query("DELETE FROM notifications WHERE hotel_tenant_id=$1 AND recipient_id=$2 AND event_key=$3",[job.data.hotelTenantId,job.data.actorId,`housekeeping-import:${job.data.runId}`]);
      }
      await client.query(`UPDATE pgboss.job SET state='retry',retry_limit=retry_limit+1,start_after=NOW(),completed_on=NULL,
        keep_until=GREATEST(keep_until,NOW()+interval '7 days') WHERE id=$1 AND name=$2`,[id,name]);
    }else{
      await client.query("DELETE FROM pgboss.job WHERE id=$1 AND name=$2",[id,name]);
    }
    if(job.data?.hotelTenantId)await client.query(`INSERT INTO audit_logs (id,hotel_tenant_id,action,entity_type,entity_id,changes,description)
      VALUES ($1,$2,$3,'QUEUE_JOB',$4,$5::jsonb,$6::jsonb)`,[randomUUID(),job.data.hotelTenantId,action==="retry"?"STATUS_CHANGE":"DELETE",job.data.runId??id,
      JSON.stringify({adminId,jobId:id,queue:name,action}),JSON.stringify({en:`Administrator ${action}: ${name}`,de:`Administrator ${action}: ${name}`,it:`Amministratore ${action}: ${name}`})]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}
