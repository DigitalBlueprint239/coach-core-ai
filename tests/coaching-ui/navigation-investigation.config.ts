import {defineConfig} from '../../e2e/node_modules/@playwright/test';
import base from './playwright.config';
import path from 'path';
export default defineConfig({...base,testMatch:'navigation-investigation.spec.ts',
  outputDir:path.resolve(__dirname,'../../../firefox-investigation-results'),
  reporter:[['list'],['json',{outputFile:path.resolve(__dirname,'../../../firefox-investigation-results/results.json')}]],
  use:{...base.use,actionTimeout:10_000,navigationTimeout:10_000,trace:'on'},
});
