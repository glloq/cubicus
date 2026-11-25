// Test unit-cube envelopes along a quarter turn. Resting face contact is allowed.
export function hingeClear(members, hinge, axis, sign, occupied, moving) {
  if (occupied.size===moving.size) return true;
  const fixed='XYZ'.indexOf(axis);
  const u=(fixed+1)%3, v=(fixed+2)%3;
  const epsilon=1e-7;
  for(const cube of members){
    const du=cube.p[u]-hinge[u], dv=cube.p[v]-hinge[v];
    // Sample at most one eighth of a grid unit of travel between probes.
    const steps=Math.max(18,Math.ceil(Math.PI/2*Math.hypot(du,dv)*8));
    for(let i=1;i<steps;i++){
      const angle=sign*Math.PI*i/(2*steps);
      const c=Math.cos(angle),s=Math.sin(angle);
      const x=hinge[u]+c*du-s*dv;
      const y=hinge[v]+s*du+c*dv;
      const reach=.5+.5*(Math.abs(c)+Math.abs(s))-epsilon;
      for(let a=Math.ceil(x-reach);a<=Math.floor(x+reach);a++)for(let b=Math.ceil(y-reach);b<=Math.floor(y+reach);b++){
        const slot=[...cube.p];
        slot[u]=a;
        slot[v]=b;
        const hit=occupied.get(slot.join(','));
        if(!hit||moving.has(hit))continue;
        const dx=a-x,dy=b-y;
        if(Math.abs(c*dx+s*dy)<reach&&Math.abs(-s*dx+c*dy)<reach)return false;
      }
    }
  }
  return true;
}
