import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { attachRealtime,closeRedis,flushOutbox } from './realtime';
import { pool } from './db';
import { Server, Socket } from 'socket.io';
import { answer, advance, createRoom, expireRooms, joinRoom, snapshot } from './game';
@WebSocketGateway({cors:{origin:process.env.WEB_ORIGIN??'http://localhost:3000',credentials:true},maxHttpBufferSize:65536})
export class GameGateway implements OnGatewayInit {
 @WebSocketServer() server!:Server;
 private timer?:NodeJS.Timeout;
 private processing=false;
 async afterInit(server:Server) {
  await attachRealtime(server);
  server.on('connection',(socket:Socket)=>{
   socket.on('command', async (input:any,ack:(response:unknown)=>void)=>{
    if(typeof ack!=='function') return;
    try {
      let data:unknown;
      switch(input?.action) {
       case 'create': data=await createRoom(); break;
       case 'join': data=await joinRoom(input); break;
       case 'sync': data=await snapshot(input); await socket.join(input.roomId); break;
       case 'advance': data=await advance(input); break;
       case 'answer': data=await answer(input); break;
       default: throw new Error('Unbekannter Befehl.');
      }
      // Every handler returns only after its PostgreSQL transaction has committed.
      ack({ok:true,data});
      const roomId=(data as any)?.roomId??input.roomId;
      if(roomId&&input.action!=='sync') server.to(roomId).emit('changed');
    } catch(error) { ack({ok:false,error:error instanceof Error?error.message:'Anfrage fehlgeschlagen.'}); }
   });
  });
  this.timer=setInterval(()=>{if(this.processing)return;this.processing=true;void expireRooms().then(()=>flushOutbox()).catch(error=>console.error('Recovery:',error.message)).finally(()=>{this.processing=false;});},200);
 }
 async onModuleDestroy(){clearInterval(this.timer);await closeRedis();await pool.end();}
}
