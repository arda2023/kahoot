import { io, Socket } from 'socket.io-client';
import type { Reply } from '@quiz/contracts';
export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
export function connect():Socket {return io(API,{transports:['websocket'],reconnection:true});}
export function command<T>(socket:Socket,input:unknown):Promise<T> {
 return new Promise((resolve,reject)=>socket.timeout(8000).emit('command',input,(err:Error|null,response:Reply<T>)=>{
  if(err) reject(new Error('Keine Bestätigung erhalten. Verbindung prüfen und erneut versuchen.'));
  else if(response.ok) resolve(response.data); else reject(new Error(response.error));
 }));
}
export async function request<T>(path:string,body?:unknown,method?:string):Promise<T> {
 const res=await fetch(`${API}${path}`,{method:method??(body?'POST':'GET'),credentials:'include',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const value=await res.json(); if(!res.ok) throw new Error(value.message??'Anfrage fehlgeschlagen.'); return value;
}
