import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
@Controller()
class HealthController { @Get('health') health() { return {ok:true}; } }
@Module({controllers:[HealthController]})
class AppModule {}
async function main() {
 const app = await NestFactory.create(AppModule);
 app.enableCors({origin:process.env.WEB_ORIGIN ?? 'http://localhost:3000',credentials:true});
 await app.listen(Number(process.env.PORT ?? 3001), '127.0.0.1');
}
void main();
