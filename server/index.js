import http from'node:http';import{readFile}from'node:fs/promises';import{extname,join,resolve}from'node:path';

const PORT=process.env.PORT||5173,root=resolve('.'),limit=45*1024*1024;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};

async function loadLocalEnv(){try{const env=await readFile(resolve('.env'),'utf8');for(const line of env.split(/\r?\n/)){const m=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'')}}catch{}}
async function body(req){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>limit)throw Object.assign(new Error('Le immagini superano il limite di 45 MB.'),{status:413});chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString('utf8'))}

let envReady,visionPromise,pdfPromise,vitePromise;
const vision=()=>visionPromise??=import('./vision.js');
const pdfTools=()=>pdfPromise??=import('./pdf.js');
const vite=()=>vitePromise??=import('vite').then(({createServer})=>createServer({server:{middlewareMode:true},appType:'spa'}));
async function inspect(req,res){try{const data=await body(req),tools=await pdfTools();send(res,200,await tools.inspectPdf(data.pdf))}catch(e){send(res,e.status||500,{error:e.message,code:e.code||'pdf_inspect_failed'})}}
async function api(req,res){try{await envReady;const data=await body(req),hasImages=Array.isArray(data.images)&&data.images.length>0,hasPdf=Boolean(data.pdf);if(hasImages===hasPdf)throw Object.assign(new Error('Invia fotografie oppure un PDF, senza mischiarli.'),{status:400});const{analyzePage,mergePages}=await vision(),pages=[],warnings=[];let previews=[];
    if(hasImages){if(data.images.length>12)throw Object.assign(new Error('Invia da 1 a 12 immagini.'),{status:400});for(const x of data.images)if(typeof x.dataUrl!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(x.dataUrl))throw Object.assign(new Error('Formato immagine non valido.'),{status:400});for(let i=0;i<data.images.length;i++)pages.push(await analyzePage(data.images[i].dataUrl,i+1,{mode:process.env.VISION_SCAN_MODE||'high_accuracy'}))}
    else{const converted=await(await pdfTools()).convertPdf(data.pdf,{onPage:async page=>{try{pages.push(await analyzePage(page.dataUrl,page.pageNumber,{mode:process.env.VISION_SCAN_MODE||'high_accuracy'}))}catch{warnings.push(`Pagina ${page.pageNumber}: analisi Vision non riuscita.`)}}});previews=converted.pages.map(x=>x.preview);warnings.push(...converted.warnings)}
    if(!pages.length)throw Object.assign(new Error('Nessuna pagina può essere analizzata.'),{status:422,code:'scan_no_pages'});const result=mergePages(pages);result.warnings=[...warnings,...result.warnings];if(hasPdf)result.pdfPagePreviews=previews;send(res,200,result)}catch(e){send(res,e.status||500,{error:e.message,code:e.code||'scan_failed',fallbackAvailable:!e.code?.startsWith('pdf_')})}}

const server=http.createServer(async(req,res)=>{if(req.method==='POST'&&req.url==='/api/scan')return api(req,res);if(req.method==='POST'&&req.url==='/api/pdf/inspect')return inspect(req,res);if(process.env.NODE_ENV!=='production'){const dev=await vite();return dev.middlewares(req,res)}try{const path=req.url==='/'?'index.html':req.url.split('?')[0].replace(/^\//,''),file=join(root,'dist',path);try{const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(data)}catch{const data=await readFile(join(root,'dist','index.html'));res.writeHead(200,{'Content-Type':'text/html'});res.end(data)}}catch{res.writeHead(500);res.end('Server error')}});

server.listen(PORT,'0.0.0.0',()=>console.log(`RestMenu server listening on port ${PORT}`));
envReady=loadLocalEnv();
