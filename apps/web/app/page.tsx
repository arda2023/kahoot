'use client';
import { useEffect, useState } from 'react';
import { brand } from '@quiz/ui';
import type { Credentials } from '@quiz/contracts';
import { command, connect } from '../lib/client';
export default function Page() {
 const [pin,setPin]=useState(''),[name,setName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const p=new URLSearchParams(window.location.search).get('pin');if(p&&/^\d{6}$/.test(p))setPin(p);},[]);
 async function go(action:'create'|'join') {
  setBusy(true);setError('');const socket=connect();
  try {const c=await command<Credentials>(socket,{action,pin,name});localStorage.setItem(`room:${c.roomId}`,JSON.stringify(c));window.location.href=`/play?room=${c.roomId}`;}
  catch(e){setError((e as Error).message);setBusy(false);}finally{socket.disconnect();}
 }
 return <main className="landing"><div className="eyebrow">WISSEN VERBINDET</div><h1>Eine Frage.<br/><em>Alle sind dabei.</em></h1><p className="lead">{brand.tagline} Öffne eine Runde oder steige direkt mit deinem Spielcode ein.</p>
 <div className="columns"><section className="card"><h2>Mitspielen</h2><p>Du brauchst nur die PIN und deinen Namen.</p><form onSubmit={e=>{e.preventDefault();void go('join');}}><label>Spiel-PIN<input inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} value={pin} onChange={e=>setPin(e.target.value)} placeholder="123456"/></label><label>Dein Name<input required maxLength={30} value={name} onChange={e=>setName(e.target.value)} placeholder="Wie heißt du?"/></label><button disabled={busy}>Beitreten →</button></form></section>
 <section className="card accent"><div className="eyebrow">DEINE RUNDE</div><h2>Bring alle zusammen.</h2><p>Drei Fragen, ein gemeinsamer Spielraum. Unser Beispielquiz ist sofort startklar.</p><div className="stat">3 <span>Fragen · ca. 2 Minuten</span></div><button disabled={busy} onClick={()=>void go('create')}>Beispielquiz starten</button><a className="textlink" href="/library">Eigene Quizze verwalten →</a></section></div>
 {error&&<p role="alert" className="error">{error}</p>}</main>;
}
