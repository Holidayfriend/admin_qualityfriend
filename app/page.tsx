import{redirect}from"next/navigation";import{admin}from"../lib/auth/session";export default async function Home(){redirect(await admin()?"/dashboard":"/login")}
