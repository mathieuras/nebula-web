(async()=>{
  const loading=document.getElementById('loading');
  const errorBox=document.getElementById('error');
  try {
    const THREE=await import('three');
    const [{EffectComposer},{RenderPass},{UnrealBloomPass},{OutputPass}]=await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/OutputPass.js')
    ]);

    const canvas=document.getElementById('scene');
    const isMobile=matchMedia('(max-width: 800px)').matches;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:!isMobile,alpha:false,powerPreference:'high-performance',depth:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, isMobile?1.25:1.7));
    renderer.setSize(innerWidth,innerHeight,false);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.08;
    renderer.shadowMap.enabled=!isMobile;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;

    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x050812);
    scene.fog=new THREE.FogExp2(0x070d1b,.0125);
    const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,900);
    const cameraStart=new THREE.Vector3(0,9.5,34);
    camera.position.copy(cameraStart);
    let yaw=0,pitch=-.17;
    const cameraHome={position:cameraStart.clone(),yaw:0,pitch:-.17};

    const composer=new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene,camera));
    const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.93,.72,.17);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    scene.add(new THREE.HemisphereLight(0x93dfff,0x111326,1.28));
    const keyLight=new THREE.DirectionalLight(0xa1f9ee,2.3); keyLight.position.set(-12,22,14); keyLight.castShadow=!isMobile;
    if(keyLight.castShadow){keyLight.shadow.mapSize.set(1024,1024);keyLight.shadow.camera.left=-26;keyLight.shadow.camera.right=26;keyLight.shadow.camera.top=26;keyLight.shadow.camera.bottom=-26;keyLight.shadow.bias=-.00018;}
    scene.add(keyLight);
    const fillLight=new THREE.PointLight(0x4d63ff,48,90,2); fillLight.position.set(10,8,-10);scene.add(fillLight);
    const underLight=new THREE.PointLight(0x1adbc8,28,52,2);underLight.position.set(-9,-4,2);scene.add(underLight);

    const rand=(a=1,b=0)=>Math.random()*(a-b)+b;
    const choose=a=>a[Math.floor(Math.random()*a.length)];
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const palette=[
      {name:'AURORA',a:0x7cffe8,b:0x9c8aff,light:0x76fff0,sky:0x050812},
      {name:'ABYSS',a:0x4fa7ff,b:0x50ffd0,light:0x4f94ff,sky:0x030713},
      {name:'VIOLET',a:0xc18bff,b:0xff82d7,light:0xd49bff,sky:0x0c0618},
      {name:'SOLARIS',a:0xffb879,b:0xff6d97,light:0xffbb70,sky:0x14080c}
    ];
    let paletteIndex=0;
    const resonantMaterials=[];
    const registerGlow=(mat)=>{resonantMaterials.push(mat);return mat;};
    function glowMaterial(color,intensity=1.8,roughness=.35){return registerGlow(new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness,metalness:.08}));}
    function applyPalette(index){
      paletteIndex=(index+palette.length)%palette.length;const p=palette[paletteIndex];
      for(let i=0;i<resonantMaterials.length;i++){
        const m=resonantMaterials[i];const useB=(i%5===0||i%7===0);const c=useB?p.b:p.a;m.color.setHex(c);m.emissive.setHex(c);
      }
      scene.background.setHex(p.sky);scene.fog.color.setHex(p.sky);fillLight.color.setHex(p.b);underLight.color.setHex(p.a);keyLight.color.setHex(p.light);
      setEvent(`Mutation chromatique : signature ${p.name} activée.`);
    }

    // Distant star field and atmospheric motes
    const starCount=isMobile?2300:4300;
    const starPos=new Float32Array(starCount*3),starSizes=new Float32Array(starCount);
    for(let i=0;i<starCount;i++){
      const r=rand(350,110),theta=rand(Math.PI*2),phi=Math.acos(rand(1,-1));
      starPos[i*3]=r*Math.sin(phi)*Math.cos(theta);starPos[i*3+1]=r*Math.cos(phi);starPos[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
      starSizes[i]=rand(.55,1.8);
    }
    const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));starGeo.setAttribute('size',new THREE.BufferAttribute(starSizes,1));
    const starMat=new THREE.PointsMaterial({color:0x9bc9e8,size:.105,sizeAttenuation:true,transparent:true,opacity:.7,depthWrite:false});
    const stars=new THREE.Points(starGeo,starMat);scene.add(stars);

    // Geometric haze around the living island
    const hazeMat=new THREE.MeshBasicMaterial({color:0x17495c,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false});
    const haze=new THREE.Mesh(new THREE.SphereGeometry(28,48,24),hazeMat);haze.scale.set(1,.44,1);haze.position.y=3.5;scene.add(haze);

    const WORLD_R=17.4;
    function terrainHeight(x,z){
      const r=Math.sqrt(x*x+z*z),t=clamp(r/WORLD_R,0,1);
      return .52 + .2*Math.sin(x*.48+Math.sin(z*.28))*Math.cos(z*.41) + .1*Math.sin((x+z)*.9) + .09*Math.cos(z*1.05-x*.22) - 1.28*Math.pow(t,4);
    }
    // Floating basalt body
    const rockGeo=new THREE.SphereGeometry(1,100,56);
    const pos=rockGeo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
      const n=1+.025*Math.sin(x*19+z*5)*Math.cos(y*13-z*6)+.018*Math.sin(z*23+y*8);
      pos.setXYZ(i,x*n,y*n,z*n);
    }
    rockGeo.computeVertexNormals();
    const rockMat=new THREE.MeshStandardMaterial({color:0x111b2a,roughness:.91,metalness:.12});
    const rock=new THREE.Mesh(rockGeo,rockMat);rock.scale.set(18.5,3.2,18.2);rock.position.y=-3.05;rock.castShadow=true;rock.receiveShadow=true;scene.add(rock);

    // Radial terrain mesh, generated from a deterministic height function
    const rings=84,segments=224,vertices=[],indices=[];
    vertices.push(0,terrainHeight(0,0),0);
    for(let ri=1;ri<=rings;ri++){
      const r=WORLD_R*ri/rings;
      for(let si=0;si<segments;si++){
        const a=si/segments*Math.PI*2,x=Math.cos(a)*r,z=Math.sin(a)*r;
        vertices.push(x,terrainHeight(x,z),z);
      }
    }
    for(let s=0;s<segments;s++){const n=(s+1)%segments;indices.push(0,1+n,1+s);}
    for(let ri=0;ri<rings-1;ri++){
      const base=1+ri*segments,next=base+segments;
      for(let s=0;s<segments;s++){const sn=(s+1)%segments;indices.push(base+s,next+sn,next+s,base+s,base+sn,next+sn);}
    }
    const terrainGeo=new THREE.BufferGeometry();terrainGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));terrainGeo.setIndex(indices);terrainGeo.computeVertexNormals();
    const terrainMat=new THREE.MeshStandardMaterial({color:0x182b32,roughness:.88,metalness:.16,emissive:0x061e25,emissiveIntensity:.45,side:THREE.DoubleSide});
    const terrain=new THREE.Mesh(terrainGeo,terrainMat);terrain.receiveShadow=true;terrain.castShadow=true;scene.add(terrain);

    // Glowing mineral seams around the underside
    const seamMat=new THREE.MeshStandardMaterial({color:0x3fffea,emissive:0x16e6db,emissiveIntensity:2.1,roughness:.27,metalness:.25});
    const seamMat2=new THREE.MeshStandardMaterial({color:0x8a70ff,emissive:0x7759ff,emissiveIntensity:1.65,roughness:.3});
    for(let i=0;i<42;i++){
      const a=i/42*Math.PI*2+rand(-.05,.05),r=rand(15.3,17.6),x=Math.cos(a)*r,z=Math.sin(a)*r;
      const curve=new THREE.CatmullRomCurve3([
        new THREE.Vector3(x,-.65,z),new THREE.Vector3(x*.99,-1.7,z*.99),new THREE.Vector3(x*.84,-3.2,z*.84),new THREE.Vector3(x*.76,-4.3,z*.76)
      ]);
      const seam=new THREE.Mesh(new THREE.TubeGeometry(curve,14,rand(.018,.052),5,false),Math.random()>.26?seamMat:seamMat2);scene.add(seam);
    }

    // Floating rings around the biome
    const ringMat=new THREE.MeshStandardMaterial({color:0x4de9d8,emissive:0x22a99f,emissiveIntensity:1.2,roughness:.32,metalness:.55,transparent:true,opacity:.66});
    const rings3d=[];
    [[20.1,.22,20.1,0x5af8e4],[23.7,.12,23.7,0x7967ff],[27.8,.08,27.8,0x235d74]].forEach((cfg,i)=>{
      const m=new THREE.Mesh(new THREE.TorusGeometry(cfg[0],cfg[1],8,256),new THREE.MeshStandardMaterial({color:cfg[3],emissive:cfg[3],emissiveIntensity:i===0?1.3:.65,metalness:.6,roughness:.32,transparent:true,opacity:i===2?.23:.53}));
      m.rotation.x=Math.PI/2+(i-1)*.11;m.rotation.z=i*.22;m.position.y=-.2+i*.4;scene.add(m);rings3d.push(m);
    });

    // Central life tree: curved trunk, branching veins and crystalline canopy
    const trunkMat=new THREE.MeshStandardMaterial({color:0x172b39,roughness:.46,metalness:.18,emissive:0x102d3c,emissiveIntensity:.55});
    const trunkPath=new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,terrainHeight(0,0)-.05,0),new THREE.Vector3(.18,1.8,0),new THREE.Vector3(-.25,3.4,.13),new THREE.Vector3(.22,5.1,.05),new THREE.Vector3(-.5,6.5,0),new THREE.Vector3(-.22,8.0,-.15),new THREE.Vector3(.28,9.2,-.1)
    ]);
    const trunk=new THREE.Mesh(new THREE.TubeGeometry(trunkPath,72,.43,12,false),trunkMat);trunk.castShadow=true;scene.add(trunk);
    const rootMat=trunkMat;
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2+rand(-.12,.12),len=rand(2.3,4.2);
      const c=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.55,0),new THREE.Vector3(Math.cos(a)*.65,.5,Math.sin(a)*.65),new THREE.Vector3(Math.cos(a)*len,.18,Math.sin(a)*len)]);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(c,24,.11,7,false),rootMat));
    }
    const branchNodes=[];
    for(let i=0;i<9;i++){
      const a=i/9*Math.PI*2+rand(-.16,.16),h=rand(4.6,7.4),rad=rand(2.8,5.3),x=Math.cos(a)*rad,z=Math.sin(a)*rad;
      const start=new THREE.Vector3(rand(.65,-.65),rand(5.8,3.5),rand(.5,-.5));
      const mid=new THREE.Vector3(x*.58,h*.91,z*.58),end=new THREE.Vector3(x,h,z);
      const branchCurve=new THREE.CatmullRomCurve3([start,mid,end]);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(branchCurve,30,rand(.10,.18),8,false),trunkMat));
      const glow=glowMaterial(palette[0].a,1.65,.31);
      const veinCurve=new THREE.CatmullRomCurve3([start.clone().add(new THREE.Vector3(.08,.04,0)),mid.clone().add(new THREE.Vector3(.08,.05,0)),end.clone()]);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(veinCurve,28,.025,5,false),glow));
      branchNodes.push(end);
    }
    const canopyMat=glowMaterial(palette[0].a,1.05,.48);
    const canopyMat2=glowMaterial(palette[0].b,1.6,.33);
    const canopyGroup=new THREE.Group();scene.add(canopyGroup);
    const leafGeo=new THREE.IcosahedronGeometry(1,2);
    for(let i=0;i<30;i++){
      const a=rand(Math.PI*2),h=rand(5.6,10.8),radius=rand(.7,3.8);
      const p=new THREE.Vector3(Math.cos(a)*radius,h,Math.sin(a)*radius);
      const leaf=new THREE.Mesh(leafGeo,Math.random()>.3?canopyMat:canopyMat2);
      leaf.position.copy(p);leaf.scale.set(rand(1.7,3.5),rand(.8,2.1),rand(1.3,2.8));leaf.rotation.set(rand(1),rand(6.2),rand(1));leaf.castShadow=true;canopyGroup.add(leaf);
    }
    const heartMat=glowMaterial(0xaffff3,3.4,.2);
    const heart=new THREE.Mesh(new THREE.IcosahedronGeometry(.82,2),heartMat);heart.position.set(0,8.45,0);heart.scale.set(.82,1.18,.82);scene.add(heart);
    const heartHalo=new THREE.Mesh(new THREE.TorusGeometry(1.18,.024,8,100),new THREE.MeshBasicMaterial({color:0x8dfff3,transparent:true,opacity:.78}));heartHalo.position.copy(heart.position);heartHalo.rotation.x=Math.PI/2.5;scene.add(heartHalo);

    // Crystal grove instanced for performance
    const crystalGeo=new THREE.ConeGeometry(.16,1,5,1);
    const crystalMat=new THREE.MeshStandardMaterial({color:0x234e5c,metalness:.55,roughness:.29,emissive:0x0b343e,emissiveIntensity:.65});
    const crystals=new THREE.InstancedMesh(crystalGeo,crystalMat,isMobile?180:330);crystals.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const dummy=new THREE.Object3D();
    for(let i=0;i<crystals.count;i++){
      const a=rand(Math.PI*2),r=Math.sqrt(Math.random())*15.6,x=Math.cos(a)*r,z=Math.sin(a)*r;
      const h=rand(1.5,.24);dummy.position.set(x,terrainHeight(x,z)+h*.5,z);dummy.scale.set(rand(.75,.22),h,rand(.75,.22));dummy.rotation.set(rand(-.2,.2),rand(Math.PI*2),rand(-.2,.2));dummy.updateMatrix();crystals.setMatrixAt(i,dummy.matrix);
    }
    crystals.castShadow=true;crystals.receiveShadow=true;scene.add(crystals);

    // Living flowers are actual objects so the user can plant more
    const flowers=[];
    const flowerPalette=[0x62fce9,0x9e83ff,0xff93d8,0xa5ff9b,0x64bfff];
    const flowerMaterialCache=new Map();
    function petalMaterial(color){if(!flowerMaterialCache.has(color))flowerMaterialCache.set(color,glowMaterial(color,1.85,.28));return flowerMaterialCache.get(color);}
    function buildFlower(x,z,scale=1,color=choose(flowerPalette),growIn=true){
      const g=new THREE.Group();g.position.set(x,terrainHeight(x,z)-.02,z);g.scale.setScalar(growIn?.01:scale);scene.add(g);
      const stemH=rand(1.5,.72)*scale;
      const stemMat=new THREE.MeshStandardMaterial({color:0x254f54,roughness:.65,emissive:0x092c2a,emissiveIntensity:.5});
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.035*scale,.09*scale,stemH,7),stemMat);stem.position.y=stemH/2;g.add(stem);
      const core=new THREE.Mesh(new THREE.SphereGeometry(.15*scale,12,10),petalMaterial(color));core.position.y=stemH+.02*scale;g.add(core);
      const petalGeo=new THREE.SphereGeometry(1,12,9);
      const petalMat=petalMaterial(color);
      const count=Math.floor(rand(7,5));
      for(let j=0;j<count;j++){
        const a=j/count*Math.PI*2;
        const p=new THREE.Mesh(petalGeo,petalMat);p.scale.set(.13*scale,.34*scale,.105*scale);p.position.set(Math.cos(a)*.23*scale,stemH,Math.sin(a)*.23*scale);p.rotation.z=-Math.cos(a)*.55;p.rotation.x=Math.sin(a)*.5;g.add(p);
      }
      const leafGeo2=new THREE.SphereGeometry(1,10,7);
      for(let j=0;j<2;j++){const leaf=new THREE.Mesh(leafGeo2,stemMat);leaf.scale.set(.09*scale,.27*scale,.055*scale);leaf.position.set((j?1:-1)*.16*scale,stemH*.45,0);leaf.rotation.z=(j?-.8:.8);g.add(leaf);}
      flowers.push({group:g,targetScale:scale,age:rand(10,0),seeded:growIn});
      return g;
    }
    for(let i=0;i<(isMobile?26:44);i++){
      const a=rand(Math.PI*2),r=rand(13.5,3.8),x=Math.cos(a)*r,z=Math.sin(a)*r;
      if(Math.hypot(x,z)<3.5)continue;
      buildFlower(x,z,rand(.9,.45),choose(flowerPalette),false);
    }

    // Luminous wandering creatures, each with a body and orbiting halo
    const creatures=[];
    const creatureColors=[0x64ffdf,0x9a85ff,0xff8bdb,0x80bfff,0xc1ffa0];
    function createCreature(index){
      const color=choose(creatureColors),mat=glowMaterial(color,2.15,.24);
      const group=new THREE.Group();scene.add(group);
      const body=new THREE.Mesh(new THREE.IcosahedronGeometry(rand(.3,.2),2),mat);body.scale.set(1.25,.78,1);group.add(body);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.018,6,36),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.77}));ring.rotation.x=Math.PI/2.7;group.add(ring);
      const glow=new THREE.Mesh(new THREE.SphereGeometry(.16,12,10),new THREE.MeshBasicMaterial({color:0xffffff}));glow.position.set(0,.02,.23);group.add(glow);
      const fins=[];
      for(let k=-1;k<=1;k+=2){const fin=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),mat);fin.scale.set(2.1,.16,.48);fin.position.set(k*.3,0,-.06);fin.rotation.z=k*.24;group.add(fin);fins.push(fin);}
      const data={group,ring,fins,angle:rand(Math.PI*2),radius:rand(12,5.5),speed:rand(.2,.08)*(Math.random()>.5?1:-1),height:rand(9,3),phase:rand(Math.PI*2),color};creatures.push(data);return data;
    }
    for(let i=0;i<(isMobile?6:9);i++)createCreature(i);

    // Simulation runs off the render thread. Rendering remains on the main thread.
    let simWorker=null, simPending=false, simLatest=null;
    try {
      simWorker=new Worker('./simulation-worker.js');
      simWorker.onmessage=(event)=>{simLatest=event.data.positions;simPending=false;};
      simWorker.postMessage({type:'init',creatures:creatures.map(c=>({angle:c.angle,radius:c.radius,speed:c.speed,height:c.height,phase:c.phase}))});
    } catch(workerError) { console.warn('Simulation worker unavailable; using local simulation.',workerError); }

    // Small floating ruins and vertical spires on the outskirts
    const spireMat=new THREE.MeshStandardMaterial({color:0x233348,roughness:.36,metalness:.58,emissive:0x0a2737,emissiveIntensity:.45});
    const spireGlow=glowMaterial(0x49dcd9,1.15,.26);
    for(let i=0;i<18;i++){
      const a=i/18*Math.PI*2+rand(-.1,.1),r=rand(16,13),x=Math.cos(a)*r,z=Math.sin(a)*r,h=rand(4.2,1.3);
      const s=new THREE.Mesh(new THREE.OctahedronGeometry(rand(.5,.24),0),spireMat);s.position.set(x,terrainHeight(x,z)+h*.42,z);s.scale.set(.8,h, .8);s.rotation.y=rand(6.2);s.rotation.z=rand(.28,-.28);s.castShadow=true;scene.add(s);
      if(i%2===0){const line=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,h*.8,6),spireGlow);line.position.set(x,terrainHeight(x,z)+h*.45,z);scene.add(line);}
    }

    // Suspended luminous particles around the canopy and the island
    const moteCount=isMobile?480:950;
    const motePositions=new Float32Array(moteCount*3),moteData=[];
    for(let i=0;i<moteCount;i++){
      const a=rand(Math.PI*2),r=rand(24,2),y=rand(14,-2);
      motePositions[i*3]=Math.cos(a)*r;motePositions[i*3+1]=y;motePositions[i*3+2]=Math.sin(a)*r;
      moteData.push({angle:a,radius:r,y,phase:rand(Math.PI*2),speed:rand(.22,.025),bob:rand(.8,.12)});
    }
    const moteGeo=new THREE.BufferGeometry();moteGeo.setAttribute('position',new THREE.BufferAttribute(motePositions,3));
    const moteMat=new THREE.PointsMaterial({color:0x71f8e4,size:.105,transparent:true,opacity:.77,depthWrite:false,sizeAttenuation:true,blending:THREE.AdditiveBlending});
    const motes=new THREE.Points(moteGeo,moteMat);scene.add(motes);

    // Click and intervention pulse rings
    const pulses=[];
    function createPulse(x=0,z=0,color=0x75fff0){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.045,8,96),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));
      ring.rotation.x=Math.PI/2;ring.position.set(x,terrainHeight(x,z)+.22,z);ring.scale.setScalar(.1);scene.add(ring);
      pulses.push({mesh:ring,age:0,duration:2.1});
    }

    // Event simulation: organisms drift, biome values naturally breathe
    let biomass=68,energy=74,anomalies=2,elapsed=0,simCycle=0;
    const startTime=performance.now();
    let dragging=false,dragMoved=false,lastX=0,lastY=0,pointerStartX=0,pointerStartY=0;
    let keys={};
    const forward=new THREE.Vector3(),right=new THREE.Vector3();
    function orientCamera(){
      pitch=clamp(pitch,-1.18,1.18);
      forward.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)).normalize();
      camera.lookAt(camera.position.clone().add(forward));
    }
    orientCamera();
    canvas.addEventListener('pointerdown',e=>{dragging=true;dragMoved=false;lastX=e.clientX;lastY=e.clientY;pointerStartX=e.clientX;pointerStartY=e.clientY;canvas.setPointerCapture?.(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{
      if(!dragging)return;
      const dx=e.clientX-lastX,dy=e.clientY-lastY;
      if(Math.abs(e.clientX-pointerStartX)+Math.abs(e.clientY-pointerStartY)>5)dragMoved=true;
      yaw-=dx*.0034;pitch-=dy*.0027;lastX=e.clientX;lastY=e.clientY;orientCamera();
    });
    function seedAtPointer(e){
      if(dragMoved)return;
      const rect=canvas.getBoundingClientRect(),mouse=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height*2-1));
      const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);
      const hit=ray.intersectObject(terrain,false)[0];
      if(hit && Math.hypot(hit.point.x,hit.point.z)<WORLD_R-1){
        buildFlower(hit.point.x,hit.point.z,rand(1.15,.72),choose(flowerPalette),true);createPulse(hit.point.x,hit.point.z);
        biomass=clamp(biomass+1.3,0,100);energy=clamp(energy-0.35,0,100);setEvent('Nouvel organisme semé dans le sol vivant.');updateMetrics();
      } else {
        createPulse(0,0,palette[paletteIndex].a);
      }
    }
    canvas.addEventListener('pointerup',e=>{if(dragging)seedAtPointer(e);dragging=false;});
    canvas.addEventListener('pointercancel',()=>dragging=false);
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    window.addEventListener('keydown',e=>{
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
      keys[e.code]=true;
      if(e.code==='KeyE')pulseAction();
      if(e.code==='KeyQ')seedAction();
      if(e.code==='Escape')document.getElementById('ui').classList.toggle('hud-hidden');
    });
    window.addEventListener('keyup',e=>keys[e.code]=false);

    function setEvent(text){document.getElementById('eventText').textContent=text;}
    function updateMetrics(){
      document.getElementById('biomassValue').textContent=Math.round(biomass)+'%';document.getElementById('biomassBar').style.width=biomass+'%';
      document.getElementById('energyValue').textContent=Math.round(energy)+'%';document.getElementById('energyBar').style.width=energy+'%';
      document.getElementById('speciesValue').textContent=String(9+Math.floor(flowers.length/7)).padStart(2,'0');
      document.getElementById('anomalyValue').textContent=String(anomalies).padStart(2,'0');
    }
    function pulseAction(){
      createPulse(0,0,palette[paletteIndex].a);energy=clamp(energy+7,0,100);biomass=clamp(biomass+2,0,100);
      heart.scale.set(.98,1.37,.98);setEvent('Impulsion diffusée. Les organismes répondent au signal vital.');updateMetrics();
      for(const c of creatures)c.speed*=1.12; if(simWorker)simWorker.postMessage({type:'speed',factor:1.12});
    }
    function seedAction(){
      const total=isMobile?7:12;
      for(let i=0;i<total;i++){
        const a=rand(Math.PI*2),r=rand(14.7,4.5),x=Math.cos(a)*r,z=Math.sin(a)*r;
        buildFlower(x,z,rand(.9,.4),choose(flowerPalette),true);
        if(i%3===0)createPulse(x,z,palette[paletteIndex].a);
      }
      biomass=clamp(biomass+5,0,100);energy=clamp(energy-4,0,100);setEvent(`${total} spores libérées. Une nouvelle génération prend racine.`);updateMetrics();
    }
    function mutateAction(){applyPalette(paletteIndex+1);energy=clamp(energy-1,0,100);updateMetrics();}
    function eventAction(){
      const ev=choose([
        'Pluie d’aurore : les spores s’illuminent et dérivent vers les hauteurs.',
        'Résonance tellurique : le cœur de l’arbre amplifie son battement.',
        'Migration : les créatures changent leur trajectoire orbitale.',
        'Floraison synchrone : les organismes végétaux libèrent un halo de lumière.',
        'Anomalie gravitationnelle : les poussières s’élèvent au-dessus du biome.'
      ]);
      anomalies=clamp(anomalies+(Math.random()>.55?1:0),0,9);energy=clamp(energy+rand(5,-3),0,100);biomass=clamp(biomass+rand(2,-1),0,100);
      createPulse(rand(8,-8),rand(8,-8),palette[paletteIndex].b);creatures.forEach(c=>{c.speed*=rand(1.8,.55);c.phase+=rand(2,-2)});if(simWorker)simWorker.postMessage({type:'perturb'});setEvent(ev);updateMetrics();
    }
    document.getElementById('pulseBtn').addEventListener('click',pulseAction);
    document.getElementById('seedBtn').addEventListener('click',seedAction);
    document.getElementById('mutateBtn').addEventListener('click',mutateAction);
    document.getElementById('eventBtn').addEventListener('click',eventAction);
    document.getElementById('hudBtn').addEventListener('click',()=>{const ui=document.getElementById('ui');ui.classList.toggle('hud-hidden');document.getElementById('hudBtn').textContent=ui.classList.contains('hud-hidden')?'AFFICHER HUD':'MASQUER HUD';});
    document.getElementById('resetBtn').addEventListener('click',()=>{camera.position.copy(cameraHome.position);yaw=cameraHome.yaw;pitch=cameraHome.pitch;orientCamera();setEvent('Caméra recentrée sur le cœur de l’écosystème.');});

    updateMetrics();
    setTimeout(()=>loading.classList.add('hidden'),650);
    let lastFrame=performance.now(),fpsSum=0,fpsFrames=0,fpsTimer=0;
    function animate(now){
      const dt=Math.min((now-lastFrame)/1000,.04);lastFrame=now;elapsed+=dt;simCycle+=dt*.18;
      // Flight movement
      const moveSpeed=(keys.ShiftLeft||keys.ShiftRight?15:keys.ControlLeft?2.6:7.2)*dt;
      const fwd=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
      const side=new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw));
      if(keys.KeyW||keys.ArrowUp)camera.position.addScaledVector(fwd,moveSpeed);
      if(keys.KeyS||keys.ArrowDown)camera.position.addScaledVector(fwd,-moveSpeed);
      if(keys.KeyA||keys.ArrowLeft)camera.position.addScaledVector(side,-moveSpeed);
      if(keys.KeyD||keys.ArrowRight)camera.position.addScaledVector(side,moveSpeed);
      if(keys.Space)camera.position.y+=moveSpeed;
      if(keys.ControlLeft||keys.ControlRight)camera.position.y-=moveSpeed;
      camera.position.y=clamp(camera.position.y,-3,70);
      orientCamera();

      // Organic breathing and ambient movement
      heart.rotation.y+=dt*.27;heart.rotation.z=Math.sin(elapsed*.7)*.12;
      const heartPulse=1+Math.sin(elapsed*2.2)*.085;heart.scale.set(.82*heartPulse,1.18*heartPulse,.82*heartPulse);
      heartHalo.rotation.z+=dt*.16;heartHalo.material.opacity=.55+Math.sin(elapsed*1.8)*.2;
      canopyGroup.rotation.y+=dt*.013;trunk.rotation.z=Math.sin(elapsed*.24)*.012;
      rings3d[0].rotation.z+=dt*.025;rings3d[1].rotation.z-=dt*.018;rings3d[2].rotation.z+=dt*.009;
      stars.rotation.y+=dt*.0015;stars.rotation.x=Math.sin(elapsed*.04)*.025;
      haze.material.opacity=.13+Math.sin(elapsed*.37)*.03;
      fillLight.intensity=43+Math.sin(elapsed*.38)*8;underLight.intensity=26+Math.sin(elapsed*.52+1)*6;
      if(simWorker && !simPending){simPending=true;simWorker.postMessage({type:'tick',dt,elapsed});}
      for(let i=0;i<creatures.length;i++){
        const c=creatures[i];
        if(simLatest){const j=i*5;c.group.position.set(simLatest[j],simLatest[j+1],simLatest[j+2]);c.group.rotation.y=simLatest[j+3];c.group.rotation.z=simLatest[j+4];}
        else {c.angle+=dt*c.speed;const r=c.radius+Math.sin(elapsed*.45+c.phase)*1.2;c.group.position.set(Math.cos(c.angle)*r,c.height+Math.sin(elapsed*1.25+c.phase)*.8,Math.sin(c.angle)*r);c.group.rotation.y=-c.angle+Math.PI/2;c.group.rotation.z=Math.sin(elapsed*1.7+c.phase)*.12;}
        c.ring.rotation.z+=dt*.65;
        c.fins.forEach((fin,k)=>{fin.rotation.y=Math.sin(elapsed*4+c.phase+k)*.3;});
      }
      const arr=moteGeo.attributes.position.array;
      for(let i=0;i<moteCount;i++){
        const d=moteData[i],a=d.angle+elapsed*d.speed*.17;
        arr[i*3]=Math.cos(a)*d.radius;
        arr[i*3+1]=d.y+Math.sin(elapsed*.7+d.phase)*d.bob;
        arr[i*3+2]=Math.sin(a)*d.radius;
      }
      moteGeo.attributes.position.needsUpdate=true;
      for(let i=pulses.length-1;i>=0;i--){const p=pulses[i];p.age+=dt;const t=p.age/p.duration;p.mesh.scale.setScalar(.1+t*18);p.mesh.material.opacity=Math.max(0,1-t);if(t>=1){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();pulses.splice(i,1);}}
      for(let i=flowers.length-1;i>=0;i--){const f=flowers[i];f.age+=dt;if(f.seeded){const t=clamp(f.age/1.25,0,1);f.group.scale.setScalar(f.targetScale*(t*t*(3-2*t)));if(t>=1)f.seeded=false;}else{f.group.rotation.y=Math.sin(elapsed*.48+f.age)*.025;}}
      biomass=clamp(biomass+Math.sin(elapsed*.08)*.005-.001,0,100);
      energy=clamp(energy+Math.sin(elapsed*.11+.8)*.004,0,100);
      document.getElementById('coords').textContent=`X ${camera.position.x.toFixed(1).padStart(5,'0')} · Y ${camera.position.y.toFixed(1).padStart(5,'0')} · Z ${camera.position.z.toFixed(1).padStart(5,'0')}`;
      document.getElementById('worldClock').textContent=`CYCLE ${String(Math.floor(elapsed/120)+1).padStart(2,'0')} · ${new Date(Math.floor(elapsed*1000)).toISOString().substring(14,19)}`;
      fpsSum+=1000/Math.max(1,now-(now-dt*1000));fpsFrames++;fpsTimer+=dt;
      if(fpsTimer>.5){document.getElementById('fps').textContent=Math.round(fpsFrames/fpsTimer);fpsFrames=0;fpsTimer=0;}
      composer.render();
    }
    renderer.setAnimationLoop(animate);
    window.addEventListener('resize',()=>{
      camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);composer.setSize(innerWidth,innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isMobile?1.25:1.7));
    });
  } catch(err){
    console.error(err);loading.classList.add('hidden');errorBox.style.display='block';
    errorBox.innerHTML='<strong>Le moteur 3D ne s’est pas chargé.</strong><br>Cette scène utilise Three.js depuis un CDN : vérifiez la connexion internet, puis ouvrez ce fichier dans Chrome, Firefox ou Edge récent. Si vous l’ouvrez depuis un gestionnaire de fichiers mobile, essayez un navigateur de bureau ou un petit serveur local.<br><small style="opacity:.7">Détail technique : '+String(err?.message||err).replace(/[<>]/g,'')+'</small>';
  }
})();
