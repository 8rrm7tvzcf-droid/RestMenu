import test from'node:test';import assert from'node:assert/strict';import{analyzePage,applyCompleteness}from'../server/vision.js';

const transcription={columnCount:2,layoutAmbiguous:false,qualityWarning:null,notes:[],lines:[
 {id:'L1',text:'PIZZE',column:1,order:1,confidence:'high'},
 {id:'L2',text:'Margherita',column:1,order:2,confidence:'high'},
 {id:'L3',text:'Pomodoro e mozzarella',column:1,order:3,confidence:'high'},
 {id:'L4',text:'€ 7,00',column:1,order:4,confidence:'high'}
]};
const menu={restaurantName:null,qualityWarning:null,categories:[{name:'PIZZE',confidence:'high',sourceLineIds:['L1'],items:[{name:'Margherita',description:'Pomodoro e mozzarella',price:'7,00',currency:'EUR',confidence:{name:'high',description:'high',price:'high'},variants:[],formats:[],supplements:[],allergens:[],number:null,notes:[],sourceLineIds:['L2','L3','L4']}]}],unclassifiedText:[],warnings:[]};
const response=data=>({ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(data)}]}]})});

test('fase B riceve immagine originale e trascrizione della fase A',async()=>{const oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_API_KEY;const calls=[];process.env.OPENAI_API_KEY='test-only';globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);calls.push(body);return response(calls.length===1?transcription:structuredClone(menu))};try{await analyzePage('data:image/png;base64,AA==',1);assert.equal(calls.length,2);assert.equal(calls[0].text.format.name,'menu_visual_transcription');assert.equal(calls[1].text.format.name,'restaurant_menu_page');const second=calls[1].input.find(x=>x.role==='user').content;assert.ok(second.some(x=>x.type==='input_image'));assert.ok(second.some(x=>x.type==='input_text'&&x.text.includes('"L4"')))}finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey}});

test('righe omesse vengono recuperate e segnalate',()=>{const t={...transcription,lines:[...transcription.lines,{id:'L5',text:'Allergeni 1, 7',column:1,order:5,confidence:'high'},{id:'L6',text:'250 g',column:1,order:6,confidence:'high'}]};const result=applyCompleteness(t,structuredClone(menu));assert.ok(result.warnings.includes('Possibili elementi del menu non classificati'));assert.deepEqual(result.unclassifiedText.map(x=>x.text),['Allergeni 1, 7','250 g']);assert.equal(result.transcriptionLineCount,6);assert.equal(result.usedLineCount,4)});

test('copertura completa non genera warning',()=>{const result=applyCompleteness(transcription,structuredClone(menu));assert.ok(!result.warnings.includes('Possibili elementi del menu non classificati'));assert.equal(result.usedLineCount,4)});
