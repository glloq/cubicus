import {grid} from './model.js';
export function overlayLayers(image,count){
 if(!Number.isInteger(count)||count<2||count>8)throw Error('Nombre de couches invalide');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const scale=Math.min(512/image.width,512/image.height);ctx.drawImage(image,(512-image.width*scale)/2,(512-image.height*scale)/2,image.width*scale,image.height*scale);
 const source=ctx.getImageData(0,0,512,512),cubes=grid(1,1,count);
 const layers=cubes.map(()=>ctx.createImageData(512,512));const random=new Uint32Array(512*512);for(let i=0;i<random.length;i+=16384)crypto.getRandomValues(random.subarray(i,Math.min(i+16384,random.length)));
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){const k=y*512+x,i=k*4;const out=layers[random[k]%count].data;out.set(source.data.subarray(i,i+4),i)}
 for(let i=0;i<count;i++){ctx.putImageData(layers[i],0,0);cubes[i].faces[4]=canvas.toDataURL('image/png');cubes[i].opacity=[0,0,0,0,1,0];cubes[i].alphaFaces=[false,false,false,false,true,false]}
 return cubes;
}
