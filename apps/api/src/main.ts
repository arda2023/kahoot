import "reflect-metadata";
import {
  Controller,
  Get,
  Module,
  Catch,
  HttpException,
  ArgumentsHost,
  ExceptionFilter,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { connectRedis, health } from "./realtime";
import { initialize } from "./db";
import { GameGateway } from "./gateway";
import { GroupsController } from "./groups";
import { ReportsController } from "./reports";
import { AuthController } from "./auth";
import { ContentController, uploadDir } from "./content";
import { expireRooms } from "./game";
import { limit } from "./limits";
import cookieParser from "cookie-parser";
import express from "express";
@Catch()
class Errors implements ExceptionFilter {
  catch(e: any, host: ArgumentsHost) {
    const status = e instanceof HttpException ? e.getStatus() : 400;
    host
      .switchToHttp()
      .getResponse()
      .status(status)
      .json({
        message: e.code
          ? "Anfrage konnte nicht gespeichert werden."
          : (e.message ?? "Anfrage fehlgeschlagen."),
      });
  }
}
@Controller()
class HealthController {
  @Get("health") async health() {
    return health();
  }
}
@Module({
  controllers: [
    HealthController,
    AuthController,
    ContentController,
    ReportsController,
    GroupsController,
  ],
  providers: [GameGateway],
})
class AppModule {}
async function main() {
  await initialize();
  await expireRooms();
  await connectRedis();
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(async (req: any, res: any, next: any) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.path === "/health") return next();
    try {
      await limit(
        req.path.startsWith("/auth/") ? "auth-ip" : "http-ip",
        req.ip,
        req.path.startsWith("/auth/") ? 120 : 2000,
      );
      next();
    } catch (e) {
      res.status(429).json({ message: (e as Error).message });
    }
  });
  app.use("/media", (req: any, res: any, next: any) => {
    if (req.method === "GET" || req.method === "HEAD")
      return express.static(uploadDir, {
        dotfiles: "deny",
        fallthrough: false,
      })(req, res, next);
    next();
  });
  app.use((req: any, res: any, next: any) => {
    const allowed = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== allowed
    )
      return res.status(403).json({ message: "Unerlaubter Ursprung." });
    next();
  });
  app.useGlobalFilters(new Errors());
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3001), "127.0.0.1");
}
void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
