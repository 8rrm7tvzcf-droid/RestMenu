import{menuSchema,transcriptionSchema}from'./schema.js';

const fidelityRule=`Devi trascrivere e strutturare il contenuto visibile, non ricostruire il menu per intuizione. Se un'informazione non è chiaramente leggibile, non completarla. È preferibile restituire un valore incerto piuttosto che un valore plausibile ma inventato.`;

const transcriptionPrompt=`${fidelityRule}
FASE A — TRASCRIZIONE VISIVA FEDELE. Non interpretare ancora il contenuto come menu e non associare piatti, descrizioni o prezzi.
1. Identifica prima il layout e il numero di colonne. Se è ambiguo, imposta layoutAmbiguous=true.
2. Trascrivi TUTTE le righe visibili: titoli, testi secondari, note, allergeni, numerazioni, grammature, formati e prezzi. Non scartare righe a bassa confidenza.
3. Leggi una colonna alla volta, dall'alto verso il basso, poi da sinistra verso destra. Assegna column e order coerenti.
4. Assegna a ogni riga un id stabile e unico nel formato L1, L2, L3... Nessun id duplicato.
5. Conserva fedelmente punteggiatura, simboli, testo parziale e prezzi. Non correggere parole dubbie.
6. Se testo piccolo, sfocatura, taglio o contrasto impediscono una lettura fedele, valorizza qualityWarning suggerendo una foto più ravvicinata. Non indovinare.`;

const structurePrompt=`${fidelityRule}
FASE B — STRUTTURAZIONE VERIFICATA. Riceverai la fotografia originale e la trascrizione completa della Fase A.
Prima identifica nuovamente layout e colonne nell'immagine, poi lavora una colonna alla volta dall'alto verso il basso e da sinistra verso destra.
Per ogni campo usa sourceLineIds per indicare esattamente le righe della trascrizione utilizzate. Ogni riga letta ma non assegnabile deve finire in unclassifiedText: non scartare mai testo.
PREZZI — campo critico: associa un prezzo solo se immagine e trascrizione confermano stessa riga o stesso gruppo, stessa colonna, distanza visiva coerente e assenza di un altro piatto più vicino. Non inferire prezzi mancanti. Non trattare numeri di allergeni, numerazioni o grammature (es. 250 g) come prezzi. Più formati e prezzi devono restare distinti in formats o variants.
PIATTI E DESCRIZIONI: una riga corta in evidenza può essere un nome e una riga lunga immediatamente sotto può essere una descrizione, ma non unirle se la relazione non è visivamente chiara. In caso di dubbio usa confidence low oppure unclassifiedText. Non inventare ingredienti.
Mantieni confidence separata per categoria, nome, descrizione e prezzo. Se il layout è ambiguo aggiungi un warning esplicito.`;

function outputText(json){for(const item of json.output||[])if(item.type==='message')for(const content of item.content||[])if(content.type==='output_text')return content.text;throw new Error('La risposta AI non contiene dati strutturati.')}

async function callVision({imageUrl,prompt,schema,name,extraText}){
 const key=process.env.OPENAI_API_KEY;
 if(!key)throw Object.assign(new Error('OPENAI_API_KEY non configurata sul server.'),{status:503,code:'missing_key'});
 const content=[];
 if(extraText)content.push({type:'input_text',text:extraText});
 content.push({type:'input_image',image_url:imageUrl,detail:'high'});
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({
  model:process.env.OPENAI_MODEL||'gpt-5.6-terra',store:false,
  input:[{role:'developer',content:[{type:'input_text',text:prompt}]},{role:'user',content}],
  text:{format:{type:'json_schema',name,strict:true,schema}}
 })});
 const json=await response.json();
 if(!response.ok)throw Object.assign(new Error(json.error?.message||'Servizio AI non disponibile.'),{status:response.status,code:'openai_error'});
 return JSON.parse(outputText(json));
}

export function applyCompleteness(transcription,menu){
 const all=new Set(transcription.lines.map(line=>line.id));
 const used=new Set();
 for(const category of menu.categories){for(const id of category.sourceLineIds)used.add(id);for(const item of category.items)for(const id of item.sourceLineIds)used.add(id)}
 for(const row of menu.unclassifiedText)for(const id of row.sourceLineIds)used.add(id);
 const validUsed=[...used].filter(id=>all.has(id)).length,total=all.size,missing=[...all].filter(id=>!used.has(id));
 if(total>=4&&validUsed/total<.8&&!menu.warnings.includes('Possibili elementi del menu non classificati'))menu.warnings.push('Possibili elementi del menu non classificati');
 if(missing.length)menu.unclassifiedText.push(...transcription.lines.filter(line=>missing.includes(line.id)).map(line=>({text:line.text,confidence:line.confidence,sourceLineIds:[line.id]})));
 return{...menu,transcriptionLineCount:total,usedLineCount:validUsed};
}

export async function analyzePage(imageUrl,page){
 const transcription=await callVision({imageUrl,prompt:transcriptionPrompt,schema:transcriptionSchema,name:'menu_visual_transcription'});
 const menu=await callVision({imageUrl,prompt:structurePrompt,schema:menuSchema,name:'restaurant_menu_page',extraText:`Pagina ${page}. Trascrizione Fase A (fonte obbligatoria da verificare con l'immagine):\n${JSON.stringify(transcription)}`});
 if(transcription.layoutAmbiguous)menu.warnings.push('Layout o colonne ambigui');
 if(transcription.qualityWarning&&!menu.qualityWarning)menu.qualityWarning=transcription.qualityWarning;
 if(menu.qualityWarning)menu.warnings.push(menu.qualityWarning);
 return{page,transcription,...applyCompleteness(transcription,menu)};
}

const norm=s=>(s||'').toLowerCase().replace(/[^\p{L}\d]/gu,'');
const normPrice=s=>(s||'').replace(/[^\d]/g,'');
export function mergePages(pages){const categories=[],unclassifiedText=[],warnings=[];let restaurantName=null;for(const page of pages){restaurantName||=page.restaurantName;warnings.push(...page.warnings.map(text=>`Pagina ${page.page}: ${text}`));unclassifiedText.push(...page.unclassifiedText.map(x=>({...x,page:page.page})));for(const cat of page.categories){let dest=categories.find(x=>norm(x.name)===norm(cat.name));if(!dest){dest={...cat,items:[]};categories.push(dest)}for(const item of cat.items){const duplicate=dest.items.some(x=>norm(x.name)===norm(item.name)&&norm(x.description)===norm(item.description)&&normPrice(x.price)===normPrice(item.price));if(!duplicate)dest.items.push({...item,page:page.page})}}}return{restaurantName,categories,unclassifiedText,warnings,pages:pages.length}}
