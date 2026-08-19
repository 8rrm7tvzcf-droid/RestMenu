import test from'node:test';
import assert from'node:assert/strict';
import{mapResult,parseScanResponse}from'../src/vision.js';

const successfulPdfResponse={warnings:[],pdfPagePreviews:['data:image/jpeg;base64,/9j/2Q=='],categories:[{name:'PIZZE',confidence:'high',items:[{name:'Margherita',description:'Pomodoro e mozzarella',price:'8,00',confidence:{name:'high',description:'high',price:'high'}}]}],unclassifiedText:[]};

test('risposta PDF riuscita percorre parsing e normalizzazione fino ai dati Review',async()=>{const body=JSON.stringify(successfulPdfResponse),response=new Response(body,{status:200,headers:{'content-type':'application/json'}}),json=await parseScanResponse(response),result=mapResult(json),review={name:'Test',menu:result.categories,images:result.pagePreviews,documents:[{kind:'menu-pdf',name:'menu.pdf',type:'application/pdf',dataUrl:'data:application/pdf;base64,JVBERi0='}]};assert.equal(result.categories[0].name,'PIZZE');assert.equal(result.categories[0].items[0].name,'Margherita');assert.equal(review.images.length,1);assert.equal(review.documents.length,1);assert.doesNotThrow(()=>structuredClone(review))});

test('risposta backend non JSON identifica il parsing senza DOMException generica',async()=>{const response=new Response('<html>errore proxy</html>',{status:502,headers:{'content-type':'text/html'}});await assert.rejects(()=>parseScanResponse(response),error=>error instanceof SyntaxError&&error.message!=='The string did not match the expected pattern')});
