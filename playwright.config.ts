import { defineConfig } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
process.env.TMPDIR=resolve('.local/tmp'); mkdirSync(process.env.TMPDIR,{recursive:true});
process.env.PLAYWRIGHT_BROWSERS_PATH='0';
export default defineConfig({testDir:'tests/e2e',timeout:60000,workers:1,fullyParallel:false,use:{channel:'chromium',baseURL:'http://localhost:3200',trace:'retain-on-failure',screenshot:'only-on-failure'},reporter:[['list'],['html',{open:'never'}]],webServer:[
 {command:'PORT=3201 SEED_SECONDS=10 WEB_ORIGIN=http://localhost:3200 node apps/api/dist/main.js',url:'http://localhost:3201/health',reuseExistingServer:false,timeout:30000},
 {command:'NEXT_PUBLIC_API_URL=http://localhost:3201 npm run dev -w @quiz/web -- --port 3200',url:'http://localhost:3200',reuseExistingServer:false,timeout:60000}
]});
