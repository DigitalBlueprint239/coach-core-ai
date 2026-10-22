const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'start.cjs'),'utf8');
const supplied={COACH_CORE_AI_ENABLED:'true',COACH_CORE_FILM_ENABLED:'true',OPENAI_API_KEY:'synthetic-not-a-key',GOOGLE_APPLICATION_CREDENTIALS:'synthetic-never-read.json',GCLOUD_PROJECT:'not-a-demo',FIRESTORE_EMULATOR_HOST:'nonlocal.invalid:8080',HTTP_PROXY:'http://proxy.invalid'};
const processStub={env:{...supplied},chdir(){}};
const result=vm.runInNewContext(source.slice(0,source.indexOf('function fail('))+';JSON.stringify(env)',{require,__dirname,process:processStub});const env=JSON.parse(result);
assert.equal(env.COACH_CORE_AI_ENABLED,'false');assert.equal(env.COACH_CORE_FILM_ENABLED,'false');assert.equal(env.COACH_CORE_OPENAI_API_KEY,'local-placeholder-not-a-key');assert.equal(env.GCLOUD_PROJECT,'demo-coach-core-e2e');assert.equal(env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');assert.equal(env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');assert.equal(env.FIREBASE_STORAGE_EMULATOR_HOST,'127.0.0.1:9199');assert.equal(env.CI,'true');
for(const key of ['OPENAI_API_KEY','GOOGLE_APPLICATION_CREDENTIALS','HTTP_PROXY'])assert.equal(env[key],undefined);
assert.deepEqual(processStub.env,supplied);console.log('PASS child environment guard: conflicting AI/Film/project/host/credential/proxy inputs cannot enable live services; parent environment unchanged.');
