import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8'),vision=await readFile(new URL('../src/vision.js',import.meta.url),'utf8');
test('PDF usa un input dedicato e non multiplo',()=>{const input=main.match(/<input type="file" accept="application\/pdf"[^>]*>/)?.[0];assert.ok(input);assert.equal(input.includes('multiple'),false)});
test('foto e PDF non possono essere mischiati',()=>{assert.match(main,/disabled=\{Boolean\(pdf\)\}/);assert.match(main,/disabled=\{files\.length>0\|\|pdfBusy\}/)});
test('anteprima mostra nome pagine dimensione e miniatura',()=>{assert.match(main,/pdf\.thumbnail/);assert.match(main,/pdf\.pageCount/);assert.match(main,/pdf\.size\/1024\/1024/)});
test('PDF originale viene salvato nel ristorante',()=>{assert.match(main,/kind:'menu-pdf'/);assert.match(main,/dataUrl:pdf\.dataUrl/);assert.match(main,/documents:\[/)});
test('PDF originale può essere aperto',()=>{assert.match(main,/Apri PDF/);assert.match(main,/application\/pdf/);assert.match(main,/URL\.createObjectURL\(pdfBlob/)});
test('scansione PDF riusa endpoint e pipeline Vision',()=>{assert.match(vision,/scan\(\{pdf\},onStatus\)/);assert.match(vision,/fetch\('\/api\/scan'/)});
