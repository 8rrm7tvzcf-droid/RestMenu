import http from'node:http';import{readFile}from'node:fs/promises';import{extname,join,resolve}from'node:path';

const PORT=process.env.PORT||5173,root=resolve('.'),limit=45*1024*1024;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};

async function loadLocalEnv(){try{const env=await readFile(resolve('.env'),'utf8');for(const line of env.split(/\r?\n/)){const m=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'')}}catch{}}
async function body(req){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>limit)throw Object.assign(new Error('Le immagini superano il limite di 45 MB.'),{status:413});chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString('utf8'))}

let envReady,visionPromise,vitePromise;
const vision=()=>visionPromise??=import('./vision.js');
const vite=()=>vitePromise??=import('vite').then(({createServer})=>createServer({server:{middlewareMode:true},appType:'spa'}));
async function api(req,res){try{await envReady;const data=await body(req);if(!Array.isArray(data.images)||!data.images.length||data.images.length>12)throw Object.assign(new Error('Invia da 1 a 12 immagini.'),{status:400});for(const x of data.images)if(typeof x.dataUrl!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(x.dataUrl))throw Object.assign(new Error('Formato immagine non valido.'),{status:400});const{analyzePage,mergePages}=await vision(),pages=[];for(let i=0;i<data.images.length;i++)pages.push(await analyzePage(data.images[i].dataUrl,i+1,{mode:process.env.VISION_SCAN_MODE||'high_accuracy'}));send(res,200,mergePages(pages))}catch(e){send(res,e.status||500,{error:e.message,code:e.code||'scan_failed',fallbackAvailable:true})}}

const server=http.createServer(async(req,res)=>{if(req.method==='POST'&&req.url==='/api/scan')return api(req,res);if(process.env.NODE_ENV!=='production'){const dev=await vite();return dev.middlewares(req,res)}try{const path=req.url==='/'?'index.html':req.url.split('?')[0].replace(/^\//,''),file=join(root,'dist',path);try{const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(data)}catch{const data=await readFile(join(root,'dist','index.html'));res.writeHead(200,{'Content-Type':'text/html'});res.end(data)}}catch{res.writeHead(500);res.end('Server error')}});

server.listen(PORT,'0.0.0.0',()=>console.log(`RestMenu server listening on port ${PORT}`));
envReady=loadLocalEnv();
