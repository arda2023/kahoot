'use client';
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { Credentials, Snapshot } from '@quiz/contracts';
import { answerSymbols } from '@quiz/ui';
import { command, connect } from '../lib/client';
export default function Game() {
 const [state,setState]=useState<Snapshot|null>(null),[error,setError]=useState(''),[connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());
 const socket=useRef<Socket|null>(null), auth=useRef<Credentials|null>(null), offset=useRef(0);
 useEffect(()=>{
  const id=new URLSearchParams(window.location.search).get('room');
  try{auth.current=JSON.parse(localStorage.getItem(`room:${id}`)??'null');}catch{auth.current=null;}
  if(!auth.current){setError('Kein gespeicherter Zugang. Bitte erneut über die Startseite beitreten.');return;}
  const client=connect();socket.current=client;
  let active=true;
  async function sync(){try{const s=await command<Snapshot>(client,{action:'sync',...auth.current});if(active){offset.current=s.serverNow-Date.now();setState(old=>!old||s.version>=old.version?s:old);setError('');}}catch(e){if(active)setError((e as Error).message);}}
  client.on('connect',()=>{setConnected(true);void sync();});client.on('disconnect',()=>setConnected(false));client.on('changed',()=>void sync());
  const timer=setInterval(()=>{setNow(Date.now());},100);const poll=setInterval(()=>{if(client.connected)void sync();},2000);
  return ()=>{active=false;clearInterval(timer);clearInterval(poll);client.disconnect();};
 },[]);
 async function send(action:string,extra:Record<string,unknown>={}){
  if(!socket.current||!state)return;setBusy(true);setError('');
  try{await command(socket.current,{action,...auth.current,version:state.version,...extra});const s=await command<Snapshot>(socket.current,{action:'sync',...auth.current});setState(s);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 if(!state)return <main><h1>Spielraum</h1><p role={error?'alert':'status'}>{error||'Verbindung wird hergestellt …'}</p><a href="/">Zur Startseite</a></main>;
 const host=state.role==='host';const remaining=state.deadline?Math.max(0,Math.ceil((state.deadline-now-offset.current)/1000)):0;
 return <main className="game"><div className="gamebar"><span>{state.title}</span><span className={connected?'badge':'badge offline'}>{connected?'● Verbunden':'Verbindung wird wiederhergestellt …'}</span></div>
 {error&&<p role="alert" className="error">{error}</p>}
 {state.phase==='lobby'?<><div className="eyebrow">GEMEINSAM GEHT’S LOS</div><h1>Alle bereit?</h1><p>Beitreten mit Spiel-PIN</p><div className="pin" data-testid="pin">{state.pin}</div><p>{state.players.length} Personen in der Lobby</p><div className="players">{state.players.map(p=><span key={p.id} className="chip">{p.name}</span>)}</div>{host?<button disabled={!connected||busy||!state.players.length} onClick={()=>void send('advance')}>Spiel starten</button>:<p role="status">Warte, bis der Host das Spiel startet.</p>}</>:
 <><div className="eyebrow">FRAGE {state.questionIndex+1} VON {state.questionCount}</div>
 {state.phase==='question'||state.phase==='reveal'?<><div className="questionheading"><h1>{state.question?.text}</h1><span className="timer" aria-label="Verbleibende Sekunden">{state.phase==='question'?remaining:'✓'}</span></div>
 {state.question?.image&&<img className="questionimage" alt="Bild zur Frage" src={state.question.image}/>}
 <div className="answers">{state.question?.options.map((option,i)=><button key={i} className={`answer answer-${i} ${state.correctIndex===i?'correct':''}`} disabled={host||!connected||busy||state.phase!=='question'||state.myAnswer!==undefined||remaining===0} onClick={()=>void send('answer',{choice:i,questionIndex:state.questionIndex})}><span aria-hidden="true">{answerSymbols[i]}</span>{option}{state.correctIndex===i?' ✓':''}</button>)}</div>
 <p role="status">{state.myAnswer!==undefined?'Antwort gespeichert ✓':host?`${state.answeredCount} von ${state.players.length} Antworten`:state.phase==='question'?'Wähle eine Antwort.':'Zeit abgelaufen.'}</p>
 {state.phase==='reveal'&&<section className="card"><h2>Auflösung</h2><p>Richtig: {state.question?.options[state.correctIndex!]}</p>{!host&&<p>{state.myPoints??0} Punkte in dieser Frage</p>}{host&&<button disabled={busy} onClick={()=>void send('advance')}>Rangliste anzeigen</button>}</section>}</>:
 <><h1>{state.phase==='finished'?'Endergebnis':'Rangliste'}</h1>{state.phase==='finished'&&<p className="lead">Gut gespielt! Gemeinsam wisst ihr mehr.</p>}<ol className="ranking">{state.players.map(p=><li key={p.id}><span className="place">{p.rank}</span><strong>{p.name}</strong><span>{p.score} Punkte</span></li>)}</ol>{host&&state.phase==='leaderboard'&&<button disabled={busy} onClick={()=>void send('advance')}>{state.questionIndex+1===state.questionCount?'Ergebnis anzeigen':'Nächste Frage'}</button>}{state.phase==='finished'&&<a className="button" href="/">Neue Runde</a>}</>}
 </>}</main>;
}
