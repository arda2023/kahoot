import { Body,Controller,Delete,Get,Param,Post,Put,Req } from '@nestjs/common';
import type { Request } from 'express';
import type { PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import { currentUser } from './auth';
import { pool,transaction } from './db';
import { ensure } from './game';
async function owner(c:PoolClient,id:string,user:string){ensure((await c.query('SELECT id FROM groups WHERE id=$1 AND owner_id=$2 FOR UPDATE',[id,user])).rowCount,'Nur der Gruppen-Eigentümer darf Mitglieder verwalten.');}
@Controller('groups')
export class GroupsController{
 @Get() async list(@Req() req:Request){const u=await currentUser(req);const {rows}=await pool.query('SELECT g.*,m.role FROM groups g JOIN memberships m ON m.group_id=g.id WHERE m.user_id=$1 ORDER BY g.name',[u.id]);return Promise.all(rows.map(async g=>({...g,members:(await pool.query('SELECT u.id,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.group_id=$1 ORDER BY u.email',[g.id])).rows})));}
 @Post() async create(@Req() req:Request,@Body() input:any){const u=await currentUser(req);ensure(typeof input.name==='string'&&input.name.trim()&&input.name.length<=80,'Gruppenname muss 1–80 Zeichen haben.');return transaction(async c=>{const id=randomUUID();await c.query('INSERT INTO groups(id,name,owner_id) VALUES($1,$2,$3)',[id,input.name.trim(),u.id]);await c.query("INSERT INTO memberships(group_id,user_id,role) VALUES($1,$2,'owner')",[id,u.id]);return {id};});}
 @Put(':id/members') async member(@Req() req:Request,@Param('id') id:string,@Body() input:any){const u=await currentUser(req);ensure(['editor','viewer'].includes(input.role)&&typeof input.email==='string','E-Mail und Rolle angeben.');return transaction(async c=>{await owner(c,id,u.id);const {rows}=await c.query('SELECT id FROM users WHERE email=$1',[input.email.trim().toLowerCase()]);ensure(rows[0],'Diese Person muss zuerst ein Konto anlegen.');ensure(rows[0].id!==u.id,'Eigentümerrolle kann nicht geändert werden.');await c.query('INSERT INTO memberships(group_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(group_id,user_id) DO UPDATE SET role=EXCLUDED.role',[id,rows[0].id,input.role]);return {ok:true};});}
 @Delete(':id/members/:user') async remove(@Req() req:Request,@Param('id') id:string,@Param('user') user:string){const u=await currentUser(req);return transaction(async c=>{await owner(c,id,u.id);ensure(user!==u.id,'Eigentümer kann nicht entfernt werden.');await c.query('DELETE FROM memberships WHERE group_id=$1 AND user_id=$2',[id,user]);return {ok:true};});}
}
