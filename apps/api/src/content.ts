import { Body,Controller,Delete,Get,Post,Put,Param,Req,UseInterceptors,UploadedFile,ConflictException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import type { PoolClient } from 'pg';
import type { Quiz,Question } from '@quiz/contracts';
import { randomUUID } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { currentUser } from './auth';
import { pool,transaction } from './db';
import { createRoom,ensure } from './game';
export const uploadDir=resolve(__dirname,'../../..','uploads');
export function validateQuiz(input:any,publish=false):Quiz {
 ensure(input&&typeof input.title==='string'&&input.title.length<=120,'Titel darf höchstens 120 Zeichen haben.');
 ensure(Array.isArray(input.questions)&&input.questions.length<=50,'Höchstens 50 Fragen erlaubt.');
 if(publish)ensure(input.title.trim()&&input.questions.length>0,'Titel und mindestens eine Frage erforderlich.');
 const ids=new Set<string>();
 const questions=input.questions.map((q:any):Question=>{
  ensure(q&&typeof q.id==='string'&&q.id.length<=64&&!ids.has(q.id),'Fragen-ID ungültig.');ids.add(q.id);
  ensure(['single','boolean'].includes(q.type)&&typeof q.text==='string'&&q.text.length<=500,'Fragetyp oder Fragetext ungültig.');
  ensure(Array.isArray(q.options)&&q.options.length>=2&&q.options.length<=4&&q.options.every((x:any)=>typeof x==='string'&&x.length<=200),'Zwei bis vier Antworten erforderlich.');
  ensure(Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<q.options.length,'Richtige Antwort auswählen.');
  ensure(Number.isInteger(q.durationSeconds)&&q.durationSeconds>=5&&q.durationSeconds<=240,'Zeitlimit muss 5–240 Sekunden sein.');
  if(q.type==='boolean')ensure(q.options.length===2&&q.options[0]==='Wahr'&&q.options[1]==='Falsch','Wahr/Falsch benötigt genau diese Antwortoptionen.');
  if(publish)ensure(q.text.trim()&&q.options.every((x:string)=>x.trim()),'Frage und Antworten vollständig ausfüllen.');
  ensure(!q.image||typeof q.image==='string'&&/^\/media\/[0-9a-f-]{36}\.webp$/.test(q.image),'Ungültiges Bild.');
  return {id:q.id,type:q.type,text:q.text,options:q.options,correctIndex:q.correctIndex,durationSeconds:q.durationSeconds,...(q.image?{image:q.image}:{})};
 });return {title:input.title,questions};
}
export async function accessible(c:PoolClient,id:string,userId:string,write=false) {
 const {rows}=await c.query('SELECT * FROM quizzes WHERE id=$1 FOR UPDATE',[id]);const q=rows[0];ensure(q,'Quiz nicht gefunden.');
 if(q.owner_id===userId)return {...q,accessRole:'owner'};
 const roles=(await c.query('SELECT m.role FROM memberships m JOIN quiz_shares s ON s.group_id=m.group_id WHERE s.quiz_id=$1 AND m.user_id=$2',[id,userId])).rows;
 const role=roles.some(r=>r.role==='owner'||r.role==='editor')?'editor':roles.length?'viewer':null;
 ensure(role&&(!write||role==='editor'),write?'Keine Bearbeitungsberechtigung.':'Quiz nicht gefunden.');return {...q,accessRole:role};
}
async function checkImages(c:PoolClient,quiz:Quiz){for(const q of quiz.questions)if(q.image)ensure((await c.query('SELECT id FROM media WHERE id=$1',[q.image.slice(7)])).rowCount,'Bild nicht gefunden.');}
@Controller()
export class ContentController {
 @Get('quizzes') async list(@Req() req:Request){const u=await currentUser(req);return (await pool.query('SELECT q.*, CASE WHEN q.owner_id=$1 THEN \'owner\' WHEN EXISTS(SELECT 1 FROM quiz_shares qs JOIN memberships m ON m.group_id=qs.group_id WHERE qs.quiz_id=q.id AND m.user_id=$1 AND m.role IN (\'owner\',\'editor\')) THEN \'editor\' ELSE \'viewer\' END AS "accessRole", (SELECT id FROM quiz_versions WHERE quiz_id=q.id ORDER BY number DESC LIMIT 1) AS published_id FROM quizzes q WHERE owner_id=$1 OR EXISTS(SELECT 1 FROM quiz_shares s JOIN memberships m ON m.group_id=s.group_id WHERE s.quiz_id=q.id AND m.user_id=$1) ORDER BY created_at DESC',[u.id])).rows;}
 @Post('quizzes') async create(@Req() req:Request){const u=await currentUser(req);return (await pool.query('INSERT INTO quizzes(id,owner_id,draft) VALUES($1,$2,$3) RETURNING *',[randomUUID(),u.id,JSON.stringify({title:'Neues Quiz',questions:[]})])).rows[0];}
 @Get('quizzes/:id') async get(@Req() req:Request,@Param('id') id:string){const u=await currentUser(req);return transaction(c=>accessible(c,id,u.id));}
 @Put('quizzes/:id') async save(@Req() req:Request,@Param('id') id:string,@Body() input:any){const u=await currentUser(req);const draft=validateQuiz(input.draft);return transaction(async c=>{const q=await accessible(c,id,u.id,true);if(q.revision!==input.revision)throw new ConflictException('Konflikt: Eine andere Person hat gespeichert. Deine Änderungen bleiben hier; lade den aktuellen Stand bewusst neu.');ensure(!q.archived,'Archiviertes Quiz zuerst wiederherstellen.');await checkImages(c,draft);return {...(await c.query('UPDATE quizzes SET draft=$2,revision=revision+1 WHERE id=$1 RETURNING *',[id,JSON.stringify(draft)])).rows[0],accessRole:q.accessRole};});}
 @Post('quizzes/:id/publish') async publish(@Req() req:Request,@Param('id') id:string,@Body() input:any){const u=await currentUser(req);return transaction(async c=>{const q=await accessible(c,id,u.id,true);ensure(!q.archived,'Archiviertes Quiz kann nicht veröffentlicht werden.');if(q.revision!==input.revision)throw new ConflictException('Konflikt: Bitte aktuellen Stand laden.');const body=validateQuiz(q.draft,true);await checkImages(c,body);return (await c.query('INSERT INTO quiz_versions(id,quiz_id,number,body) SELECT $1,$2,COALESCE(MAX(number),0)+1,$3 FROM quiz_versions WHERE quiz_id=$2 RETURNING *',[randomUUID(),id,JSON.stringify(body)])).rows[0];});}
 @Post('quizzes/:id/duplicate') async duplicate(@Req() req:Request,@Param('id') id:string){const u=await currentUser(req);return transaction(async c=>{const q=await accessible(c,id,u.id);return (await c.query('INSERT INTO quizzes(id,owner_id,draft) VALUES($1,$2,$3) RETURNING *',[randomUUID(),u.id,JSON.stringify({...q.draft,title:`${q.draft.title.slice(0,110)} (Kopie)`})])).rows[0];});}
 @Post('quizzes/:id/archive') async archive(@Req() req:Request,@Param('id') id:string,@Body() input:any){const u=await currentUser(req);return transaction(async c=>{const q=await accessible(c,id,u.id,true);ensure(q.owner_id===u.id,'Nur der Quiz-Eigentümer darf archivieren.');ensure(typeof input.archived==='boolean','Archivstatus fehlt.');return (await c.query('UPDATE quizzes SET archived=$2,revision=revision+1 WHERE id=$1 RETURNING *',[id,input.archived])).rows[0];});}
 @Post('quizzes/:id/host') async host(@Req() req:Request,@Param('id') id:string){const u=await currentUser(req);const v=await transaction(async c=>{const q=await accessible(c,id,u.id);ensure(!q.archived,'Quiz ist archiviert.');const {rows}=await c.query('SELECT * FROM quiz_versions WHERE quiz_id=$1 ORDER BY number DESC LIMIT 1',[id]);ensure(rows[0],'Bitte zuerst veröffentlichen.');return rows[0];});const access=await createRoom(v.body);await pool.query('UPDATE rooms SET owner_id=$2,quiz_version_id=$3 WHERE id=$1',[access.roomId,u.id,v.id]);return access;}
 @Get('quizzes/:id/shares') async shares(@Req() req:Request,@Param('id') id:string){const u=await currentUser(req);return transaction(async c=>{const q=await accessible(c,id,u.id);ensure(q.owner_id===u.id,'Nur Eigentümer verwalten Freigaben.');return (await c.query('SELECT g.id,g.name FROM quiz_shares s JOIN groups g ON g.id=s.group_id WHERE s.quiz_id=$1',[id])).rows;});}
 @Post('quizzes/:id/shares') async share(@Req() req:Request,@Param('id') id:string,@Body() input:any){const u=await currentUser(req);return transaction(async c=>{const q=await accessible(c,id,u.id,true);ensure(q.owner_id===u.id,'Nur Eigentümer verwalten Freigaben.');ensure((await c.query('SELECT id FROM groups WHERE id=$1 AND owner_id=$2',[input.groupId,u.id])).rowCount,'Nur eigene Gruppen dürfen ausgewählt werden.');await c.query('INSERT INTO quiz_shares(quiz_id,group_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,input.groupId]);return {ok:true};});}
 @Delete('quizzes/:id/shares/:group') async unshare(@Req() req:Request,@Param('id') id:string,@Param('group') group:string){const u=await currentUser(req);return transaction(async c=>{const q=await accessible(c,id,u.id,true);ensure(q.owner_id===u.id,'Nur Eigentümer verwalten Freigaben.');await c.query('DELETE FROM quiz_shares WHERE quiz_id=$1 AND group_id=$2',[id,group]);return {ok:true};});}
 @Post('media') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024,files:1}}))
 async upload(@Req() req:Request,@UploadedFile() file:Express.Multer.File){const u=await currentUser(req);ensure(file&&['image/png','image/jpeg','image/webp'].includes(file.mimetype),'PNG, JPEG oder WebP hochladen (max. 5 MB).');const buffer=await sharp(file.buffer,{limitInputPixels:10000000}).resize({width:1600,height:1200,fit:'inside',withoutEnlargement:true}).webp().toBuffer();const id=`${randomUUID()}.webp`;await mkdir(uploadDir,{recursive:true});await writeFile(resolve(uploadDir,id),buffer,{flag:'wx'});await pool.query('INSERT INTO media(id,owner_id) VALUES($1,$2)',[id,u.id]);return {url:`/media/${id}`};}
}
