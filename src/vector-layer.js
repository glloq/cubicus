const shapes=['rect','ellipse','triangle','line'];
const bound=(value,min,max,fallback)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;

export function normalizeVector(raw){
  if(!raw||!shapes.includes(raw.shape))return null;
  return {
    shape:raw.shape, x:bound(raw.x,0,512,128),y:bound(raw.y,0,512,128),
    width:bound(raw.width,1,512,256),height:bound(raw.height,1,512,256),
    stroke:bound(raw.stroke,1,64,5),color:/^#[0-9a-f]{6}$/i.test(raw.color)?raw.color:'#ffffff',
    fill:raw.fill===true
  };
}

export function drawVector(ctx,vector){
  const {shape,x,y,width:w,height:h,stroke,color,fill}=vector;
  ctx.strokeStyle=color;
  ctx.fillStyle=color;
  ctx.lineWidth=stroke;
  ctx.beginPath();
  if(shape==='rect')ctx.rect(x,y,w,h);
  if(shape==='ellipse')ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);
  if(shape==='triangle'){
    ctx.moveTo(x+w/2,y);
    ctx.lineTo(x+w,y+h);
    ctx.lineTo(x,y+h);
    ctx.closePath();
  }
  if(shape==='line'){ctx.moveTo(x,y);ctx.lineTo(x+w,y+h);}
  if(fill&&shape!=='line')ctx.fill();
  else ctx.stroke();
}

export function vectorImage(vector){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=512;
  drawVector(canvas.getContext('2d'),vector);
  return canvas.toDataURL('image/png');
}
