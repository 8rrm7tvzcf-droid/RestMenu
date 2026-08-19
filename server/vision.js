import sharp from 'sharp';
import {layoutSchema,blockSchema} from './schema.js';

export const MAX_BLOCKS=10;
const MODEL=()=>process.env.OPENAI_MODEL||'gpt-5.6-terra';
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const priceNorm=s=>norm(s).replace(/\beur\b/g,'').trim();
const confValue={low:0,medium:1,high:2};
const fidelity=`Devi trascrivere e strutturare il contenuto visibile, non ricostruire il menu per intuizione. Se un'informazione non è chiaramente leggibile, non completarla. È preferibile restituire un valore incerto piuttosto che un valore plausibile ma inventato.`;

function dataUrl(buffer){return `data:image/jpeg;base64,${buffer.toString('base64')}`}
function decodeDataUrl(value){const comma=value.indexOf(',');if(comma<0)throw Object.assign(new Error('Immagine non valida.'),{status:400});return Buffer.from(value.slice(comma+1),'base64')}
function outputText(json){if(typeof json.output_text==='string')return json.output_text;for(const out of json.output||[])for(const c of out.content||[])if(c.type==='output_text'&&c.text)return c.text;throw new Error('Risposta Vision priva di contenuto.')}
async function callVision({prompt,image,schema,name}){
  if(!process.env.OPENAI_API_KEY)throw Object.assign(new Error('OPENAI_API_KEY non configurata. Puoi continuare con l’inserimento manuale.'),{status:503,code:'missing_api_key'});
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL(),store:false,input:[{role:'developer',content:[{type:'input_text',text:fidelity}]},{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:image,detail:'high'}]}],text:{format:{type:'json_schema',name,schema,strict:true}}})});
  const json=await response.json();if(!response.ok)throw Object.assign(new Error(json.error?.message||'Errore durante la scansione Vision.'),{status:response.status,code:'openai_error'});
  try{return JSON.parse(outputText(json))}catch{throw new Error('La risposta Vision non è JSON valido.')}
}

export function computeCrop(region,width,height,retry=false){
  const box={x:region.x/1000*width,y:region.y/1000*height,width:region.width/1000*width,height:region.height/1000*height};
  const margin=Math.max(6,Math.round(Math.min(width,height)*(retry?.01:.025)));
  const left=Math.max(0,Math.floor(box.x-margin)),top=Math.max(0,Math.floor(box.y-margin));
  const right=Math.min(width,Math.ceil(box.x+box.width+margin)),bottom=Math.min(height,Math.ceil(box.y+box.height+margin));
  return{left,top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};
}
async function makeCrop(page,info,region,retry=false){
  const pixelBox=computeCrop(region,info.width,info.height,retry);let pipeline=sharp(page).extract(pixelBox);const target=retry?2400:region.smallText?1900:1500;
  if(pixelBox.width<target)pipeline=pipeline.resize({width:Math.min(2800,target),withoutEnlargement:false,kernel:'lanczos3'});
  const buffer=await pipeline.jpeg({quality:96,chromaSubsampling:'4:4:4'}).toBuffer();return{image:dataUrl(buffer),pixelBox};
}
function layoutPrompt(page){return `Pagina ${page}. Prima rileva soltanto il layout visivo. Individua colonne, sezioni, intestazioni, blocchi con piatti e prezzi e note a fondo pagina. Crea al massimo ${MAX_BLOCKS} regioni logiche significative: non dividere meccanicamente la pagina a metà. Ogni regione deve includere, quando possibile, nome piatto, descrizione e prezzo collegato, con un piccolo contesto circostante. Non tagliare righe o prezzi. Usa coordinate normalizzate 0-1000 relative all'immagine orientata. Assegna readingOrder dall'alto verso il basso e da sinistra verso destra, e columnIndex coerente. Marca smallText quando servirà ingrandire. Non trascrivere ancora il contenuto.`}
function blockPrompt(region,page,retry){return `Analizza esclusivamente questo crop della pagina ${page}, blocco ${region.blockId}, colonna ${region.columnIndex}, ordine ${region.readingOrder}, tipo ${region.kind}.${retry?' Questo è il secondo e ultimo tentativo con crop più stretto e risoluzione maggiore.':''}
Trascrivi prima ogni riga visibile in rawTextLines, nell'ordine, assegnando ID ${region.blockId}-L1, ${region.blockId}-L2, ecc. Poi struttura categoria, piatti, descrizioni, prezzi, varianti, formati, supplementi, allergeni e note. Collega ogni campo ai sourceLineIds usati. Ogni riga non assegnata deve finire in unclassifiedText: non scartare nulla.
Un prezzo può appartenere solo a un piatto nello stesso crop e con relazione visiva chiara; non importare associazioni da altri blocchi o colonne. Numerazioni, allergeni e grammature (es. 250 g) non sono prezzi. Non unire righe se non è chiaro. Non inventare ingredienti o prezzi. Se il testo è piccolo, sfocato o tagliato, usa qualityWarning e confidence low.`}

function allItems(block){return(block.categories||[]).flatMap(c=>c.items||[])}
function usedLineIds(block){const used=new Set();for(const c of block.categories||[]){for(const id of c.sourceLineIds||[])used.add(id);for(const item of c.items||[])for(const id of item.sourceLineIds||[])used.add(id)}for(const x of block.unclassifiedText||[])for(const id of x.sourceLineIds||[])used.add(id);return used}
function ensureCoverage(block){const used=usedLineIds(block),missing=(block.rawTextLines||[]).filter(x=>!used.has(x.id));if(missing.length){block.unclassifiedText.push(...missing.map(x=>({text:x.text,confidence:'low',sourceLineIds:[x.id]})));block.warnings.push('Righe visibili non assegnate recuperate come testo non classificato.')}return block}
export function shouldRetry(block){const items=allItems(block),raw=block.rawTextLines?.length||0,unc=block.unclassifiedText?.length||0;const critical=items.flatMap(x=>[x.confidence?.name,x.confidence?.price]).filter(Boolean);const low=critical.filter(x=>x==='low').length;return block.blockConfidence==='low'||Boolean(block.qualityWarning)||(critical.length>0&&low/critical.length>.25)||(raw>=4&&unc/raw>.3)||(raw>=5&&items.length===0)}
function scoreBlock(block){const items=allItems(block),critical=items.flatMap(x=>[x.confidence?.name,x.confidence?.price]).filter(Boolean);return confValue[block.blockConfidence] * 6+items.length*3+critical.reduce((n,x)=>n+confValue[x],0)-(block.unclassifiedText?.length||0)*1.5-(block.qualityWarning?4:0)}

function addCoherenceWarnings(page){const items=page.categories.flatMap(c=>c.items),without=items.filter(x=>!x.price).length;if(without)page.warnings.push(`${without} piatti senza prezzo: verificare nella revisione.`);if(page.categories.some(c=>!c.items.length))page.warnings.push('Sono presenti categorie vuote.');if(page.unclassifiedText.some(x=>/\b(?:€|eur)\b|\d+[,.]\d{2}\b/i.test(x.text)))page.warnings.push('Possibili prezzi senza piatto nel testo non classificato.');if(page.unclassifiedText.length)page.warnings.push('Possibili elementi del menu non classificati');return page}
export function reconstructPage(page,layout,blocks,debug){
  const result={page,restaurantName:null,categories:[],unclassifiedText:[],warnings:[]};
  for(const block of [...blocks].sort((a,b)=>a._block.readingOrder-b._block.readingOrder)){
    result.warnings.push(...(block.warnings||[]).map(x=>`${block._block.blockId}: ${x}`));if(block.qualityWarning)result.warnings.push(`${block._block.blockId}: ${block.qualityWarning}`);
    for(const source of block.categories||[]){let target=result.categories.find(c=>norm(c.name)===norm(source.name)&&c.confidence!=='low'&&source.confidence!=='low');if(!target){target={...source,items:[]};result.categories.push(target)}
      for(const item of source.items||[]){const duplicate=target.items.some(x=>norm(x.name)===norm(item.name)&&norm(x.description)===norm(item.description)&&priceNorm(x.price)===priceNorm(item.price));if(!duplicate)target.items.push({...item,page,blockId:block._block.blockId,columnIndex:block._block.columnIndex})}
    }
    result.unclassifiedText.push(...(block.unclassifiedText||[]).map(x=>({...x,page,blockId:block._block.blockId})));
  }
  if(layout.layoutAmbiguous)result.warnings.push('Layout ambiguo: verificare l’ordine e le associazioni.');if(layout.pageQuality!=='good')result.warnings.push(layout.pageQuality==='unreadable'?'Foto poco leggibile: scattare una nuova foto più ravvicinata.':'Qualità della pagina non ottimale: verificare i campi incerti.');
  if(debug)result.debug=debug;return addCoherenceWarnings(result);
}

export async function analyzePage(imageUrl,page,{mode=process.env.VISION_SCAN_MODE||'high_accuracy'}={}){
  const normalized=await sharp(decodeDataUrl(imageUrl)).rotate().jpeg({quality:96,chromaSubsampling:'4:4:4'}).toBuffer({resolveWithObject:true});const pageImage=dataUrl(normalized.data);
  const layout=await callVision({prompt:layoutPrompt(page),image:pageImage,schema:layoutSchema,name:'menu_layout'});const regions=[...(layout.regions||[])].sort((a,b)=>a.readingOrder-b.readingOrder).slice(0,MAX_BLOCKS),blocks=[],debugBlocks=[];
  for(const region of regions){const firstCrop=await makeCrop(normalized.data,normalized.info,region,false);let chosen=ensureCoverage(await callVision({prompt:blockPrompt(region,page,false),image:firstCrop.image,schema:blockSchema,name:'menu_block'})),retried=false,crop=firstCrop;
    if(mode==='high_accuracy'&&shouldRetry(chosen)){const secondCrop=await makeCrop(normalized.data,normalized.info,region,true);const second=ensureCoverage(await callVision({prompt:blockPrompt(region,page,true),image:secondCrop.image,schema:blockSchema,name:'menu_block_retry'}));retried=true;if(scoreBlock(second)>scoreBlock(chosen)){chosen=second;crop=secondCrop}}
    chosen._block={...region,pageNumber:page};blocks.push(chosen);if(process.env.NODE_ENV!=='production')debugBlocks.push({region,pixelBox:crop.pixelBox,crop:crop.image,confidence:chosen.blockConfidence,retried});
  }
  const debug=process.env.NODE_ENV==='production'?undefined:{page,pageImage,layout,blocks:debugBlocks};return reconstructPage(page,layout,blocks,debug);
}

export function mergePages(pages){const out={restaurantName:pages.find(x=>x.restaurantName)?.restaurantName||null,categories:[],unclassifiedText:[],warnings:[]};for(const page of pages){out.warnings.push(...(page.warnings||[]).map(x=>`Pagina ${page.page}: ${x}`));out.unclassifiedText.push(...(page.unclassifiedText||[]));for(const source of page.categories||[]){let target=out.categories.find(c=>norm(c.name)===norm(source.name)&&c.confidence!=='low'&&source.confidence!=='low');if(!target){target={...source,items:[]};out.categories.push(target)}for(const item of source.items||[]){const duplicate=target.items.some(x=>norm(x.name)===norm(item.name)&&norm(x.description)===norm(item.description)&&priceNorm(x.price)===priceNorm(item.price));if(!duplicate)target.items.push({...item,page:item.page||page.page})}}}
  if(process.env.NODE_ENV!=='production')out.debug=pages.map(x=>x.debug).filter(Boolean);return out}
