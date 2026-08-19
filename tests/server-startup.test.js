import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
const source=await readFile(new URL('../server/index.js',import.meta.url),'utf8'),pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
test('start esegue il server corretto',()=>assert.equal(pkg.scripts.start,'node server/index.js'));
test('server usa PORT di Render e ascolta su tutte le interfacce',()=>{assert.match(source,/const PORT=process\.env\.PORT\|\|5173/);assert.match(source,/server\.listen\(PORT,'0\.0\.0\.0'/)});
test('Vision Sharp PDF e Vite vengono caricati solo on demand',()=>{const listen=source.indexOf('server.listen(');assert.ok(listen>=0);assert.equal(source.includes("from'./vision.js'"),false);assert.equal(source.includes("from'./pdf.js'"),false);assert.match(source,/pdfPromise\?\?=import\('\.\/pdf\.js'\)/);assert.ok(source.indexOf('envReady=loadLocalEnv()')>listen);assert.match(source,/vitePromise\?\?=import\('vite'\)/)});
