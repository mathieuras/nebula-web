/* NEBULA off-thread ecosystem simulation. Rendering stays in main.js. */
let organisms=[];
self.onmessage=(event)=>{
  const m=event.data||{};
  if(m.type==='init'){
    organisms=(m.creatures||[]).map(c=>({...c}));
    return;
  }
  if(m.type==='speed'){
    organisms.forEach(o=>o.speed*=Number(m.factor)||1);
    return;
  }
  if(m.type==='perturb'){
    organisms.forEach(o=>{o.speed*=.55+Math.random()*1.25;o.phase+=(Math.random()*4-2);});
    return;
  }
  if(m.type==='tick'){
    const dt=Math.min(Number(m.dt)||0,.04),t=Number(m.elapsed)||0;
    const positions=new Float32Array(organisms.length*5);
    organisms.forEach((o,i)=>{
      o.angle+=dt*o.speed;
      const r=o.radius+Math.sin(t*.45+o.phase)*1.2,j=i*5;
      positions[j]=Math.cos(o.angle)*r;
      positions[j+1]=o.height+Math.sin(t*1.25+o.phase)*.8;
      positions[j+2]=Math.sin(o.angle)*r;
      positions[j+3]=-o.angle+Math.PI/2;
      positions[j+4]=Math.sin(t*1.7+o.phase)*.12;
    });
    self.postMessage({positions},[positions.buffer]);
  }
};
