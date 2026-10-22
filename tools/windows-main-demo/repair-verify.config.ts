import {defineConfig} from '../../e2e/node_modules/@playwright/test';
import base from '../../e2e/playwright.config';
import path from 'node:path';
export default defineConfig({...base,testDir:path.resolve(__dirname,'../../e2e/tests'),webServer:undefined,
 grep:/\b(E2E-T01 |E2E-T02 |E2E-T03 |CC-P11 |CC-P14 |CC-P15 |CC-P16 |CC-P17 )/,
 outputDir:'/workspace/repair-evidence/core-results',reporter:[['list'],['json',{outputFile:'/workspace/repair-evidence/core-results.json'}]],
 use:{...base.use,trace:'on',screenshot:'on'},projects:base.projects!.filter(p=>['chromium','firefox'].includes(p.name!))});
