import { beforeAll,afterAll,it,expect } from 'vitest';
import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { startApi,stopApi } from '../helpers';
let api:ChildProcess;let cookie='';const base='http://localhost:3103';
async function req(path:string,body?:unknown,method?:string,session=cookie){const r=await fetch(base+path,{method:method??(body?'POST':'GET'),headers:{'Content-Type':'application/json',cookie:session},...(body?{body:JSON.stringify(body)}:{})});return {r,data:await r.json()};}
beforeAll(async()=>{api=await startApi(3103);});afterAll(async()=>{await stopApi(api);});
it('protects drafts, validates publishing and prevents stale writes',async()=>{
 const registration=await req('/auth/register',{email:`${randomUUID()}@example.test`,password:randomUUID()});expect(registration.r.status).toBe(201);cookie=registration.r.headers.get('set-cookie')!.split(';')[0];
 const {data:q}=await req('/quizzes',{});expect((await req(`/quizzes/${q.id}`,undefined,undefined,'')).r.status).toBe(401);
 expect((await req(`/quizzes/${q.id}/publish`,{revision:1})).r.status).toBe(400);
 const draft={title:'Test',questions:[{id:'1',type:'boolean',text:'Test?',options:['Wahr','Falsch'],correctIndex:0,durationSeconds:5}]};
 const results=await Promise.all([req(`/quizzes/${q.id}`,{draft,revision:1},'PUT'),req(`/quizzes/${q.id}`,{draft:{...draft,title:'Other'},revision:1},'PUT')]);expect(results.map(x=>x.r.status).sort()).toEqual([200,409]);
 const {data:version}=await req(`/quizzes/${q.id}/publish`,{revision:2});expect(version.number).toBe(1);
 const another=await req('/auth/register',{email:`${randomUUID()}@example.test`,password:randomUUID()});const otherCookie=another.r.headers.get('set-cookie')!.split(';')[0];
 expect((await req(`/quizzes/${q.id}`,undefined,undefined,otherCookie)).r.status).toBe(400);
 expect((await req(`/quizzes/${q.id}`,{draft,revision:2},'PUT',otherCookie)).r.status).toBe(400);
 expect((await req(`/quizzes/${q.id}`,{draft:{...draft,questions:[{...draft.questions[0],durationSeconds:0}]},revision:2},'PUT')).r.status).toBe(400);
 await req('/auth/logout',{});expect((await req('/auth/me')).r.status).toBe(401);
});
