import test from'node:test';
import assert from'node:assert/strict';
import{mapResult,parseScanResponse}from'../src/vision.js';
import{createPdfDocument,storedPdfBlob}from'../src/pdf-storage.js';

const successfulPdfResponse={warnings:[],pdf:{filename:'menu.pdf',pageCount:1,mimeType:'application/pdf',size:8},categories:[{name:'PIZZE',confidence:'high',items:[{name:'Margherita',description:'Pomodoro e mozzarella',price:'8,00',confidence:{name:'high',description:'high',price:'high'}}]}],unclassifiedText:[]};

test('risposta PDF riuscita percorre parsing e normalizzazione fino ai dati Review',async()=>{const body=JSON.stringify(successfulPdfResponse),response=new Response(body,{status:200,headers:{'content-type':'application/json','content-length':String(Buffer.byteLength(body))}}),json=await parseScanResponse(response),result=mapResult(json),file=new File([Buffer.from('%PDF-1.7')],'menu.pdf',{type:'application/pdf'}),document=createPdfDocument(file,1,'pdf-1'),review={name:'Test',menu:result.categories,images:[],documents:[document]};assert.equal(result.categories[0].name,'PIZZE');assert.equal(result.categories[0].items[0].name,'Margherita');assert.equal(review.images.length,0);assert.equal(review.documents.length,1);assert.equal(storedPdfBlob(review.documents[0]).size,file.size);assert.doesNotThrow(()=>structuredClone(review))});

test('risposta vuota o troncata usa RESPONSE_TRUNCATED con messaggio comprensibile',async()=>{for(const body of['','{"categories":[]']){const response=new Response(body,{status:200,headers:{'content-type':'application/json'}});await assert.rejects(()=>parseScanResponse(response),error=>error.code==='RESPONSE_TRUNCATED'&&error.message==='Risposta incompleta dal server. Riprova la scansione.')}});

test('PDF originale sopravvive a structured clone ed è apribile tramite Blob URL',()=>{const file=new File([Buffer.from('%PDF-1.7')],'menu.pdf',{type:'application/pdf'}),saved=structuredClone(createPdfDocument(file,1,'pdf-1')),blob=storedPdfBlob(saved),url=URL.createObjectURL(blob);try{assert.ok(blob instanceof Blob);assert.equal(blob.type,'application/pdf');assert.match(url,/^blob:/)}finally{URL.revokeObjectURL(url)}});
