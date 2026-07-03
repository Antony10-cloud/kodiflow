"use client";
import { FormEvent, useState } from "react";

export function StkForm({ references }: { references: string[] }) {
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); setBusy(true); setMessage("");
    const data=new FormData(event.currentTarget);
    const response=await fetch("/api/mpesa/stk-push",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:data.get("phone"),amount:Number(data.get("amount")),accountReference:data.get("reference")})});
    const result=await response.json(); setMessage(result.message??"Request completed."); setBusy(false);
  }
  return <details className="management-panel"><summary>Send sandbox STK Push</summary><form className="inline-form form-columns" onSubmit={submit}><div className="notice warning">Completing the M-Pesa phone prompt can deduct real funds. Keep pilot tests at KES 1 and cancel unless a successful callback is required.</div><label>Safaricom phone<input name="phone" placeholder="2547XXXXXXXX" required /></label><label>Amount<input name="amount" type="number" min="1" defaultValue="1" required /></label><label>Tenant reference<select name="reference" required><option value="">Select reference</option>{references.map(ref=><option key={ref}>{ref}</option>)}</select></label><label className="confirm-check"><input type="checkbox" required /> I understand this can deduct real M-Pesa funds.</label><button disabled={busy}>{busy?"Sending…":"Send STK Push"}</button>{message&&<p className="form-message">{message}</p>}</form></details>;
}
