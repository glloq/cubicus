import * as T from 'three';
/**
 * Bake a source image onto the visible cube surfaces at the current camera.
 * Each texel samples the source at its projected screen coordinate.
 * Authoring only; neither camera nor source image is serialized in a puzzle.
 */
export function bakeProjection(image,view,cubes,{resolution=256,preserve=false,ids=null,face=null,asLayer=false}={}){
 if(![128,256,512].includes(resolution))throw Error('Résolution invalide');
 const targets=cubes.filter(c=>!ids||ids.includes(c.id));
 if(!targets.length)throw Error('Sélection de projection vide');
 if(targets.length>64)throw Error('Projection limitée à 64 cubes');
 if(view.animating)throw Error('Attendre la fin de la rotation');
 const camera=view.camera;view.scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 const meshes=view.meshes.filter(m=>targets.some(c=>c.id===m.userData.id)),byId=new Map(meshes.map(m=>[m.userData.id,m]));
 const bounds=new T.Box2();const v=new T.Vector3();
 for(const m of meshes)for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
  v.set(x,y,z).applyMatrix4(m.matrixWorld).project(camera);
  if(!Number.isFinite(v.x)||!Number.isFinite(v.y)||v.z< -1||v.z>1)throw Error('Recentrer la caméra avant la projection');
  bounds.expandByPoint(new T.Vector2(v.x,v.y));
 }
 const size=bounds.getSize(new T.Vector2());if(size.x<.001||size.y<.001)throw Error('Projection vide');
 const source=document.createElement('canvas');source.width=source.height=1024;const sc=source.getContext('2d',{willReadFrequently:true});
 sc.fillStyle='#304050';sc.fillRect(0,0,1024,1024);
 // Fit in screen-space, including viewport aspect ratio.
 const aspect=(size.x/size.y)*(view.host.clientWidth/view.host.clientHeight);
 const ratio=image.width/image.height;const w=ratio>aspect?1024:1024*ratio/aspect,h=ratio>aspect?1024*aspect/ratio:1024;
 sc.drawImage(image,(1024-w)/2,(1024-h)/2,w,h);
 const pixels=sc.getImageData(0,0,1024,1024).data;
 const tile=document.createElement('canvas');tile.width=tile.height=resolution;const ctx=tile.getContext('2d');
 const result=structuredClone(cubes);let count=0;
 // Three.js BoxGeometry face ordering and UV orientation.
 const facePoint=(f,u,v)=>[[.5,v-.5,.5-u],[-.5,v-.5,u-.5],[u-.5,.5,.5-v],[u-.5,-.5,v-.5],[u-.5,v-.5,.5],[.5-u,v-.5,-.5]][f];
 const normals=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 const normal=new T.Vector3(),toCamera=new T.Vector3(),center=new T.Vector3();
 for(const c of result){const m=byId.get(c.id);if(!m)continue;
  for(let f=0;f<6;f++){
   if(face!==null&&face!==f)continue;
   if(preserve&&!asLayer&&c.faces[f])continue;
   if(asLayer&&(c.layers?.[f]?.length??0)>=16)continue;
   center.set(...facePoint(f,.5,.5)).applyMatrix4(m.matrixWorld);
   normal.set(...normals[f]).transformDirection(m.matrixWorld);
   if(camera.isOrthographicCamera)camera.getWorldDirection(toCamera).negate();else toCamera.copy(camera.position).sub(center).normalize();
   if(normal.dot(toCamera)<=.0001)continue;
   const out=ctx.createImageData(resolution,resolution);
   for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
    v.set(...facePoint(f,(x+.5)/resolution,1-(y+.5)/resolution)).applyMatrix4(m.matrixWorld).project(camera);
    const sx=Math.max(0,Math.min(1023,Math.floor((v.x-bounds.min.x)/size.x*1024))),sy=Math.max(0,Math.min(1023,Math.floor((bounds.max.y-v.y)/size.y*1024)));
    const i=(y*resolution+x)*4,j=(sy*1024+sx)*4;
    out.data[i]=pixels[j];out.data[i+1]=pixels[j+1];out.data[i+2]=pixels[j+2];out.data[i+3]=255;
   }
   ctx.putImageData(out,0,0);
   const projection = tile.toDataURL('image/png');
   if (asLayer) {
    c.layers ??= Array.from({length:6}, () => []);
    c.layers[f] ??= [];
    if (!c.layers[f].length && c.faces[f]) c.layers[f].push({name:'Fond',image:c.faces[f],visible:true,opacity:1});
    c.layers[f].push({name:'Projection',image:projection,visible:true,opacity:1});
   } else if (c.layers) c.layers[f]=[];
   c.faces[f] = projection;
   count++;
  }
 }
 return {cubes:result,count};
}
