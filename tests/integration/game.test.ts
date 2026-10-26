import { afterAll, beforeAll, expect, it } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import type { Socket } from 'socket.io-client';
import type { Credentials } from '@quiz/contracts';
import { Pool } from 'pg';
import { seedQuiz } from '@quiz/game-engine';
import { startApi,stopApi,socketAt,cmd,sync,step,delay } from '../helpers';
let api:ChildProcess;const sockets:Socket[]=[];const db=new Pool({connectionString:process.env.DATABASE_URL??'postgresql://quiz@127.0.0.1:55432/quiz'});
beforeAll(async()=>{api=await startApi(3101,2);});
afterAll(async()=>{sockets.forEach(s=>s.disconnect());await stopApi(api);await db.end();});
it('30 players complete a round: durable ACKs, duplicate protection, no leaked solution and late rejection',async()=>{
 const host=await socketAt(3101);sockets.push(host);const auth=await cmd<Credentials>(host,{action:'create'});
 const players=await Promise.all(Array.from({length:30},async(_,i)=>{const s=await socketAt(3101);sockets.push(s);const c=await cmd<Credentials>(s,{action:'join',pin:auth.pin,name:`Spieler ${i}`});return {s,c};}));
 expect((await sync(host,auth)).players).toHaveLength(30);
 await expect(cmd(players[0].s,{action:'advance',...players[0].c,version:31})).rejects.toThrow('Host');
 for(let q=0;q<3;q++){
  const state=await step(host,auth);expect(state.phase).toBe('question');
  expect(state).not.toHaveProperty('correctIndex');expect(state.question).not.toHaveProperty('correctIndex');expect(state.question?.id).toBe(seedQuiz.questions[q].id);
  const limit=q===0?29:30;
  await Promise.all(players.slice(0,limit).map(async({s,c})=>{
   const input={action:'answer',...c,questionIndex:q,choice:seedQuiz.questions[q].correctIndex};
   const [a,b]=await Promise.all([cmd(s,input),cmd(s,input)]);expect(a.accepted).toBe(true);expect(b.accepted).toBe(true);expect([a.duplicate,b.duplicate].sort()).toEqual([false,true]);
  }));
  if(q===0){const open=await sync(players[0].s,players[0].c);expect(open.phase).toBe('question');expect(open).not.toHaveProperty('myPoints');expect(open.players.every(p=>p.score===0)).toBe(true);await delay(2200);await expect(cmd(players[29].s,{action:'answer',...players[29].c,questionIndex:q,choice:2})).rejects.toThrow('abgelaufen');}
  const revealed=await sync(host,auth);expect(revealed.phase).toBe('reveal');expect(revealed.correctIndex).toBe(seedQuiz.questions[q].correctIndex);
  expect((await db.query('SELECT count(*)::int AS n FROM answers WHERE room_id=$1 AND question_index=$2',[auth.roomId,q])).rows[0].n).toBe(limit);
  // Replaying an already accepted answer is safe even after the question closes.
  const repeated=await cmd(players[0].s,{action:'answer',...players[0].c,questionIndex:q,choice:0});expect(repeated.duplicate).toBe(true);
  expect((await step(host,auth)).phase).toBe('leaderboard');
 }
 expect((await step(host,auth)).phase).toBe('finished');
 const final=await sync(host,auth);const scores=(await db.query('SELECT player_id,SUM(points)::int score FROM answers WHERE room_id=$1 GROUP BY player_id',[auth.roomId])).rows;
 for(const p of final.players)expect(p.score).toBe(scores.find(x=>x.player_id===p.id).score);
 expect((await db.query('SELECT count(*)::int n FROM answers WHERE room_id=$1',[auth.roomId])).rows[0].n).toBe(89);
 const reconnect=await socketAt(3101);sockets.push(reconnect);expect((await sync(reconnect,players[0].c)).phase).toBe('finished');
});
