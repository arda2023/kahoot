import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { answer, advance, createRoom, expireRooms, joinRoom, snapshot } from './game';
@WebSocketGateway({cors:{origin:process.env.WEB_ORIGIN??'http://localhost:3000',credentials:true},maxHttpBufferSize:65536})
export class GameGateway implements OnGatewayInit {
 @WebSocketServer() server!:Server;
 private timer?:NodeJS.Timeout;
 afterInit(server:Server) {
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
  this.timer=setInterval(()=>{void expireRooms().then(ids=>ids.forEach(id=>server.to(id).emit('changed'))).catch(error=>console.error('Timer recovery:',error.message));},200);
 }
 onModuleDestroy(){clearInterval(this.timer);}
}
