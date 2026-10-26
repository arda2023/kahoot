import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { Credentials, Phase, Quiz, Snapshot } from '@quiz/contracts';
import { nextPhase, points, rank, seedQuiz } from '@quiz/game-engine';
import { pool, transaction } from './db';
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('hex');
export function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
export interface Room { id:string; pin:string; host_hash:string; quiz:Quiz; phase:Phase; question_index:number; version:number; started_at:Date|null; deadline:Date|null; locked:boolean }
export function credentials(input: any): Credentials {
  ensure(input && typeof input.roomId === 'string' && /^[0-9a-f-]{36}$/i.test(input.roomId) && typeof input.token === 'string' && /^[0-9a-f]{64}$/.test(input.token), 'Ungültiger Zugang.');
  return input;
}
export async function getRoom(c:PoolClient,id:string) {
 const {rows} = await c.query<Room>('SELECT * FROM rooms WHERE id=$1 FOR UPDATE',[id]);
 ensure(rows[0],'Raum nicht gefunden.'); return rows[0];
}
export async function identity(c:PoolClient,r:Room,secret:string) {
 if(r.host_hash===hash(secret)) return {role:'host' as const,id:''};
 const {rows} = await c.query('SELECT id FROM players WHERE room_id=$1 AND token_hash=$2 AND NOT removed',[r.id,hash(secret)]);
 ensure(rows[0],'Zugang nicht gültig oder Teilnahme entfernt.'); return {role:'player' as const,id:rows[0].id as string};
}
export async function createRoom(quiz:Quiz = seedQuiz):Promise<Credentials> {
 const id=randomUUID(), secret=token();
 const copy=structuredClone(quiz);
 if(process.env.SEED_SECONDS && quiz===seedQuiz) copy.questions.forEach(q=>q.durationSeconds=Number(process.env.SEED_SECONDS));
 for(let attempt=0;attempt<10;attempt++) {
   const pin=String(randomInt(100000,1000000));
   const result=await pool.query('INSERT INTO rooms(id,pin,host_hash,quiz) VALUES($1,$2,$3,$4) ON CONFLICT(pin) DO NOTHING',[id,pin,hash(secret),JSON.stringify(copy)]);
   if(result.rowCount) return {roomId:id,pin,token:secret,role:'host'};
 }
 throw new Error('Bitte erneut versuchen.');
}
export async function joinRoom(input:any):Promise<Credentials> {
 ensure(input && typeof input.pin==='string' && /^\d{6}$/.test(input.pin),'PIN muss sechs Ziffern haben.');
 ensure(typeof input.name==='string' && input.name.trim().length>=1 && input.name.trim().length<=30,'Name muss 1–30 Zeichen haben.');
 return transaction(async c=>{
  const {rows}=await c.query<Room>('SELECT * FROM rooms WHERE pin=$1 FOR UPDATE',[input.pin]);
  const r=rows[0]; ensure(r,'PIN nicht gefunden.'); ensure(r.phase==='lobby'&&!r.locked,'Beitritt ist geschlossen.');
  const secret=token();
  const inserted=await c.query('INSERT INTO players(id,room_id,name,token_hash) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id',[randomUUID(),r.id,input.name.trim(),hash(secret)]);
  ensure(inserted.rowCount,'Dieser Name ist schon vergeben.');
  await c.query('UPDATE rooms SET version=version+1 WHERE id=$1',[r.id]);
  return {roomId:r.id,pin:r.pin,token:secret,role:'player'};
 });
}
async function dbNow(c:PoolClient):Promise<number> { return Number((await c.query('SELECT extract(epoch from clock_timestamp())*1000 AS now')).rows[0].now); }
async function expire(c:PoolClient,r:Room,now:number) {
 if(r.phase==='question' && r.deadline && now>=r.deadline.getTime()) {
   await c.query("UPDATE rooms SET phase='reveal',version=version+1 WHERE id=$1",[r.id]);
   r.phase='reveal'; r.version++;
 }
}
export async function snapshot(input:Credentials):Promise<Snapshot> {
 const auth=credentials(input);
 return transaction(async c=>{
  const r=await getRoom(c,auth.roomId); const who=await identity(c,r,auth.token); const now=await dbNow(c); await expire(c,r,now);
  const visibleIndex=r.phase==='question'?r.question_index-1:r.question_index;
  const {rows:players}=await c.query('SELECT p.id,p.name,COALESCE(SUM(a.points),0)::int AS score FROM players p LEFT JOIN answers a ON a.player_id=p.id AND a.question_index<=$2 WHERE p.room_id=$1 AND NOT p.removed GROUP BY p.id',[r.id,visibleIndex]);
  const {rows:answers}=await c.query('SELECT player_id,choice,points FROM answers WHERE room_id=$1 AND question_index=$2',[r.id,r.question_index]);
  const mine=answers.find(a=>a.player_id===who.id);
  const q=r.quiz.questions[r.question_index];
  // Explicit allowlist: never spread stored questions into a public payload.
  const publicQuestion=q?{id:q.id,text:q.text,options:q.options,durationSeconds:q.durationSeconds,type:q.type,...(q.image?{image:q.image}:{})}:null;
  const result:Snapshot={id:r.id,pin:r.pin,title:r.quiz.title,phase:r.phase,version:r.version,questionIndex:r.question_index,questionCount:r.quiz.questions.length,
    question:publicQuestion,deadline:r.deadline?.getTime()??null,serverNow:now,players:rank(players),answeredCount:answers.length,locked:r.locked,role:who.role};
  if(q && ['reveal','leaderboard','finished'].includes(r.phase)) result.correctIndex=q.correctIndex;
  if(mine) {result.myAnswer=mine.choice; if(r.phase!=='question') result.myPoints=mine.points;}
  return result;
 });
}
export async function advance(input:any) {
 const auth=credentials(input);
 return transaction(async c=>{
  const r=await getRoom(c,auth.roomId); const who=await identity(c,r,auth.token); ensure(who.role==='host','Nur der Host darf weitergehen.');
  ensure(input.version===r.version,'Spielstand hat sich geändert. Bitte erneut versuchen.');
  if(r.phase==='lobby') ensure((await c.query('SELECT id FROM players WHERE room_id=$1 AND NOT removed',[r.id])).rowCount,'Mindestens eine Person muss beitreten.');
  const phase=nextPhase(r.phase,r.question_index,r.quiz.questions.length);
  if(phase==='question') {
   const index=r.question_index+1; const now=await dbNow(c); const duration=r.quiz.questions[index].durationSeconds;
   await c.query('UPDATE rooms SET phase=$2,question_index=$3,started_at=$4,deadline=$5,version=version+1 WHERE id=$1',[r.id,phase,index,new Date(now),new Date(now+duration*1000)]);
  } else await c.query('UPDATE rooms SET phase=$2,version=version+1 WHERE id=$1',[r.id,phase]);
  return {accepted:true};
 });
}
export async function answer(input:any) {
 const auth=credentials(input);
 ensure(Number.isInteger(input.questionIndex)&&Number.isInteger(input.choice),'Ungültige Antwort.');
 return transaction(async c=>{
  const r=await getRoom(c,auth.roomId); const who=await identity(c,r,auth.token); ensure(who.role==='player','Nur Spieler können antworten.');
  const {rows:previous}=await c.query('SELECT choice FROM answers WHERE player_id=$1 AND question_index=$2',[who.id,input.questionIndex]);
  if(previous[0]) return {accepted:true,choice:previous[0].choice,duplicate:true};
  const now=await dbNow(c);
  ensure(r.phase==='question'&&r.question_index===input.questionIndex&&r.deadline&&now<r.deadline.getTime(),'Antwortfrist abgelaufen.');
  const q=r.quiz.questions[r.question_index]; ensure(input.choice>=0&&input.choice<q.options.length,'Ungültige Antwortoption.');
  const score=points(input.choice===q.correctIndex,now-r.started_at!.getTime(),q.durationSeconds*1000);
  await c.query('INSERT INTO answers(room_id,player_id,question_index,choice,points) VALUES($1,$2,$3,$4,$5)',[r.id,who.id,r.question_index,input.choice,score]);
  const {rows}=await c.query('SELECT (SELECT count(*) FROM answers WHERE room_id=$1 AND question_index=$2) AS answers,(SELECT count(*) FROM players WHERE room_id=$1 AND NOT removed) AS players',[r.id,r.question_index]);
  await c.query('UPDATE rooms SET version=version+1,phase=$2 WHERE id=$1',[r.id,Number(rows[0].answers)>=Number(rows[0].players)?'reveal':'question']);
  return {accepted:true,choice:input.choice,duplicate:false};
 });
}
export async function expireRooms():Promise<string[]> {
 const {rows}=await pool.query("UPDATE rooms SET phase='reveal',version=version+1 WHERE phase='question' AND deadline<=clock_timestamp() RETURNING id");
 return rows.map(r=>r.id);
}
