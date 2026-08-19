import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
test('fotocamera e galleria usano input separati',()=>{const inputs=[...source.matchAll(/<input type="file"[^>]+>/g)].map(x=>x[0]);const camera=inputs.find(x=>x.includes('capture="environment"')),gallery=inputs.find(x=>x.includes('multiple'));assert.ok(camera,'input fotocamera assente');assert.ok(gallery,'input galleria assente');assert.notEqual(camera,gallery);assert.ok(!camera.includes('multiple'));assert.ok(!gallery.includes('capture='))});
test('le azioni sono nominate chiaramente',()=>{assert.match(source,/>Scatta foto</);assert.match(source,/>Scegli dalla galleria</)});
test('la selezione viene accodata e la rimozione è singola',()=>{assert.match(source,/setFiles\(v=>\[\.\.\.v,\.\.\.unique\]\)/);assert.match(source,/filter\(\(_,j\)=>j!==i\)/)});
