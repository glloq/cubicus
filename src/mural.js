import {grid} from './model.js';
export function muralTiles(image,cols,rows){
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1||cols>8||rows>8)throw Error('Dimensions de fresque invalides');
 const full=document.createElement('canvas');full.width=cols*512;full.height=rows*512;const ctx=full.getContext('2d');ctx.fillStyle='#304050';ctx.fillRect(0,0,full.width,full.height);
 const scale=Math.min(full.width/image.width,full.height/image.height),w=image.width*scale,h=image.height*scale;ctx.drawImage(image,(full.width-w)/2,(full.height-h)/2,w,h);
 const cubes=grid(cols,rows,1),tile=document.createElement('canvas');tile.width=tile.height=512;const t=tile.getContext('2d');
 for(const c of cubes){t.clearRect(0,0,512,512);t.drawImage(full,c.p[0]*512,(rows-1-c.p[1])*512,512,512,0,0,512,512);c.faces[4]=tile.toDataURL('image/png')}
 return cubes;
}
