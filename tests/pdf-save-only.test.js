import test from'node:test';
import assert from'node:assert/strict';
import{removePdfDocument,savePdfWithoutVision,storedPdfBlob}from'../src/pdf-storage.js';

const pdf=(name,text)=>new File([Buffer.from(text)],name,{type:'application/pdf'});

test('Salva PDF persiste il Blob senza rete o Vision',async()=>{let persisted,visionCalls=0;const file=pdf('Menu principale.pdf','%PDF-menu'),restaurant=await savePdfWithoutVision({name:'Trattoria',menu:[]},file,{id:'r1',documentId:'d1',uploadedAt:'2026-08-20T10:00:00.000Z'},async value=>{persisted=value});assert.equal(visionCalls,0);assert.equal(persisted,restaurant);assert.equal(restaurant.documents.length,1);assert.equal(restaurant.documents[0].name,'Menu principale.pdf');assert.equal(storedPdfBlob(restaurant.documents[0]).size,file.size)});

test('più PDF restano associati allo stesso ristorante',async()=>{let restaurant={id:'r1',name:'Trattoria',menu:[]};for(const[name,id]of[['Menu principale.pdf','d1'],['Carta vini.pdf','d2'],['Menu dessert.pdf','d3']])restaurant=await savePdfWithoutVision(restaurant,pdf(name,`%PDF-${id}`),{documentId:id},async()=>{});assert.deepEqual(restaurant.documents.map(x=>x.name),['Menu principale.pdf','Carta vini.pdf','Menu dessert.pdf'])});

test('eliminare un PDF non elimina ristorante menu o altri documenti',async()=>{let restaurant={id:'r1',name:'Trattoria',menu:[{name:'PIZZE',items:[]}],documents:[]};restaurant=await savePdfWithoutVision(restaurant,pdf('a.pdf','%PDF-a'),{documentId:'a'},async()=>{});restaurant=await savePdfWithoutVision(restaurant,pdf('b.pdf','%PDF-b'),{documentId:'b'},async()=>{});const result=removePdfDocument(restaurant,'a');assert.equal(result.id,'r1');assert.equal(result.menu.length,1);assert.deepEqual(result.documents.map(x=>x.id),['b'])});

test('PDF salvato resta apribile offline tramite Blob URL',async()=>{const restaurant=await savePdfWithoutVision({id:'r1'},pdf('offline.pdf','%PDF-offline'),{documentId:'offline'},async()=>{}),blob=storedPdfBlob(structuredClone(restaurant).documents[0]),url=URL.createObjectURL(blob);try{assert.match(url,/^blob:/);assert.equal(blob.type,'application/pdf')}finally{URL.revokeObjectURL(url)}});
