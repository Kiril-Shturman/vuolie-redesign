// Вуолье — 3D model of the village (three.js). Geometry = real plot polygons from the masterplan.
import * as THREE from 'three';
import {OrbitControls} from './three/OrbitControls.js';

const root=document.getElementById('model3d');
const V=window.vuolie;
if(root&&V){
const canvasWrap=root.querySelector('.m3-canvas');
const M=0.377;                       // metres per masterplan px
const IMGW=3686.1,IMGH=2326.85;
let cx=0,cy=0;{let xs=0,ys=0,n=0;for(const p of V.plots){const c=p.points.split(' ').map(Number);for(let i=0;i<c.length;i+=2){xs+=c[i];ys+=c[i+1];n++;}}cx=xs/n;cy=ys/n;}
const W=(x,y)=>[(x-cx)*M,(y-cy)*M];   // image px -> world (x east, z south)
const mobile=()=>matchMedia('(max-width:760px)').matches;
let needs=true,visible=false,selId=null,hovId=null,season='summer';

// ---------- renderer / scene ----------
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile()?1.6:2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
canvasWrap.append(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(38,1,1,8000);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.08;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=60;controls.maxDistance=1700;
controls.target.set(40,0,40);camera.position.set(-330,430,640);
scene.fog=new THREE.Fog(0xcfe6f5,1300,3400);

const hemi=new THREE.HemisphereLight(0xdfefff,0x3d5a2a,.75);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.castShadow=true;
const SS=mobile()?1024:2048;sun.shadow.mapSize.set(SS,SS);
Object.assign(sun.shadow.camera,{left:-420,right:420,top:420,bottom:-420,near:10,far:2400});sun.shadow.bias=-0.0006;sun.shadow.normalBias=.6;
scene.add(sun,sun.target);

// ---------- ground ----------
const tl=new THREE.TextureLoader();
const aniso=renderer.capabilities.getMaxAnisotropy();
function texPlane(url,x0,y0,x1,y1,yLift,opts={}){const [ax,az]=W(x0,y0),[bx,bz]=W(x1,y1);
 const t=tl.load(url,()=>{needs=true;});t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=aniso;
 const m=new THREE.Mesh(new THREE.PlaneGeometry(bx-ax,bz-az),new THREE.MeshLambertMaterial({map:t,transparent:!!opts.transparent,depthWrite:!opts.transparent}));
 m.rotation.x=-Math.PI/2;m.position.set((ax+bx)/2,yLift,(az+bz)/2);m.receiveShadow=true;scene.add(m);return m;}
texPlane('assets/forest-bg.webp',-1843.05,-2326.85,5529.15,4653.7,-0.4);
texPlane('assets/masterplan-soft.webp',0,0,IMGW,IMGH,0,{transparent:true});
const snowGround=new THREE.Mesh(new THREE.PlaneGeometry(9000,9000),new THREE.MeshLambertMaterial({color:0xf4f8fb,transparent:true,opacity:0,depthWrite:false}));snowGround.rotation.x=-Math.PI/2;snowGround.position.y=.06;snowGround.receiveShadow=true;scene.add(snowGround);
const roadsPlane=texPlane('assets/roads.png',0,0,IMGW,IMGH,.12,{transparent:true});
// far ground ring so the edge never shows
const far=new THREE.Mesh(new THREE.CircleGeometry(6000,48),new THREE.MeshLambertMaterial({color:0x3f5a33}));far.rotation.x=-Math.PI/2;far.position.y=-1.2;far.receiveShadow=true;scene.add(far);

// ---------- lake Sirkoyarvi (north) + pond ----------
const waterMat=new THREE.MeshStandardMaterial({color:0x3f7f95,roughness:.15,metalness:.1});
function lake(px,py,rx,ry,seed){const s=new THREE.Shape();const N=64;for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,w=1+.12*Math.sin(a*3+seed)+.07*Math.sin(a*7+seed*2);const [x,z]=W(px+Math.cos(a)*rx*w,py+Math.sin(a)*ry*w);i?s.lineTo(x,-z):s.moveTo(x,-z);}
 const g=new THREE.ShapeGeometry(s);g.rotateX(-Math.PI/2);
 const m=new THREE.Mesh(g,waterMat);m.position.y=.25;m.receiveShadow=true;scene.add(m);return m;}
lake(1990,-760,620,520,1.3);

// ---------- plots ----------
const plotGroup=new THREE.Group();scene.add(plotGroup);
const MAT={free:new THREE.MeshStandardMaterial({color:0x8fbf5e,roughness:.95}),sold:new THREE.MeshStandardMaterial({color:0x6f7d62,roughness:1}),
 fav:new THREE.MeshStandardMaterial({color:0xf0b8b8,roughness:.9}),sel:new THREE.MeshStandardMaterial({color:0xeb6623,roughness:.7,emissive:0x3a1200}),hover:new THREE.MeshStandardMaterial({color:0xf8c9a8,roughness:.8})};
const edgeMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.85});
const meshes=[];const info=new Map();
for(const p of V.plots){const c=p.points.split(' ').map(Number);const s=new THREE.Shape();
 for(let i=0;i<c.length;i+=2){const [x,z]=W(c[i],c[i+1]);i?s.lineTo(x,-z):s.moveTo(x,-z);}
 const g=new THREE.ExtrudeGeometry(s,{depth:.9,bevelEnabled:false});g.rotateX(-Math.PI/2);
 const sold=V.isSold(p.id);const m=new THREE.Mesh(g,sold?MAT.sold:MAT.free);m.position.y=.05;m.receiveShadow=true;m.userData.id=p.id;plotGroup.add(m);meshes.push(m);
 const e=new THREE.LineSegments(new THREE.EdgesGeometry(g,30),edgeMat);e.position.y=.06;plotGroup.add(e);
 // centroid + main direction for houses
 let ax=0,az=0;const pts=[];for(let i=0;i<c.length;i+=2){const [x,z]=W(c[i],c[i+1]);pts.push([x,z]);ax+=x;az+=z;}ax/=pts.length;az/=pts.length;
 let best=0,ang=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l>best){best=l;ang=Math.atan2(b[1]-a[1],b[0]-a[0]);}}
 info.set(p.id,{x:ax,z:az,ang,mesh:m,sold});}
function paint(){if(typeof paintMini==='function'){paintMini();for(const m of meshes)m.material=mat3d(m.userData.id);}else for(const m of meshes){const id=m.userData.id,i=info.get(id);m.material=id===selId?MAT.sel:id===hovId?MAT.hover:V.isFav(id)?MAT.fav:i.sold?MAT.sold:MAT.free;}needs=true;}

// ---------- houses (illustrative): 3 types, gable roofs, windows, chimneys, terraces ----------
function merge(geos){const pos=[],nor=[];for(let g of geos){g=g.index?g.toNonIndexed():g;pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);}const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));m.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));return m;}
const box=(w,h,d,x,y,z)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);return g;};
function gable(w,h,d,y,over=.6){const s=new THREE.Shape();s.moveTo(-w/2-over,0);s.lineTo(0,h);s.lineTo(w/2+over,0);s.lineTo(-w/2-over,0);const g=new THREE.ExtrudeGeometry(s,{depth:d+over*2,bevelEnabled:false});g.translate(0,y,-(d+over*2)/2);return g;}
function winsAlong(w,d,y,n,h=1.5){const out=[];for(let i=0;i<n;i++){const z=-d/2+d*(i+.5)/n;out.push(box(.12,h,1.3,w/2+.04,y,z),box(.12,h,1.3,-w/2-.04,y,z));}return out;}
const TYPES=[
 {body:merge([box(8,3.2,10,0,1.6,0)]),roof:gable(8,3.4,10,3.2),win:merge([...winsAlong(8,10,1.7,3),box(1.6,2.2,.12,0,1.1,5.04)]),trim:merge([box(1.2,2.4,1.2,2.4,5.6,-2.5),box(9,.25,3.2,0,.12,6.6)])},
 {body:merge([box(9,6,11,0,3,0)]),roof:gable(9,3.6,11,6),win:merge([...winsAlong(9,11,1.7,3),...winsAlong(9,11,4.4,3,1.3),box(1.6,2.2,.12,0,1.1,5.54)]),trim:merge([box(1.2,2.6,1.2,-2.6,8.4,2.8),box(10,.25,3.4,0,.12,7.2),box(10,.2,3.4,0,3.2,7.2)])},
 {body:merge([box(12,3.4,8,0,1.7,0),box(5,3.4,6,-3.5,1.7,6)]),roof:merge([gable(12,2.6,8,3.4),gable(5,2.2,6,3.4).translate(-3.5,0,6)]),win:merge([...winsAlong(12,8,1.8,2),box(5,1.6,.12,2.6,1.8,4.04),box(.12,1.6,3,-6.04,1.8,0)]),trim:merge([box(7,.25,4,3,.12,6.2),box(1.1,2.2,1.1,4,5.4,-1.5)])}];
const WALLS=[0xeee6d6,0xb07a4f,0x5f6b70,0xd8c7a6,0x7b5236,0xf3efe7];const ROOFS=[0x3a3f45,0x6b3326,0x2f4a3a,0x45403a];
const winMat=new THREE.MeshStandardMaterial({color:0x22313a,roughness:.15,metalness:.4,emissive:0x000000});
const wallMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85});const roofMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.7});const trimMat=new THREE.MeshStandardMaterial({color:0x8a6a4a,roughness:.9});
const HM=TYPES.map(t=>{const o={body:new THREE.InstancedMesh(t.body,wallMat,V.plots.length),roof:new THREE.InstancedMesh(t.roof,roofMat,V.plots.length),win:new THREE.InstancedMesh(t.win,winMat,V.plots.length),trim:new THREE.InstancedMesh(t.trim,trimMat,V.plots.length)};Object.values(o).forEach(m=>{m.castShadow=true;m.receiveShadow=true;m.count=0;scene.add(m);});return o;});
let houseMode='sold';const tmpC=new THREE.Color();
function buildHouses(){const d=new THREE.Object3D();const n=[0,0,0];for(const [id,i] of info){if(houseMode==='none'||(houseMode==='sold'&&!i.sold))continue;
 const t=(id*7)%3,o=HM[t];d.position.set(i.x,.9,i.z);d.rotation.set(0,-i.ang+((id%2)?0:Math.PI),0);const k=.85+((id*37)%10)/50;d.scale.set(k,k,k);d.updateMatrix();
 const j=n[t]++;for(const m of Object.values(o))m.setMatrixAt(j,d.matrix);
 o.body.setColorAt(j,tmpC.setHex(WALLS[(id*13)%WALLS.length]));o.roof.setColorAt(j,tmpC.setHex(season==='winter'?0xf2f5f8:ROOFS[(id*5)%ROOFS.length]));}
 HM.forEach((o,t)=>{for(const m of Object.values(o)){m.count=n[t];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}});needs=true;}
buildHouses();

// ---------- scene details: KPP, lamps, signs, pond zone (from assets/scene.json) ----------
const extra=new THREE.Group();scene.add(extra);
const M_=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.8,...o});
const pondLawn=new THREE.MeshStandardMaterial({color:0x7fb356,roughness:1});
const lampHeads=new THREE.MeshStandardMaterial({color:0xfff6dd,emissive:0x000000,roughness:.4});
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=aniso;return t;}
function add(geo,mat,x,y,z,ry=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.y=ry;m.castShadow=true;m.receiveShadow=true;extra.add(m);return m;}
fetch('assets/scene.json').then(r=>r.json()).then(S=>{
 // lamps
 const poleG=merge([box(.25,6.5,.25,0,3.25,0),box(1.6,.18,.18,.7,6.4,0)]),headG=box(.8,.25,.45,1.4,6.25,0);
 const poles=new THREE.InstancedMesh(poleG,M_(0x2b2f33),S.lamps.length),heads=new THREE.InstancedMesh(headG,lampHeads,S.lamps.length);
 const d=new THREE.Object3D();S.lamps.forEach(([px,py],i)=>{const [x,z]=W(px,py);d.position.set(x,0,z);d.rotation.set(0,(i*1.7)%6.28,0);d.updateMatrix();poles.setMatrixAt(i,d.matrix);heads.setMatrixAt(i,d.matrix);});
 poles.castShadow=true;extra.add(poles,heads);
 // KPP: booth, barrier, entrance arch with name
 const [gx,gz]=W(...S.gate.p);const dir=Math.atan2(S.gate.dir[1],S.gate.dir[0]);const nx=-S.gate.dir[1],nz=S.gate.dir[0];
 const kpp=new THREE.Group();kpp.position.set(gx,0,gz);kpp.rotation.y=-dir;extra.add(kpp);
 const addK=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;kpp.add(o);return o;};
 addK(new THREE.BoxGeometry(4,3,3.4),M_(0xe9e4da),0,1.5,-9);addK(new THREE.BoxGeometry(4.08,1.1,3.48),M_(0x2a3b44,{roughness:.15,metalness:.3}),0,2,-9);addK(new THREE.BoxGeometry(5,.3,4.4),M_(0x33302c),0,3.15,-9);
 const bar=new THREE.Group();bar.position.set(-1.2,1.1,-6.8);kpp.add(bar);for(let k=0;k<6;k++){const o=new THREE.Mesh(new THREE.BoxGeometry(.18,.18,1.4),M_(k%2?0xffffff:0xd8352a));o.position.set(0,0,.7+k*1.4);bar.add(o);}
 addK(new THREE.BoxGeometry(.5,1.2,.5),M_(0x555a5f),-1.2,.6,-6.8);
 const nameT=canvasTex(512,128,g=>{g.fillStyle='#1f3a2c';g.fillRect(0,0,512,128);g.fillStyle='#EB6623';g.font='bold 70px Georgia,serif';g.textAlign='center';g.fillText('✱',70,90);g.fillStyle='#f4f1e6';g.font='72px Georgia,serif';g.fillText('Вуолье',290,92);});
 addK(new THREE.BoxGeometry(1,6,1),M_(0x6b4a33),-1.5,3,11);addK(new THREE.BoxGeometry(1,6,1),M_(0x6b4a33),-1.5,3,-5.5);
 const beam=addK(new THREE.BoxGeometry(1.2,1.6,18),[M_(0x1f3a2c),M_(0x1f3a2c),M_(0x1f3a2c),M_(0x1f3a2c),M_(0x1f3a2c),M_(0x1f3a2c)],-1.5,6.6,2.75);
 const face=new THREE.Mesh(new THREE.PlaneGeometry(14,3.5),new THREE.MeshBasicMaterial({map:nameT}));face.position.set(-.89,6.6,2.75);face.rotation.y=-Math.PI/2;kpp.add(face);const face2=face.clone();face2.position.x=-2.11;face2.rotation.y=Math.PI/2;kpp.add(face2);
 // speed-limit signs
 const sT=canvasTex(128,128,g=>{g.fillStyle='#fff';g.beginPath();g.arc(64,64,60,0,7);g.fill();g.lineWidth=14;g.strokeStyle='#d8352a';g.beginPath();g.arc(64,64,52,0,7);g.stroke();g.fillStyle='#111';g.font='bold 58px Arial';g.textAlign='center';g.fillText('20',64,84);});
 const signAt=(x,z,ry)=>{const s=new THREE.Group();s.position.set(x,0,z);s.rotation.y=ry;const p=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,3,6),M_(0x8a8f94));p.position.y=1.5;s.add(p);const f=new THREE.Mesh(new THREE.CircleGeometry(.6,24),new THREE.MeshBasicMaterial({map:sT,side:THREE.DoubleSide}));f.position.y=3.1;s.add(f);extra.add(s);};
 signAt(gx+nx*7+S.gate.dir[0]*16,gz+nz*7+S.gate.dir[1]*16,-dir+Math.PI/2);
 S.lamps.filter((_,i)=>i%14===5).forEach(([px,py],i)=>{const [x,z]=W(px,py);signAt(x+1.5,z+1.5,i);});
 // pond: water, gravel ring path, gazebo, pier, benches, playground, bbq
 const [pcx,pcz]=W(...S.pond.c);const pr=S.pond.r*M;
 const ps=new THREE.Shape();S.pond.poly.forEach(([px,py],i)=>{const [x,z]=W(px,py);i?ps.lineTo(x,-z):ps.moveTo(x,-z);});const pg=new THREE.ShapeGeometry(ps);pg.rotateX(-Math.PI/2);
 const pondMesh=new THREE.Mesh(pg,waterMat);pondMesh.position.y=.35;pondMesh.receiveShadow=true;extra.add(pondMesh);
 const ring=new THREE.Mesh(new THREE.RingGeometry(pr+1.2,pr+3.2,64),M_(0xd9cdb4,{roughness:1}));ring.rotation.x=-Math.PI/2;ring.position.set(pcx,.3,pcz);ring.receiveShadow=true;extra.add(ring);
 const wood=M_(0x9a6b45),dark=M_(0x3b3530);
 const lawn=new THREE.Mesh(new THREE.RingGeometry(pr+3.2,pr+11,64),pondLawn);lawn.rotation.x=-Math.PI/2;lawn.position.set(pcx,.28,pcz);lawn.receiveShadow=true;extra.add(lawn);
 for(let k=0;k<6;k++){const t=k/6*6.283+.6;add(new THREE.CylinderGeometry(.1,.12,4,6),M_(0x2b2f33),pcx+Math.cos(t)*(pr+3.6),2,pcz+Math.sin(t)*(pr+3.6));add(new THREE.SphereGeometry(.45,10,8),lampHeads,pcx+Math.cos(t)*(pr+3.6),4.2,pcz+Math.sin(t)*(pr+3.6));}
 // gazebo
 {const a=3.6,R=pr+6,gx2=pcx+Math.cos(a)*R,gz2=pcz+Math.sin(a)*R;add(new THREE.CylinderGeometry(3.4,3.4,.3,8),wood,gx2,.15,gz2);for(let k=0;k<8;k++){const t=k/8*6.283;add(new THREE.CylinderGeometry(.12,.12,2.6,6),wood,gx2+Math.cos(t)*3,1.45,gz2+Math.sin(t)*3);}add(new THREE.ConeGeometry(4.2,2,8),M_(0x5a3a2a),gx2,3.7,gz2);}
 // pier into the water
 {const a=2.6,x=pcx+Math.cos(a)*(pr-3),z=pcz+Math.sin(a)*(pr-3);add(new THREE.BoxGeometry(10,.3,2.2),wood,x,.55,z,-a);}
 // benches around the ring
 for(let k=0;k<12;k++){const t=k/12*6.283+.3;if(Math.abs(t-3.6)<.35||Math.abs(t-4.6)<.45||Math.abs(t-5.6)<.3)continue;const x=pcx+Math.cos(t)*(pr+4.6),z=pcz+Math.sin(t)*(pr+4.6);const b=add(new THREE.BoxGeometry(2,.12,.6),wood,x,.5,z,-t+Math.PI/2);add(new THREE.BoxGeometry(2,.6,.1),wood,x+Math.cos(t)*.32,.8,z+Math.sin(t)*.32,-t+Math.PI/2);}
 // playground
 {const a=4.6,R=pr+7,x=pcx+Math.cos(a)*R,z=pcz+Math.sin(a)*R;const pad=new THREE.Mesh(new THREE.CircleGeometry(7,24),M_(0xc96a3a,{roughness:1}));pad.rotation.x=-Math.PI/2;pad.position.set(x,.32,z);pad.receiveShadow=true;extra.add(pad);
  add(new THREE.BoxGeometry(2,2.2,2),M_(0x2f7fd0),x-2,1.1,z);add(new THREE.BoxGeometry(1,.15,4.2),M_(0xeb6623),x-2,1,z+2.6).rotation.x=-.45;
  for(const dx of[-1.6,1.6])add(new THREE.BoxGeometry(.15,2.8,.15),M_(0xf2c230),x+3+dx,1.4,z-1);add(new THREE.BoxGeometry(3.6,.15,.15),M_(0xf2c230),x+3,2.8,z-1);add(new THREE.BoxGeometry(.6,.08,.3),dark,x+3,.8,z-1);
  const sand=new THREE.Mesh(new THREE.BoxGeometry(2.6,.25,2.6),M_(0xe8d39a));sand.position.set(x+1,.4,z+3.6);extra.add(sand);}
 // bbq + table
 {const a=5.6,R=pr+6.5,x=pcx+Math.cos(a)*R,z=pcz+Math.sin(a)*R;add(new THREE.BoxGeometry(1.4,.9,.6),dark,x,.45,z);add(new THREE.BoxGeometry(2.6,.12,1.2),wood,x+2.6,.8,z);add(new THREE.BoxGeometry(2.6,.1,.4),wood,x+2.6,.45,z+1);add(new THREE.BoxGeometry(2.6,.1,.4),wood,x+2.6,.45,z-1);}
 window.vuolieScene={pond:[pcx,pcz,pr],gate:[gx,gz]};
 applySun();needs=true;});
// ---------- trees (instanced low-poly), placed by sampling the masterplan image ----------
const crownG=new THREE.IcosahedronGeometry(1,0);crownG.translate(0,1,0);
const spruceG=new THREE.ConeGeometry(1,2.6,7,1);spruceG.translate(0,1.3,0);
const trunkG=new THREE.CylinderGeometry(.18,.24,1,5);trunkG.translate(0,.5,0);
const leafA=new THREE.MeshStandardMaterial({color:0x5a9a45,roughness:.9,flatShading:true}),leafB=new THREE.MeshStandardMaterial({color:0x3d7a3c,roughness:.9,flatShading:true}),trunkM=new THREE.MeshStandardMaterial({color:0x5a4330,roughness:1});
const NT=mobile()?5000:11000;
const trees={crown:new THREE.InstancedMesh(crownG,leafA,NT),spruce:new THREE.InstancedMesh(spruceG,leafB,NT),trunk:new THREE.InstancedMesh(trunkG,trunkM,NT*2)};
Object.values(trees).forEach(t=>{t.castShadow=true;t.receiveShadow=true;t.count=0;scene.add(t);});
for(let i=0;i<NT;i++)trees.crown.setColorAt(i,new THREE.Color(1,1,1));
// village hull (expanded bbox of plots) to keep trees off plots/streets
let bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;for(const p of V.plots){const c=p.points.split(' ').map(Number);for(let i=0;i<c.length;i+=2){bx0=Math.min(bx0,c[i]);bx1=Math.max(bx1,c[i]);by0=Math.min(by0,c[i+1]);by1=Math.max(by1,c[i+1]);}}
const insidePoly=(x,y,c)=>{let r=false;for(let i=0,j=c.length-2;i<c.length;j=i,i+=2){const xi=c[i],yi=c[i+1],xj=c[j],yj=c[j+1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))r=!r;}return r;};
const polys=V.plots.map(p=>p.points.split(' ').map(Number));
const img=new Image();img.src='assets/masterplan.webp';
img.onload=()=>{const cv=document.createElement('canvas');const sw=920,sh=Math.round(sw*IMGH/IMGW);cv.width=sw;cv.height=sh;const g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,sw,sh);const D=g.getImageData(0,0,sw,sh).data;
 const forestAt=(x,y)=>{if(x<0||y<0||x>=IMGW||y>=IMGH)return null;const i=(Math.floor(y/IMGH*sh)*sw+Math.floor(x/IMGW*sw))*4,r=D[i],gg=D[i+1],b=D[i+2];const lum=(r+gg+b)/3;return gg>r&&gg>b-4&&lum<95&&!(b>r+18);};
 const nearPond=(x,y)=>{const dx=x-2307.8,dy=y-1950.4,ex=x-2184,ey=y-1196;return dx*dx+dy*dy<150*150||ex*ex+ey*ey<120*120;};
 const inLake=(x,y)=>{const dx=(x-1990)/700,dy=(y+760)/600;return dx*dx+dy*dy<1;};
 const nearVillage=(x,y)=>x>bx0-40&&x<bx1+40&&y>by0-40&&y<by1+40&&polys.some(c=>insidePoly(x,y,c));
 const d=new THREE.Object3D();let nc=0,ns=0,nt=0;const R=Math.random;let tries=0;
 while((nc+ns)<NT&&tries<NT*12){tries++;
  // denser near the village, sparser far away
  const rr=Math.pow(R(),.7);const a=R()*Math.PI*2;const x=cx+Math.cos(a)*rr*2600,y=cy+Math.sin(a)*rr*2300;
  const f=forestAt(x,y);if(f===false)continue;if(f===null&&(inLake(x,y)))continue;if(f===null&&R()<.25)continue;if(nearVillage(x,y)||nearPond(x,y))continue;
  const [wx,wz]=W(x,y);const h=8+R()*8,isSpruce=R()<.45;
  d.position.set(wx,0,wz);d.rotation.set(0,R()*6.3,0);
  if(isSpruce){d.scale.set(h*.36,h*.72,h*.36);d.position.y=h*.1;d.updateMatrix();trees.spruce.setMatrixAt(ns++,d.matrix);}
  else{d.scale.set(h*.33,h*.36,h*.33);d.position.y=h*.32;d.updateMatrix();trees.crown.setMatrixAt(nc++,d.matrix);}
  d.position.y=0;d.scale.set(1,h*(isSpruce?.14:.34),1);d.updateMatrix();trees.trunk.setMatrixAt(nt++,d.matrix);}
 trees.crown.count=nc;paintCrowns();trees.spruce.count=ns;trees.trunk.count=nt;Object.values(trees).forEach(t=>t.instanceMatrix.needsUpdate=true);needs=true;};

// ---------- labels (POIs) ----------
const labels=[];const lblLayer=root.querySelector('.m3-labels');
function label(text,px,py,y=12,cls=''){const el=document.createElement('div');el.className='m3-lbl '+cls;el.innerHTML=text;lblLayer.append(el);const [x,z]=W(px,py);labels.push({el,v:new THREE.Vector3(x,y,z)});}
label('<i></i>Въезд · КПП',2195,1169,14);label('<i></i>Зона отдыха у пруда',2304,1953,10);label('<i></i>Озеро Сиркоярви · 500 м',1990,-760,10,'big');


// ---------- seasons & weather ----------
const SEASON={
 summer:{day:172,free:0x8fbf5e,sold:0x6f7d62,leaf:[0x5a9a45],spruce:0x3d7a3c,snow:0,water:0x3f7f95,fx:null,sky:1},
 spring:{day:120,free:0xa9d27a,sold:0x7c8a6c,leaf:[0x9fd36a,0x8cc85a,0xb6db7a],spruce:0x3f7e40,snow:0,water:0x4a8aa0,fx:null,sky:1},
 autumn:{day:280,free:0xa6a160,sold:0x7a7458,leaf:[0xe3a33a,0xd9702a,0xc9452a,0xe8c547,0x9c8a3a],spruce:0x355f35,snow:0,water:0x3b6574,fx:'rain',sky:.55},
 winter:{day:355,free:0xe9eef2,sold:0xc9d0d6,leaf:[0x8c8378,0x7d7468],spruce:0x56786a,snow:.92,water:0xd6e6ee,fx:'snow',sky:.85}};
function paintCrowns(){const L=SEASON[season].leaf;const c=new THREE.Color();for(let i=0;i<trees.crown.count;i++){c.setHex(L[(i*2654435761>>>0)%L.length]);trees.crown.setColorAt(i,c);}if(trees.crown.instanceColor)trees.crown.instanceColor.needsUpdate=true;needs=true;}
let fx=null;
function makeFx(kind){if(fx){scene.remove(fx.obj);fx.obj.geometry.dispose();fx=null;}if(!kind)return;
 const N=mobile()?2500:6000,B=[900,320,900];
 if(kind==='snow'){const pos=new Float32Array(N*3);for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*B[0];pos[i*3+1]=Math.random()*B[1];pos[i*3+2]=(Math.random()-.5)*B[2];}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const obj=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:2.4,sizeAttenuation:true,transparent:true,opacity:.95,depthWrite:false}));fx={kind,obj,N,B,v:9};}
 else{const pos=new Float32Array(N*6);for(let i=0;i<N;i++){const x=(Math.random()-.5)*B[0],y=Math.random()*B[1],z=(Math.random()-.5)*B[2];pos.set([x,y,z,x+.6,y+5,z],i*6);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const obj=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xaec4d4,transparent:true,opacity:.55,depthWrite:false}));fx={kind,obj,N,B,v:140};}
 fx.obj.frustumCulled=false;scene.add(fx.obj);}
let lastT=0;
function stepFx(t){if(!fx)return;const dt=Math.min(.05,(t-lastT)/1000||0);const p=fx.obj.geometry.attributes.position.array,tg=controls.target;
 fx.obj.position.set(tg.x,0,tg.z);
 if(fx.kind==='snow'){for(let i=0;i<fx.N;i++){let y=p[i*3+1]-fx.v*dt;p[i*3]+=Math.sin(t/900+i)*.06;if(y<0)y+=fx.B[1];p[i*3+1]=y;}}
 else{for(let i=0;i<fx.N;i++){let y=p[i*6+1]-fx.v*dt;if(y<0)y+=fx.B[1];p[i*6+1]=y;p[i*6+4]=y+5;}}
 fx.obj.geometry.attributes.position.needsUpdate=true;needs=true;}
function setSeason(sname){season=sname;const S=SEASON[sname];day=S.day;
 MAT.free.color.setHex(S.free);MAT.sold.color.setHex(S.sold);leafB.color.setHex(S.spruce);waterMat.color.setHex(S.water);waterMat.roughness=sname==='winter'?.6:.15;
 snowGround.material.opacity=S.snow;pondLawn.color.setHex(sname==='winter'?0xeef3f6:sname==='autumn'?0x9a9a55:0x7fb356);edgeMat.opacity=sname==='winter'?.5:.85;paintCrowns();buildHouses();makeFx(S.fx);applySun();track3d('season',{s:sname});}
const track3d=(n,p)=>{try{document.dispatchEvent(new CustomEvent('vuolie:analytics',{detail:{name:'m3_'+n,props:p}}));}catch{}};

// ---------- sun ----------
const LAT=60.33*Math.PI/180;let day=172,hour=13;const SEASON_LABEL={winter:'зима',spring:'весна',summer:'лето',autumn:'осень'};
function sunPos(){const decl=23.44*Math.PI/180*Math.sin(2*Math.PI*(284+day)/365);const H=(hour-13.0)*15*Math.PI/180; // solar noon ≈ 13:00 local
 const alt=Math.asin(Math.sin(LAT)*Math.sin(decl)+Math.cos(LAT)*Math.cos(decl)*Math.cos(H));
 let az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(LAT)-Math.tan(decl)*Math.cos(LAT))+Math.PI; return {alt,az};}
const skyDay=new THREE.Color(0xcfe6f5),skyLow=new THREE.Color(0xf2b98a),skyNight=new THREE.Color(0x14202e);
function applySun(){const {alt,az}=sunPos();const R=1400;const ce=Math.cos(Math.max(alt,.02));
 sun.position.set(Math.sin(az)*ce*R,Math.sin(Math.max(alt,.02))*R,-Math.cos(az)*ce*R);sun.target.position.set(0,0,0);
 const k=Math.max(0,Math.min(1,alt/(20*Math.PI/180)));const night=alt<-.05;
 const wx=SEASON[season].sky;const winter=season==='winter';sun.intensity=night?0:winter?Math.max(1.6,(0.5+2.6*k)):(0.5+2.6*k)*wx;lampHeads.emissive.setHex(alt<.09?0xffd9a0:0x000000);lampHeads.emissiveIntensity=alt<.09?2.2:0;winMat.emissive.setHex(alt<.03?0x6b4a1a:0x000000);sun.color.setHSL(.09+.04*k,.9-.7*k,.6+.35*k);
 hemi.intensity=night?.18:(season==='winter'?1.25:.45+.65*k);
 let sky=night?skyNight.clone():skyLow.clone().lerp(skyDay,k);if(!night&&season==='autumn')sky.lerp(new THREE.Color(0x9aa6ae),.55);if(!night&&season==='winter')sky.lerp(new THREE.Color(0xdfe7ee),.4);scene.background=sky;scene.fog.color.copy(sky);
 const deg=Math.round(alt*180/Math.PI),dirs=['С','СВ','В','ЮВ','Ю','ЮЗ','З','СЗ'];
 root.querySelector('#m3-sun').innerHTML=(deg>0?deg+'°':'—')+' <small>'+(deg>0?dirs[Math.round(((az*180/Math.PI)%360)/45)%8]:'ночь')+'</small>';
 const hh=Math.floor(hour),mm=Math.round((hour-hh)*60);root.querySelector('#m3-time').textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+' · '+SEASON_LABEL[season];
 // day length
 const decl=23.44*Math.PI/180*Math.sin(2*Math.PI*(284+day)/365);const c=-Math.tan(LAT)*Math.tan(decl);const dl=c<=-1?24:c>=1?0:2*Math.acos(c)*180/Math.PI/15;
 root.querySelector('#m3-day').innerHTML=Math.floor(dl)+'<small> ч </small>'+Math.round((dl%1)*60)+'<small> мин</small>';
 needs=true;}
const slider=root.querySelector('#m3-hour');slider.addEventListener('input',()=>{hour=+slider.value;applySun();});
root.querySelectorAll('[data-season]').forEach(b=>b.addEventListener('click',()=>{root.querySelectorAll('[data-season]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));setSeason(b.dataset.season);}));
applySun();


// ---------- camera views + tour ----------
let anim=null;
function fly(pos,tgt,ms=1600){const p0=camera.position.clone(),t0=controls.target.clone(),p1=new THREE.Vector3(...pos),t1=new THREE.Vector3(...tgt),st=performance.now();anim=t=>{let k=Math.min(1,(t-st)/ms);k=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;camera.position.lerpVectors(p0,p1,k);controls.target.lerpVectors(t0,t1,k);if(k>=1)anim=null;};}
const g=(px,py)=>W(px,py);
const VIEWS={model:()=>fly([-330,430,640],[40,0,40]),top:()=>fly([0,980,40],[0,0,0]),
 pond:()=>{const P=window.vuolieScene;if(!P)return;fly([P.pond[0]-40,70,P.pond[1]+95],[P.pond[0]+28,0,P.pond[1]-6]);},gate:()=>{const [x,z]=g(2195,1169);fly([x+90,140,z-150],[x-60,0,z+90]);}};
const STOPS=[
 {t:'Въезд и КПП',d:'Сюда приезжаете по финской брусчатке. Охрана, видеонаблюдение.',go:()=>{const [x,z]=g(2195,1169);fly([x+90,140,z-150],[x-60,0,z+90],2200);}},
 {t:'Главная улица',d:'Улицы шириной 10 м, асфальтовая крошка, освещение.',go:()=>{const [x,z]=g(1500,1250);fly([x+260,110,z+60],[x-220,0,z-10],2200);}},
 {t:'Зона у пруда',d:'Беседка, пирс, лавочки, детская площадка и мангал.',go:()=>{const P=window.vuolieScene;const [x,z]=P?P.pond:g(2304,1953);fly([x-80,70,z+95],[x,0,z],2200);}},
 {t:'Освещение и дороги',d:'Фонари вдоль всех улиц, разметка, знаки 20 км/ч.',go:()=>{const [x,z]=g(1700,1500);fly([x+40,45,z+120],[x-20,0,z-60],2200);}},
 {t:'Озеро Сиркоярви',d:'500 м — 5 минут пешком. Прогулочная дорожка вдоль берега.',go:()=>{const [x,z]=g(1990,-560);fly([x+60,180,z+520],[x,0,z-120],2600);}},
 {t:'Весь посёлок',d:'233 участка от 6 до 15 соток среди хвойного леса.',go:()=>fly([-300,380,560],[0,0,0],2600)}];
let stop=-1,tourTimer=null;
function showStop(i){stop=(i+STOPS.length)%STOPS.length;const s=STOPS[stop];s.go();root.querySelector('#m3-stop').innerHTML='<b>'+(stop+1)+'/'+STOPS.length+'</b> '+s.t+'<small>'+s.d+'</small>';}
function tour(on){clearInterval(tourTimer);root.querySelector('#m3-play').setAttribute('aria-pressed',String(on));if(on){showStop(stop+1);tourTimer=setInterval(()=>showStop(stop+1),4200);}}
root.querySelector('#m3-prev').addEventListener('click',()=>{tour(false);showStop(stop-1);});
root.querySelector('#m3-next').addEventListener('click',()=>{tour(false);showStop(stop+1);});
root.querySelector('#m3-play').addEventListener('click',e=>tour(e.currentTarget.getAttribute('aria-pressed')!=='true'));
root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{tour(false);root.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));VIEWS[b.dataset.view]();}));
root.querySelectorAll('[data-houses]').forEach(b=>b.addEventListener('click',()=>{houseMode=b.dataset.houses;root.querySelectorAll('[data-houses]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));buildHouses();}));
controls.addEventListener('start',()=>{anim=null;tour(false);});

// ---------- picking ----------
const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();let down=null;
const card=root.querySelector('.m3-card');
function pick(e){const r=renderer.domElement.getBoundingClientRect();ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ptr,camera);const h=ray.intersectObjects(meshes,false)[0];return h?h.object.userData.id:null;}
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const id=pick(e);if(id!==hovId){hovId=id;renderer.domElement.style.cursor=id?'pointer':'grab';paint();}});
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const id=pick(e);selId=id;paint();if(id){V.select(id);showCard(id);}else card.hidden=true;});
function showCard(id){const p=V.plots.find(x=>x.id===id),sold=V.isSold(id),pr=V.priceOf(id);
 card.innerHTML='<button type="button" class="m3-x" aria-label="Закрыть">×</button><span class="m3-pill'+(sold?' sold':'')+'">'+(sold?'Продан':'В продаже')+'</span><strong>Участок № '+id+'</strong><span>'+V.fmt(p.area)+' сот. · '+V.fmt(Math.round(p.area*100))+' м²</span><b>'+(sold?'—':pr?V.money(pr)+(id===V.ANOMALY?' ⚠':''):'по запросу')+'</b>'+(sold?'':'<button type="button" class="button gold wide m3-req">Хочу этот участок →</button>');
 card.hidden=false;card.querySelector('.m3-x').onclick=()=>{card.hidden=true;selId=null;paint();};const rq=card.querySelector('.m3-req');if(rq)rq.onclick=()=>V.request();
 const i=info.get(id);cardAnchor=new THREE.Vector3(i.x,8,i.z);needs=true;}
let cardAnchor=null;


// ---------- 2D minimap (zoom/pan + filters, synced with 3D) ----------
const miniBox=root.querySelector('.m3-mini'),mini=root.querySelector('#m3-mini');const NS='http://www.w3.org/2000/svg';
let mx0=1e9,mz0=1e9,mx1=-1e9,mz1=-1e9;const miniPolys=new Map(),miniC=new Map();
for(const p of V.plots){const c=p.points.split(' ').map(Number);const pts=[];let sx=0,sz=0;for(let i=0;i<c.length;i+=2){const [x,z]=W(c[i],c[i+1]);sx+=x;sz+=z;pts.push(x.toFixed(1)+','+z.toFixed(1));mx0=Math.min(mx0,x);mx1=Math.max(mx1,x);mz0=Math.min(mz0,z);mz1=Math.max(mz1,z);}miniPolys.set(p.id,pts.join(' '));miniC.set(p.id,[sx*2/c.length,sz*2/c.length]);}
const PAD=30;const FULL={x:mx0-PAD,y:mz0-PAD,w:mx1-mx0+PAD*2,h:mz1-mz0+PAD*2};let vb={...FULL};
const bg=document.createElementNS(NS,'rect');Object.entries({x:FULL.x-2000,y:FULL.y-2000,width:FULL.w+4000,height:FULL.h+4000,class:'mm-bg'}).forEach(([k,v])=>bg.setAttribute(k,v));mini.append(bg);
{const [lx,lz]=W(1990,-760);const e=document.createElementNS(NS,'ellipse');e.setAttribute('cx',lx);e.setAttribute('cy',lz);e.setAttribute('rx',620*M*1.05);e.setAttribute('ry',520*M);e.setAttribute('class','mm-lake');mini.append(e);}
const mmG=document.createElementNS(NS,'g');mini.append(mmG);const mmL=document.createElementNS(NS,'g');mmL.setAttribute('class','mm-labels');mini.append(mmL);
for(const [id,pts] of miniPolys){const pg=document.createElementNS(NS,'polygon');pg.setAttribute('points',pts);pg.dataset.id=id;mmG.append(pg);
 const [x,z]=miniC.get(id);const t=document.createElementNS(NS,'text');t.setAttribute('x',x);t.setAttribute('y',z+2.6);t.textContent=id;mmL.append(t);}
const view=document.createElementNS(NS,'path');view.setAttribute('class','mm-view');mini.append(view);
const camDot=document.createElementNS(NS,'circle');camDot.setAttribute('class','mm-cam');mini.append(camDot);
function applyVb(){mini.setAttribute('viewBox',[vb.x,vb.y,vb.w,vb.h].map(v=>v.toFixed(1)).join(' '));const k=FULL.w/vb.w;mini.classList.toggle('mm-num',k>2.2);camDot.setAttribute('r',(9/k).toFixed(1));}
mini.setAttribute('preserveAspectRatio','xMidYMid meet');applyVb();
// filters
const F={a:'all',s:'all',c:'status'};
const prices=V.plots.map(p=>V.priceOf(p.id)).filter((v,i)=>v&&V.plots[i].id!==V.ANOMALY).sort((a,b)=>a-b);const q=k=>prices[Math.min(prices.length-1,Math.floor(prices.length*k/5))];const cuts=[q(1),q(2),q(3),q(4)];
const TIER=[0xe9f2c8,0xc6e09a,0xf5b183,0xef8a4a,0xd9704a];const tierMats=TIER.map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.9}));
const ghost=new THREE.MeshStandardMaterial({color:0x4f5d47,roughness:1});
const tierOf=id=>{const pr=V.priceOf(id);if(!pr||V.isSold(id)||id===V.ANOMALY)return -1;return cuts.filter(c=>pr>=c).length;};
function passes(p){const [lo,hi]=F.a.split('-').map(Number);if(F.a!=='all'&&!(p.area<=hi&&(lo===6?p.area>=lo:p.area>lo)))return false;
 if(F.s==='free'&&V.isSold(p.id))return false;if(F.s==='fav'&&!V.isFav(p.id))return false;return true;}
let passSet=new Set(V.plots.map(p=>p.id));
function applyFilters(){passSet=new Set(V.plots.filter(passes).map(p=>p.id));const n=passSet.size;root.querySelector('#mm-count').textContent=n+' '+(n%10===1&&n%100!==11?'участок':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'участка':'участков');
 root.querySelector('#mm-legend').classList.toggle('price',F.c==='price');paint();}
function bindChips(sel,key){root.querySelectorAll(sel+' button').forEach(b=>b.addEventListener('click',()=>{F[key]=b.dataset[key];root.querySelectorAll(sel+' button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));applyFilters();}));}
bindChips('#mm-area','a');bindChips('#mm-status','s');bindChips('#mm-color','c');
function paintMini(){for(const pg of mmG.children){const id=+pg.dataset.id,ok=passSet.has(id);let cls=!ok?'off':id===selId?'sel':V.isFav(id)?'fav':V.isSold(id)?'sold':F.c==='price'?'t'+Math.max(0,tierOf(id)):'free';pg.setAttribute('class',cls);}}
function mat3d(id){if(!passSet.has(id))return ghost;if(id===selId)return MAT.sel;if(id===hovId)return MAT.hover;if(V.isFav(id))return MAT.fav;if(V.isSold(id))return MAT.sold;if(F.c==='price'){const t=tierOf(id);if(t>=0)return tierMats[t];}return MAT.free;}
function updMini(){const t=controls.target,c=camera.position;let dx=t.x-c.x,dz=t.z-c.z;const L=Math.hypot(dx,dz)||1;dx/=L;dz/=L;
 const R=Math.min(140,camera.position.distanceTo(t)*.22),a=.42;
 const lx=Math.cos(a)*dx-Math.sin(a)*dz,lz=Math.sin(a)*dx+Math.cos(a)*dz,rx=Math.cos(-a)*dx-Math.sin(-a)*dz,rz=Math.sin(-a)*dx+Math.cos(-a)*dz;
 const cx2=Math.max(FULL.x,Math.min(FULL.x+FULL.w,c.x)),cz2=Math.max(FULL.y,Math.min(FULL.y+FULL.h,c.z));
 view.setAttribute('d',`M${cx2} ${cz2} L${cx2+lx*R*2} ${cz2+lz*R*2} L${cx2+rx*R*2} ${cz2+rz*R*2} Z`);camDot.setAttribute('cx',cx2);camDot.setAttribute('cy',cz2);}
// zoom / pan
const toW=(cx,cy)=>{const pt=mini.createSVGPoint();pt.x=cx;pt.y=cy;return pt.matrixTransform(mini.getScreenCTM().inverse());};
function zoomMini(f,cx,cy){const r=mini.getBoundingClientRect();cx=cx??r.x+r.width/2;cy=cy??r.y+r.height/2;const w=toW(cx,cy);
 const nw=Math.min(FULL.w*1.4,Math.max(FULL.w/8,vb.w/f)),k=nw/vb.w;vb={x:w.x-(w.x-vb.x)*k,y:w.y-(w.y-vb.y)*k,w:nw,h:vb.h*k};clampVb();applyVb();}
function clampVb(){const mx=FULL.w*.3,my=FULL.h*.3;vb.x=Math.min(Math.max(vb.x,FULL.x-mx),FULL.x+FULL.w+mx-vb.w);vb.y=Math.min(Math.max(vb.y,FULL.y-my),FULL.y+FULL.h+my-vb.h);}
mini.addEventListener('wheel',e=>{e.preventDefault();zoomMini(e.deltaY<0?1.25:.8,e.clientX,e.clientY);},{passive:false});
root.querySelector('#mm-in').onclick=()=>zoomMini(1.5);root.querySelector('#mm-out').onclick=()=>zoomMini(1/1.5);root.querySelector('#mm-fit').onclick=()=>{vb={...FULL};applyVb();};
const ptrs=new Map();let mdrag=null,mmoved=false;
mini.addEventListener('pointerdown',e=>{ptrs.set(e.pointerId,[e.clientX,e.clientY]);mini.setPointerCapture(e.pointerId);mmoved=false;
 if(ptrs.size===1)mdrag={x:e.clientX,y:e.clientY,vb:{...vb}};else{const [p1,p2]=[...ptrs.values()];mdrag={pinch:Math.hypot(p1[0]-p2[0],p1[1]-p2[1]),vb:{...vb},mid:[(p1[0]+p2[0])/2,(p1[1]+p2[1])/2]};}});
mini.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return hoverMini(e);ptrs.set(e.pointerId,[e.clientX,e.clientY]);if(!mdrag)return;const r=mini.getBoundingClientRect(),sc=Math.max(vb.w/r.width,vb.h/r.height);
 if(mdrag.pinch&&ptrs.size>=2){const [p1,p2]=[...ptrs.values()];const d=Math.hypot(p1[0]-p2[0],p1[1]-p2[1]);vb={...mdrag.vb};zoomMini(d/mdrag.pinch,mdrag.mid[0],mdrag.mid[1]);mmoved=true;return;}
 const dx=e.clientX-mdrag.x,dy=e.clientY-mdrag.y;if(!mmoved&&Math.hypot(dx,dy)<5)return;mmoved=true;vb={...mdrag.vb,x:mdrag.vb.x-dx*sc,y:mdrag.vb.y-dy*sc};clampVb();applyVb();});
['pointerup','pointercancel'].forEach(t=>mini.addEventListener(t,e=>{ptrs.delete(e.pointerId);if(!ptrs.size)mdrag=null;}));
const mtip=root.querySelector('.mm-tip');
function hoverMini(e){if(e.pointerType!=='mouse')return;const pg=e.target.closest('polygon');if(!pg||pg.classList.contains('off')){mtip.hidden=true;return;}const id=+pg.dataset.id,p=V.plots.find(x=>x.id===id),pr=V.priceOf(id);
 mtip.innerHTML='<b>№ '+id+'</b> · '+V.fmt(p.area)+' сот.<br>'+(V.isSold(id)?'продан':pr?V.money(pr):'по запросу');const r=miniBox.querySelector('.mm-stage').getBoundingClientRect();mtip.style.left=(e.clientX-r.x+12)+'px';mtip.style.top=(e.clientY-r.y+12)+'px';mtip.hidden=false;}
mini.addEventListener('pointerleave',()=>{mtip.hidden=true;});
mini.addEventListener('click',e=>{if(mmoved){mmoved=false;return;}const pg=e.target.closest('polygon');const w=toW(e.clientX,e.clientY);
 tour(false);if(pg&&!pg.classList.contains('off')){const id=+pg.dataset.id;selId=id;paint();V.select(id);showCard(id);const i=info.get(id);const off=camera.position.clone().sub(controls.target).setLength(260);off.y=Math.max(off.y,150);fly([i.x+off.x,off.y,i.z+off.z],[i.x,0,i.z],1200);}
 else if(!pg){const off=camera.position.clone().sub(controls.target);fly([w.x+off.x,camera.position.y,w.y+off.z],[w.x,0,w.y],1000);}});
root.querySelector('#mm-fold').addEventListener('click',e=>{const open=miniBox.classList.toggle('folded');e.currentTarget.textContent=open?'+':'–';e.currentTarget.setAttribute('aria-expanded',String(!open));});
// ---------- loop ----------
function resize(){const w=canvasWrap.clientWidth,h=canvasWrap.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(mobile()&&!resize.done){controls.target.set(150,0,10);camera.position.set(-40,600,560);resize.done=true;}needs=true;}
new ResizeObserver(resize).observe(canvasWrap);resize();
const tmp=new THREE.Vector3();
function frame(t){requestAnimationFrame(frame);if(!visible)return;stepFx(t);lastT=t;if(anim){anim(t);needs=true;}const moved=controls.update();if(!moved&&!needs)return;needs=false;
 renderer.render(scene,camera);updMini();
 const w=canvasWrap.clientWidth,h=canvasWrap.clientHeight;const headH=0;
 for(const l of labels){tmp.copy(l.v).project(camera);const sy=(-tmp.y*.5+.5)*h;const on=tmp.z<1&&Math.abs(tmp.x)<1.1&&Math.abs(tmp.y)<1.1&&!(mobile()&&sy<headH+12);l.el.style.display=on?'':'none';if(on)l.el.style.transform=`translate(${(tmp.x*.5+.5)*w}px,${(-tmp.y*.5+.5)*h}px)`;}
 if(cardAnchor&&!card.hidden&&!mobile()){tmp.copy(cardAnchor).project(camera);card.style.left=Math.min(w-260,Math.max(10,(tmp.x*.5+.5)*w+24))+'px';card.style.top=Math.min(h-230,Math.max(70,(-tmp.y*.5+.5)*h-90))+'px';}}
controls.addEventListener('change',()=>{needs=true;});
new IntersectionObserver(e=>{visible=e[0].isIntersecting;needs=true;},{rootMargin:'200px'}).observe(root);
requestAnimationFrame(frame);
applyFilters();updMini();if(mobile()){miniBox.classList.add('folded');root.querySelector('#mm-fold').textContent='+';}root.classList.add('ready');
const tbtn=root.querySelector('#m3-touch');tbtn.addEventListener('click',()=>{const on=!root.classList.contains('touch-on');root.classList.toggle('touch-on',on);tbtn.textContent=on?'✓ Готово — листать страницу':'☝︎ Покрутить модель';});
window.vuolie3d={renderer,scene,camera,controls,showStop,fly};
}
