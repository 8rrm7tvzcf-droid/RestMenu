import test from'node:test';
import assert from'node:assert/strict';
import{db}from'../src/db.js';
import{createPdfDocument,storedPdfBlob}from'../src/pdf-storage.js';

test('IndexedDB riceve il PDF originale come Blob e non come data URL',async()=>{const original=globalThis.indexedDB,file=new File([Buffer.from('%PDF-1.7 original')],'menu.pdf',{type:'application/pdf'}),restaurant={id:'r1',name:'Test',menu:[],documents:[createPdfDocument(file,1,'d1')]};let stored;globalThis.indexedDB={open:()=>{const request={};queueMicrotask(()=>{request.result={transaction:()=>{const transaction={objectStore:()=>({put:value=>{stored=value;return{result:value.id}}})};setTimeout(()=>transaction.oncomplete?.(),0);return transaction}};request.onsuccess?.()});return request}};try{await db.put(restaurant);assert.equal(stored.documents[0].dataUrl,undefined);assert.ok(stored.documents[0].blob instanceof Blob);assert.equal(storedPdfBlob(stored.documents[0]).size,file.size)}finally{if(original===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=original}});
