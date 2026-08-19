const DB_NAME='menova', STORE='restaurants';
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function tx(mode,fn){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,mode),s=t.objectStore(STORE);const r=fn(s);t.oncomplete=()=>resolve(r?.result);t.onerror=()=>reject(t.error)})}
export const db={all:()=>tx('readonly',s=>s.getAll()),get:id=>tx('readonly',s=>s.get(id)),put:v=>tx('readwrite',s=>s.put(v)),delete:id=>tx('readwrite',s=>s.delete(id))};
