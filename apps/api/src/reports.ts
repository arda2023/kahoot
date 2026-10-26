import { Controller,Get,Param,Req,Res } from '@nestjs/common';
import type { Request,Response } from 'express';
import type { Report } from '@quiz/contracts';
import { rank } from '@quiz/game-engine';
import { transaction } from './db';
import { credentials,ensure,getRoom,identity } from './game';
export function csvCell(value:unknown){let text=String(value??'');if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return `"${text.replaceAll('"','""')}"`;}
export async function report(roomId:string,secret:string):Promise<Report>{
 const auth=credentials({roomId,token:secret});return transaction(async c=>{
  const room=await getRoom(c,auth.roomId);const who=await identity(c,room,auth.token);ensure(who.role==='host','Berichte sind nur für den Host verfügbar.');ensure(room.phase==='finished','Bericht ist erst nach Spielende verfügbar.');
  const {rows:players}=await c.query('SELECT p.id,p.name,COALESCE(SUM(a.points),0)::int score FROM players p LEFT JOIN answers a ON a.player_id=p.id WHERE p.room_id=$1 GROUP BY p.id',[room.id]);
  const {rows:answers}=await c.query('SELECT * FROM answers WHERE room_id=$1',[room.id]);
  return {title:room.quiz.title,players:rank(players),questions:room.quiz.questions.map((q,i)=>{const a=answers.filter(a=>a.question_index===i);return {text:q.text,correctAnswer:q.options[q.correctIndex],answered:a.length,correct:a.filter(a=>a.choice===q.correctIndex).length,distribution:q.options.map((_,n)=>a.filter(a=>a.choice===n).length)};}),rows:players.flatMap(p=>room.quiz.questions.map((q,i)=>{const a=answers.find(a=>a.player_id===p.id&&a.question_index===i);return {name:p.name,question:q.text,answer:a?q.options[a.choice]:'Keine Antwort',correct:!!a&&a.choice===q.correctIndex,points:a?.points??0};}))};
 });
}
@Controller('rooms')
export class ReportsController{
 @Get(':id/report') get(@Param('id') id:string,@Req() req:Request){return report(id,req.headers.authorization?.replace(/^Bearer /,'')??'');}
 @Get(':id/report.csv') async csv(@Param('id') id:string,@Req() req:Request,@Res() res:Response){const r=await report(id,req.headers.authorization?.replace(/^Bearer /,'')??'');const lines=[['Name','Frage','Antwort','Richtig','Punkte'],...r.rows.map(x=>[x.name,x.question,x.answer,x.correct?'Ja':'Nein',x.points])];res.setHeader('Content-Disposition','attachment; filename="quizbericht.csv"');res.type('text/csv').send('\uFEFF'+lines.map(line=>line.map(csvCell).join(';')).join('\r\n'));}
}
