import test from'node:test';import assert from'node:assert/strict';import{mergePages}from'../server/vision.js';
const item=(name,description,price)=>({name,description,price,currency:'EUR',confidence:{name:'high',description:'high',price:'high'},variants:[],formats:[],supplements:[],allergens:[],number:null});
const page=(n,items)=>({page:n,restaurantName:null,categories:[{name:'PIZZE',confidence:'high',items}],unclassifiedText:[],warnings:[]});
test('menu multipagina preserva pagina e ordine',()=>{const r=mergePages([page(1,[item('A','x','7,00')]),page(2,[item('B','y','9,00')])]);assert.deepEqual(r.categories[0].items.map(x=>[x.name,x.page]),[['A',1],['B',2]])});
test('nomi simili non sono duplicati se descrizione o prezzo cambiano',()=>{const r=mergePages([page(1,[item('Margherita','pomodoro','7,00')]),page(2,[item('Margherita','pomodoro e basilico','8,00')])]);assert.equal(r.categories[0].items.length,2)});
test('duplicato richiede nome descrizione e prezzo compatibili',()=>{const a=item('Margherita','Pomodoro','€ 7,00'),b=item(' margherita ','pomodoro','7,00 EUR');const r=mergePages([page(1,[a]),page(2,[b])]);assert.equal(r.categories[0].items.length,1)});
test('testo non classificato non viene perso',()=>{const p=page(1,[]);p.unclassifiedText=[{text:'Coperto 2 euro',confidence:'medium'}];assert.equal(mergePages([p]).unclassifiedText[0].text,'Coperto 2 euro')});
