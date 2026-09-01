import{NextResponse}from"next/server";import{logoutSession}from"../../../lib/auth/session";export async function POST(){await logoutSession();return NextResponse.json({success:true})}
