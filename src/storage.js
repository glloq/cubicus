export function downloadFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function download(data, name) {
  downloadFile(new Blob([JSON.stringify(data)], {type:'application/json'}), name);
}
function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open('cubicus-playtest',1);r.onupgradeneeded=()=>r.result.createObjectStore('puzzles');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function putPuzzle(id,puzzle){const d=await db();try{await new Promise((res,rej)=>{const t=d.transaction('puzzles','readwrite');t.objectStore('puzzles').put(puzzle,id);t.oncomplete=res;t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})}finally{d.close()}}
export async function getPuzzle(id){const d=await db();try{return await new Promise((res,rej)=>{const r=d.transaction('puzzles').objectStore('puzzles').get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}finally{d.close()}}
