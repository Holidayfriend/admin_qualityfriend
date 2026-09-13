import { admin } from "../../../../lib/auth/session";
import { listJobs, jobLogs, manageJob } from "../../../../lib/developer/jobs";
export const runtime="nodejs";
const uuid=(v:unknown):v is string=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function GET(request:Request){
  if(!await admin())return Response.json({error:"Unauthenticated"},{status:401});
  const url=new URL(request.url);
  try{
    const id=url.searchParams.get("id"),name=url.searchParams.get("name");
    if(id){if(!uuid(id)||!name)return Response.json({error:"Invalid job"},{status:400});const result=await jobLogs(id,name);return Response.json(result??{error:"Job not found"},{status:result?200:404,headers:{"Cache-Control":"no-store"}})}
    const page=Math.max(1,Math.min(10000,Number(url.searchParams.get("page"))||1));
    return Response.json(await listJobs(url.searchParams.get("state")??"",Math.floor(page)),{headers:{"Cache-Control":"no-store"}});
  }catch{return Response.json({error:"Cannot read job tables. Check PostgreSQL and queue setup."},{status:503})}
}
export async function POST(request:Request){
  const current=await admin();if(!current)return Response.json({error:"Unauthenticated"},{status:401});
  const origin=request.headers.get("origin");
  if(origin){try{const host=new URL(origin).host;if(![new URL(request.url).host,request.headers.get("host"),request.headers.get("x-forwarded-host")].includes(host))return Response.json({error:"Invalid origin"},{status:403})}catch{return Response.json({error:"Invalid origin"},{status:403})}}
  const data=await request.json().catch(()=>null);
  if(!uuid(data?.id)||typeof data?.name!=="string"||!["retry","delete"].includes(data?.action))return Response.json({error:"Invalid action"},{status:400});
  try{await manageJob(data.id,data.name,data.action,current.id);return Response.json({success:true})}
  catch(error){const known=error instanceof Error&&!('code' in error);return Response.json({error:known?error.message:"Job state changed or database action failed. Refresh and retry."},{status:409})}
}
