"use client";
import {useState} from "react";

export function OpenAiApiTest(){
  const[busy,setBusy]=useState(false),[toast,setToast]=useState<{ok:boolean;text:string}|null>(null);
  async function test(){
    if(busy)return;setBusy(true);setToast(null);
    try{const response=await fetch("/api/openai/test",{method:"POST"}),result=await response.json().catch(()=>null) as {message?:string}|null;setToast({ok:response.ok,text:response.ok?"OpenAI API is working.":result?.message||"OpenAI API test failed."})}
    catch{setToast({ok:false,text:"Could not connect to the test endpoint."})}
    finally{setBusy(false);window.setTimeout(()=>setToast(null),6000)}
  }
  return <><button type="button" onClick={()=>void test()} disabled={busy} className="cursor-pointer rounded-lg border bg-white px-4 py-2 text-sm font-bold disabled:cursor-wait disabled:opacity-60">{busy?"Testing GPT API…":"✨ Test GPT API"}</button>{toast?<div role="status" className={`fixed right-5 top-20 z-50 max-w-sm rounded-lg px-4 py-3 text-sm font-bold text-white shadow-xl ${toast.ok?"bg-green-600":"bg-red-600"}`}>{toast.ok?"✓":"✕"} {toast.text}</div>:null}</>;
}
