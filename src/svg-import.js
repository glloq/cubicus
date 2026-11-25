const namespace='http://www.w3.org/2000/svg';
const elements=new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','title','desc']);
const attributes=new Set([
  'viewBox','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','width','height','d','points','transform',
  'fill','fill-rule','fill-opacity','stroke','stroke-width','stroke-linecap','stroke-linejoin',
  'stroke-dasharray','stroke-opacity','opacity'
]);
const paint=/^(?:none|transparent|currentColor|#[\da-f]{3,8}|[a-z]+|rgba?\([\d.,% +\-]+\))$/i;

export async function svgBitmap(file) {
  if(file.size>1024*1024)throw Error('Image SVG limitée à 1 Mio.');
  const source=await file.text();
  if(/<!DOCTYPE|<!ENTITY/i.test(source))throw Error('Déclarations XML interdites dans un SVG.');
  const parsed=new DOMParser().parseFromString(source,'image/svg+xml');
  const root=parsed.documentElement;
  if(root.localName!=='svg'||root.namespaceURI!==namespace||parsed.querySelector('parsererror'))throw Error('SVG invalide.');
  const clean=document.implementation.createDocument(namespace,'svg');
  let count=0;
  function sanitize(node,parent,depth) {
    if(depth>24||++count>2048)throw Error('SVG trop complexe.');
    if(node.namespaceURI!==namespace||!elements.has(node.localName))return;
    const target=depth===0?clean.documentElement:clean.createElementNS(namespace,node.localName);
    for(const attr of node.attributes){
      if(attr.namespaceURI||!attributes.has(attr.name)||attr.value.length>65536)continue;
      if(['fill','stroke'].includes(attr.name)&&!paint.test(attr.value))continue;
      target.setAttribute(attr.name,attr.value);
    }
    if(depth)parent.append(target);
    for(const child of node.children)sanitize(child,target,depth+1);
  }
  sanitize(root,null,0);
  const viewBox=clean.documentElement.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number);
  const width=viewBox?.length===4?viewBox[2]:parseFloat(root.getAttribute('width'))||512;
  const height=viewBox?.length===4?viewBox[3]:parseFloat(root.getAttribute('height'))||512;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Dimensions SVG invalides.');
  if(!viewBox)clean.documentElement.setAttribute('viewBox','0 0 '+width+' '+height);
  const scale=512/Math.max(width,height);
  clean.documentElement.setAttribute('width',Math.max(1,Math.round(width*scale)));
  clean.documentElement.setAttribute('height',Math.max(1,Math.round(height*scale)));
  const xml=new XMLSerializer().serializeToString(clean);
  const url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml'}));
  try{
    const image=new Image();
    image.src=url;
    await image.decode();
    return await createImageBitmap(image);
  }finally{URL.revokeObjectURL(url);}
}
