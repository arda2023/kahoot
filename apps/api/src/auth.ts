import { randomBytes,scrypt as scryptCallback,timingSafeEqual,randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { Body,Controller,Get,Post,Req,Res,UnauthorizedException } from '@nestjs/common';
import type { Request,Response } from 'express';
import { pool } from './db';
import { ensure,hash,token } from './game';
const scrypt=promisify(scryptCallback);
export async function currentUser(req:Request) {
 const session=req.cookies?.session;
 if(typeof session!=='string') throw new UnauthorizedException('Bitte anmelden.');
 const {rows}=await pool.query('SELECT u.id,u.email FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[hash(session)]);
 if(!rows[0])throw new UnauthorizedException('Bitte erneut anmelden.');return rows[0] as {id:string;email:string};
}
function account(input:any){ensure(typeof input?.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)&&input.email.length<=254,'Gültige E-Mail-Adresse eingeben.');ensure(typeof input.password==='string'&&input.password.length>=10&&input.password.length<=128,'Passwort muss 10–128 Zeichen haben.');return {email:input.email.toLowerCase().trim(),password:input.password};}
async function session(res:Response,user:{id:string;email:string}){const secret=token();await pool.query("INSERT INTO user_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[hash(secret),user.id]);res.cookie('session',secret,{httpOnly:true,sameSite:'lax',secure:process.env.COOKIE_SECURE==='true',maxAge:7*86400000,path:'/'});return user;}
@Controller('auth')
export class AuthController {
 @Post('register') async register(@Body() input:any,@Res({passthrough:true}) res:Response){const a=account(input),salt=randomBytes(16).toString('hex');const digest=(await scrypt(a.password,salt,64)) as Buffer;
 const {rows}=await pool.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING RETURNING id,email',[randomUUID(),a.email,`${salt}:${digest.toString('hex')}`]);ensure(rows[0],'Registrierung nicht möglich. Adresse eventuell bereits vergeben.');return session(res,rows[0]);}
 @Post('login') async login(@Body() input:any,@Res({passthrough:true}) res:Response){const a=account(input);const {rows}=await pool.query('SELECT * FROM users WHERE email=$1',[a.email]);
 const [salt,stored]=(rows[0]?.password_hash??`${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');const digest=(await scrypt(a.password,salt,64)) as Buffer;
 if(!timingSafeEqual(digest,Buffer.from(stored,'hex'))||!rows[0])throw new UnauthorizedException('E-Mail oder Passwort stimmt nicht.');return session(res,{id:rows[0].id,email:rows[0].email});}
 @Get('me') me(@Req() req:Request){return currentUser(req);}
 @Post('logout') async logout(@Req() req:Request,@Res({passthrough:true}) res:Response){if(req.cookies?.session)await pool.query('DELETE FROM user_sessions WHERE token_hash=$1',[hash(req.cookies.session)]);res.clearCookie('session',{path:'/'});return {ok:true};}
}
