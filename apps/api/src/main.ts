import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { initialize, pool } from './db';
import { GameGateway } from './gateway';
@Controller()
class HealthController { @Get('health') async health() { await pool.query('SELECT 1'); return {ok:true}; } }
@Module({controllers:[HealthController],providers:[GameGateway]})
class AppModule {}
async function main() {
 await initialize();
 const app = await NestFactory.create(AppModule);
 app.enableCors({origin:process.env.WEB_ORIGIN ?? 'http://localhost:3000',credentials:true});
 app.enableShutdownHooks();
 await app.listen(Number(process.env.PORT ?? 3001), '127.0.0.1');
}
void main().catch(error=>{console.error(error);process.exit(1);});
