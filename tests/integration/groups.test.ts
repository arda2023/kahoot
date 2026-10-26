import { beforeAll,afterAll,it,expect } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { startApi,stopApi } from '../helpers';
let api:ChildProcess;const base='http://localhost:3106';
async function call(cookie:string,path:string,body?:unknown,method?:string){const r=await fetch(base+path,{method:method??(body?'POST':'GET'),headers:{'Content-Type':'application/json',cookie},...(body?{body:JSON.stringify(body)}:{})});return {r,data:await r.json()};}
async function account(){const email=`${randomUUID()}@example.test`;const result=await call('','/auth/register',{email,password:randomUUID()});return {email,id:result.data.id,cookie:result.r.headers.get('set-cookie')!.split(';')[0]};}
beforeAll(async()=>{api=await startApi(3106);});afterAll(async()=>{await stopApi(api);});
it('enforces group roles, sharing revocation and concurrent editor conflicts',async()=>{
 const owner=await account(),editor=await account(),viewer=await account();const o=owner.cookie,e=editor.cookie,v=viewer.cookie;
 const {data:g}=await call(o,'/groups',{name:'Testklasse'});expect((await call(o,`/groups/${g.id}/members`,{email:editor.email,role:'editor'},'PUT')).r.status).toBe(200);await call(o,`/groups/${g.id}/members`,{email:viewer.email,role:'viewer'},'PUT');
 expect((await call(e,`/groups/${g.id}/members`,{email:viewer.email,role:'editor'},'PUT')).r.status).toBe(400);
 const {data:q}=await call(o,'/quizzes',{});expect((await call(v,`/quizzes/${q.id}`)).r.status).toBe(400);await call(o,`/quizzes/${q.id}/shares`,{groupId:g.id});
 expect((await call(v,`/quizzes/${q.id}`)).data.accessRole).toBe('viewer');expect((await call(e,`/quizzes/${q.id}`)).data.accessRole).toBe('editor');expect((await call(v,'/quizzes')).data.some((x:any)=>x.id===q.id)).toBe(true);
 const draft={title:'Owner edit',questions:[{id:'q',type:'boolean',text:'Eine Frage',options:['Wahr','Falsch'],correctIndex:0,durationSeconds:5}]};
 expect((await call(v,`/quizzes/${q.id}`,{draft,revision:1},'PUT')).r.status).toBe(400);
 const saves=await Promise.all([call(o,`/quizzes/${q.id}`,{draft,revision:1},'PUT'),call(e,`/quizzes/${q.id}`,{draft:{...draft,title:'Editor edit'},revision:1},'PUT')]);expect(saves.map(x=>x.r.status).sort()).toEqual([200,409]);expect(saves.find(x=>x.r.status===409)!.data.message).toContain('Konflikt');
 expect((await call(o,`/quizzes/${q.id}`)).data.draft).toEqual(saves.find(x=>x.r.status===200)!.data.draft);
 expect((await call(e,`/quizzes/${q.id}/publish`,{revision:2})).r.status).toBe(201);expect((await call(v,`/quizzes/${q.id}/publish`,{revision:2})).r.status).toBe(400);
 expect((await call(v,`/quizzes/${q.id}/host`,{})).r.status).toBe(201);
 expect((await call(e,`/quizzes/${q.id}/archive`,{archived:true})).r.status).toBe(400);
 await call(o,`/groups/${g.id}/members/${editor.id}`,undefined,'DELETE');expect((await call(e,`/quizzes/${q.id}`)).r.status).toBe(400);
 await call(o,`/quizzes/${q.id}/shares/${g.id}`,undefined,'DELETE');expect((await call(v,`/quizzes/${q.id}`)).r.status).toBe(400);
});
