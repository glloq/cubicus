export const SYMBOLS=['cross','triangle','square','circle','diamond','arrow','star','rings'];
export function drawStamp(ctx,{symbol='cross',x=256,y=256,size=160,angle=0,color='#ffffff',width=8,fill=false}={}){
 if(!SYMBOLS.includes(symbol))return;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle*Math.PI/180);ctx.strokeStyle=ctx.fillStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';const r=size/2;
 const poly=pts=>{ctx.beginPath();pts.forEach(([a,b],i)=>i?ctx.lineTo(a*r,b*r):ctx.moveTo(a*r,b*r));ctx.closePath();fill?ctx.fill():ctx.stroke()};
 if(symbol==='circle'||symbol==='rings'){for(const k of symbol==='rings'?[1,.55]:[1]){ctx.beginPath();ctx.arc(0,0,r*k,0,Math.PI*2);fill&&symbol==='circle'?ctx.fill():ctx.stroke()}}
 else if(symbol==='cross'){ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(r,0);ctx.moveTo(0,-r);ctx.lineTo(0,r);ctx.stroke()}
 else if(symbol==='triangle')poly([[0,-1],[1,1],[-1,1]]);
 else if(symbol==='square')poly([[-1,-1],[1,-1],[1,1],[-1,1]]);
 else if(symbol==='diamond')poly([[0,-1],[1,0],[0,1],[-1,0]]);
 else if(symbol==='arrow')poly([[-1,-.3],[.2,-.3],[.2,-.75],[1,0],[.2,.75],[.2,.3],[-1,.3]]);
 else poly(Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,k=i%2?.42:1;return [Math.cos(a)*k,Math.sin(a)*k]}));
 ctx.restore();
}
