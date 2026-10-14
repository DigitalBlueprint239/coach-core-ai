import {defineConfig} from '../../e2e/node_modules/@playwright/test';
import base from '../../e2e/playwright.config';
import path from 'path';
const server=base.webServer;
if(!server||Array.isArray(server))throw new Error('Client tests require the single published emulator web server.');
export default defineConfig({...base,testDir:__dirname,testMatch:'*.spec.ts',outputDir:path.resolve(__dirname,'../../../coaching-browser-results'),
  reporter:[['list'],['json',{outputFile:path.resolve(__dirname,'../../../coaching-browser-results/results.json')}]],
  webServer:{...server,cwd:path.resolve(__dirname,'../../e2e')},
});
