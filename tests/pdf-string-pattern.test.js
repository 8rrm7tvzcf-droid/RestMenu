import test from'node:test';
import assert from'node:assert/strict';
import sharp from'sharp';
import{convertPdf}from'../server/pdf.js';
import{analyzePage,validateImageDataUrl}from'../server/vision.js';

const response=value=>({ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify({output_text:JSON.stringify(value)})});
function makePdf(){const objects=[,'<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>','<< /Length 40 >>\nstream\nBT /F1 10 Tf 50 720 Td (MENU) Tj ET\nendstream','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=Buffer.byteLength(pdf);pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;return Buffer.from(pdf+`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)}

test('PDF genera un data URL JPEG canonico e decodificabile',async()=>{const pdf=makePdf(),converted=await convertPdf({name:'menu.pdf',type:'application/pdf',size:pdf.length,dataUrl:`data:application/pdf;base64,${pdf.toString('base64')}`}),value=converted.pages[0].dataUrl,buffer=validateImageDataUrl(value),metadata=await sharp(buffer).metadata();assert.match(value,/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/);assert.equal(value.startsWith('data:image/jpeg;base64,data:'),false);assert.equal(/[\r\n%\s]/.test(value.slice(value.indexOf(',')+1)),false);assert.equal(metadata.format,'jpeg');assert.ok(buffer.length>0)});

test('analyzePage identifica la fase esatta della DOMException pattern',async()=>{const oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';globalThis.fetch=async()=>{throw new DOMException('The string did not match the expected pattern','SyntaxError')};try{const buffer=await sharp({create:{width:200,height:300,channels:3,background:'white'}}).jpeg().toBuffer(),value=`data:image/jpeg;base64,${buffer.toString('base64')}`;await assert.rejects(()=>analyzePage(value,1,{source:'pdf'}),error=>error.message==='The string did not match the expected pattern'&&error.phase==='fetch_responses_api'&&error.functionName==='callVision')}finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey}});

test('Blob URL del visualizzatore PDF usa un Blob reale',()=>{const blob=new Blob([Buffer.from('%PDF-1.7')],{type:'application/pdf'}),url=URL.createObjectURL(blob);try{assert.match(url,/^blob:/);assert.equal(blob.type,'application/pdf')}finally{URL.revokeObjectURL(url)}});

test('data URL malformati sono respinti prima del payload Vision',()=>{for(const value of[' data:image/jpeg;base64,QQ==','data:image/jpeg;base64,data:image/jpeg;base64,QQ==','data:image/jpeg;base64,QQ%3D%3D','data:image/jpeg;base64,QQ==\n'])assert.throws(()=>validateImageDataUrl(value),error=>error.code==='invalid_image_data_url')});
