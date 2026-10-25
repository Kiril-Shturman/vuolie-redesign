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
let needs=true,visible=false,selId=null,hovId=null;

// ---------- renderer / scene ----------
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile()?1.6:2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
canvasWrap.append(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(38,1,1,8000);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.08;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=60;controls.maxDistance=1700;
controls.target.set(40,0,40);camera.position.set(-330,430,640);
scene.fog=new THREE.Fog(0xcfe0e8,900,2600);

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
// far ground ring so the edge never shows
const far=new THREE.Mesh(new THREE.CircleGeometry(6000,48),new THREE.MeshLambertMaterial({color:0x3f5a33}));far.rotation.x=-Math.PI/2;far.position.y=-1.2;far.receiveShadow=true;scene.add(far);

// ---------- lake Sirkoyarvi (north) + pond ----------
function lake(px,py,rx,ry,seed){const s=new THREE.Shape();const N=64;for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,w=1+.12*Math.sin(a*3+seed)+.07*Math.sin(a*7+seed*2);const [x,z]=W(px+Math.cos(a)*rx*w,py+Math.sin(a)*ry*w);i?s.lineTo(x,-z):s.moveTo(x,-z);}
 const g=new THREE.ShapeGeometry(s);g.rotateX(-Math.PI/2);
 const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x3f7f95,roughness:.15,metalness:.1}));m.position.y=.25;m.receiveShadow=true;scene.add(m);return m;}
lake(1990,-760,620,520,1.3);

// ---------- plots ----------
const plotGroup=new THREE.Group();scene.add(plotGroup);
const MAT={free:new THREE.MeshStandardMaterial({color:0xa7c47a,roughness:.95}),sold:new THREE.MeshStandardMaterial({color:0x6f7d62,roughness:1}),
 fav:new THREE.MeshStandardMaterial({color:0xf0b8b8,roughness:.9}),sel:new THREE.MeshStandardMaterial({color:0xd9a648,roughness:.7,emissive:0x3a2600}),hover:new THREE.MeshStandardMaterial({color:0xeee49a,roughness:.8})};
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
function paint(){for(const m of meshes){const id=m.userData.id,i=info.get(id);m.material=id===selId?MAT.sel:id===hovId?MAT.hover:V.isFav(id)?MAT.fav:i.sold?MAT.sold:MAT.free;}needs=true;}

// ---------- houses (illustrative) ----------
const wallMat=new THREE.MeshStandardMaterial({color:0xd8cdb8,roughness:.9});const roofMat=new THREE.MeshStandardMaterial({color:0x3a3f45,roughness:.7});
const bodyG=new THREE.BoxGeometry(9,5.2,11);bodyG.translate(0,2.6,0);
const roofG=new THREE.CylinderGeometry(.01,7.2,4.2,4,1);roofG.rotateY(Math.PI/4);roofG.scale(1,1,1.22);roofG.translate(0,5.2+2.1,0);
const houseBody=new THREE.InstancedMesh(bodyG,wallMat,V.plots.length),houseRoof=new THREE.InstancedMesh(roofG,roofMat,V.plots.length);
[houseBody,houseRoof].forEach(h=>{h.castShadow=true;h.receiveShadow=true;scene.add(h);});
let houseMode='sold';
function buildHouses(){const d=new THREE.Object3D();let n=0;for(const [id,i] of info){if(houseMode==='none'||(houseMode==='sold'&&!i.sold))continue;
 d.position.set(i.x,.9,i.z);d.rotation.set(0,-i.ang,0);const k=.8+((id*37)%10)/40;d.scale.set(k,k*(id%3?1:1.25),k);d.updateMatrix();houseBody.setMatrixAt(n,d.matrix);houseRoof.setMatrixAt(n,d.matrix);n++;}
 houseBody.count=houseRoof.count=n;houseBody.instanceMatrix.needsUpdate=houseRoof.instanceMatrix.needsUpdate=true;needs=true;}
buildHouses();

// ---------- trees (instanced low-poly), placed by sampling the masterplan image ----------
const crownG=new THREE.IcosahedronGeometry(1,0);crownG.translate(0,1,0);
const spruceG=new THREE.ConeGeometry(1,2.6,7,1);spruceG.translate(0,1.3,0);
const trunkG=new THREE.CylinderGeometry(.18,.24,1,5);trunkG.translate(0,.5,0);
const leafA=new THREE.MeshStandardMaterial({color:0x3f7a35,roughness:.9,flatShading:true}),leafB=new THREE.MeshStandardMaterial({color:0x2a5a2c,roughness:.9,flatShading:true}),trunkM=new THREE.MeshStandardMaterial({color:0x5a4330,roughness:1});
const NT=mobile()?5000:11000;
const trees={crown:new THREE.InstancedMesh(crownG,leafA,NT),spruce:new THREE.InstancedMesh(spruceG,leafB,NT),trunk:new THREE.InstancedMesh(trunkG,trunkM,NT*2)};
Object.values(trees).forEach(t=>{t.castShadow=true;t.receiveShadow=true;t.count=0;scene.add(t);});
// village hull (expanded bbox of plots) to keep trees off plots/streets
let bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;for(const p of V.plots){const c=p.points.split(' ').map(Number);for(let i=0;i<c.length;i+=2){bx0=Math.min(bx0,c[i]);bx1=Math.max(bx1,c[i]);by0=Math.min(by0,c[i+1]);by1=Math.max(by1,c[i+1]);}}
const insidePoly=(x,y,c)=>{let r=false;for(let i=0,j=c.length-2;i<c.length;j=i,i+=2){const xi=c[i],yi=c[i+1],xj=c[j],yj=c[j+1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))r=!r;}return r;};
const polys=V.plots.map(p=>p.points.split(' ').map(Number));
const img=new Image();img.src='assets/masterplan.webp';
img.onload=()=>{const cv=document.createElement('canvas');const sw=920,sh=Math.round(sw*IMGH/IMGW);cv.width=sw;cv.height=sh;const g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,sw,sh);const D=g.getImageData(0,0,sw,sh).data;
 const forestAt=(x,y)=>{if(x<0||y<0||x>=IMGW||y>=IMGH)return null;const i=(Math.floor(y/IMGH*sh)*sw+Math.floor(x/IMGW*sw))*4,r=D[i],gg=D[i+1],b=D[i+2];const lum=(r+gg+b)/3;return gg>r&&gg>b-4&&lum<95;};
 const inLake=(x,y)=>{const dx=(x-1990)/700,dy=(y+760)/600;return dx*dx+dy*dy<1;};
 const nearVillage=(x,y)=>x>bx0-40&&x<bx1+40&&y>by0-40&&y<by1+40&&polys.some(c=>insidePoly(x,y,c));
 const d=new THREE.Object3D();let nc=0,ns=0,nt=0;const R=Math.random;let tries=0;
 while((nc+ns)<NT&&tries<NT*12){tries++;
  // denser near the village, sparser far away
  const rr=Math.pow(R(),.7);const a=R()*Math.PI*2;const x=cx+Math.cos(a)*rr*2600,y=cy+Math.sin(a)*rr*2300;
  const f=forestAt(x,y);if(f===false)continue;if(f===null&&(inLake(x,y)))continue;if(f===null&&R()<.25)continue;if(nearVillage(x,y))continue;
  const [wx,wz]=W(x,y);const h=8+R()*8,isSpruce=R()<.45;
  d.position.set(wx,0,wz);d.rotation.set(0,R()*6.3,0);
  if(isSpruce){d.scale.set(h*.36,h*.72,h*.36);d.position.y=h*.1;d.updateMatrix();trees.spruce.setMatrixAt(ns++,d.matrix);}
  else{d.scale.set(h*.33,h*.36,h*.33);d.position.y=h*.32;d.updateMatrix();trees.crown.setMatrixAt(nc++,d.matrix);}
  d.position.y=0;d.scale.set(1,h*(isSpruce?.14:.34),1);d.updateMatrix();trees.trunk.setMatrixAt(nt++,d.matrix);}
 trees.crown.count=nc;trees.spruce.count=ns;trees.trunk.count=nt;Object.values(trees).forEach(t=>t.instanceMatrix.needsUpdate=true);needs=true;};

// ---------- labels (POIs) ----------
const labels=[];const lblLayer=root.querySelector('.m3-labels');
function label(text,px,py,y=12,cls=''){const el=document.createElement('div');el.className='m3-lbl '+cls;el.innerHTML=text;lblLayer.append(el);const [x,z]=W(px,py);labels.push({el,v:new THREE.Vector3(x,y,z)});}
label('<i></i>Въезд · КПП',2195,1169,14);label('<i></i>Пруд',2304,1953,8);label('<i></i>Озеро Сиркоярви · 500 м',1990,-760,10,'big');

// ---------- sun ----------
const LAT=60.33*Math.PI/180;let day=172,hour=15.5;
function sunPos(){const decl=23.44*Math.PI/180*Math.sin(2*Math.PI*(284+day)/365);const H=(hour-13.0)*15*Math.PI/180; // solar noon ≈ 13:00 local
 const alt=Math.asin(Math.sin(LAT)*Math.sin(decl)+Math.cos(LAT)*Math.cos(decl)*Math.cos(H));
 let az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(LAT)-Math.tan(decl)*Math.cos(LAT))+Math.PI; return {alt,az};}
const skyDay=new THREE.Color(0xbfd9ea),skyLow=new THREE.Color(0xf2b98a),skyNight=new THREE.Color(0x14202e);
function applySun(){const {alt,az}=sunPos();const R=1400;const ce=Math.cos(Math.max(alt,.02));
 sun.position.set(Math.sin(az)*ce*R,Math.sin(Math.max(alt,.02))*R,-Math.cos(az)*ce*R);sun.target.position.set(0,0,0);
 const k=Math.max(0,Math.min(1,alt/(20*Math.PI/180)));const night=alt<-.05;
 sun.intensity=night?0:0.4+2.2*k;sun.color.setHSL(.09+.04*k,.9-.7*k,.6+.35*k);
 hemi.intensity=night?.18:.35+.45*k;
 const sky=night?skyNight.clone():skyLow.clone().lerp(skyDay,k);scene.background=sky;scene.fog.color.copy(sky);
 const deg=Math.round(alt*180/Math.PI),dirs=['С','СВ','В','ЮВ','Ю','ЮЗ','З','СЗ'];
 root.querySelector('#m3-sun').innerHTML=(deg>0?deg+'°':'—')+' <small>'+(deg>0?dirs[Math.round(((az*180/Math.PI)%360)/45)%8]:'ночь')+'</small>';
 const hh=Math.floor(hour),mm=Math.round((hour-hh)*60);root.querySelector('#m3-time').textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+' · '+({355:'21 дек',80:'21 мар',172:'21 июн'}[day]||'');
 // day length
 const decl=23.44*Math.PI/180*Math.sin(2*Math.PI*(284+day)/365);const c=-Math.tan(LAT)*Math.tan(decl);const dl=c<=-1?24:c>=1?0:2*Math.acos(c)*180/Math.PI/15;
 root.querySelector('#m3-day').innerHTML=Math.floor(dl)+'<small> ч </small>'+Math.round((dl%1)*60)+'<small> мин</small>';
 needs=true;}
const slider=root.querySelector('#m3-hour');slider.addEventListener('input',()=>{hour=+slider.value;applySun();});
root.querySelectorAll('[data-day]').forEach(b=>b.addEventListener('click',()=>{day=+b.dataset.day;root.querySelectorAll('[data-day]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));applySun();}));
applySun();

// ---------- camera views + tour ----------
let anim=null;
function fly(pos,tgt,ms=1600){const p0=camera.position.clone(),t0=controls.target.clone(),p1=new THREE.Vector3(...pos),t1=new THREE.Vector3(...tgt),st=performance.now();anim=t=>{let k=Math.min(1,(t-st)/ms);k=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;camera.position.lerpVectors(p0,p1,k);controls.target.lerpVectors(t0,t1,k);if(k>=1)anim=null;};}
const g=(px,py)=>W(px,py);
const VIEWS={model:()=>fly([-330,430,640],[40,0,40]),top:()=>fly([0,980,40],[0,0,0]),
 gate:()=>{const [x,z]=g(2195,1169);fly([x+90,140,z-150],[x-60,0,z+90]);}};
const STOPS=[
 {t:'Въезд и КПП',d:'Сюда приезжаете по финской брусчатке. Охрана, видеонаблюдение.',go:()=>{const [x,z]=g(2195,1169);fly([x+90,140,z-150],[x-60,0,z+90],2200);}},
 {t:'Главная улица',d:'Улицы шириной 10 м, асфальтовая крошка, освещение.',go:()=>{const [x,z]=g(1500,1250);fly([x+260,110,z+60],[x-220,0,z-10],2200);}},
 {t:'Пруд',d:'Водоём и общественная зона внутри посёлка.',go:()=>{const [x,z]=g(2304,1953);fly([x-170,150,z+170],[x,0,z],2200);}},
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

// ---------- loop ----------
function resize(){const w=canvasWrap.clientWidth,h=canvasWrap.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(mobile()&&!resize.done){controls.target.set(140,0,-60);camera.position.set(-120,820,820);resize.done=true;}needs=true;}
new ResizeObserver(resize).observe(canvasWrap);resize();
const tmp=new THREE.Vector3();
function frame(t){requestAnimationFrame(frame);if(!visible)return;if(anim){anim(t);needs=true;}const moved=controls.update();if(!moved&&!needs)return;needs=false;
 renderer.render(scene,camera);
 const w=canvasWrap.clientWidth,h=canvasWrap.clientHeight;const headH=root.querySelector('.m3-head').offsetHeight+root.querySelector('.m3-head').offsetTop;
 for(const l of labels){tmp.copy(l.v).project(camera);const sy=(-tmp.y*.5+.5)*h;const on=tmp.z<1&&Math.abs(tmp.x)<1.1&&Math.abs(tmp.y)<1.1&&!(mobile()&&sy<headH+12);l.el.style.display=on?'':'none';if(on)l.el.style.transform=`translate(${(tmp.x*.5+.5)*w}px,${(-tmp.y*.5+.5)*h}px)`;}
 if(cardAnchor&&!card.hidden&&!mobile()){tmp.copy(cardAnchor).project(camera);card.style.left=Math.min(w-260,Math.max(10,(tmp.x*.5+.5)*w+24))+'px';card.style.top=Math.min(h-230,Math.max(70,(-tmp.y*.5+.5)*h-90))+'px';}}
controls.addEventListener('change',()=>{needs=true;});
new IntersectionObserver(e=>{visible=e[0].isIntersecting;needs=true;},{rootMargin:'200px'}).observe(root);
requestAnimationFrame(frame);
root.classList.add('ready');
const tbtn=root.querySelector('#m3-touch');tbtn.addEventListener('click',()=>{const on=!root.classList.contains('touch-on');root.classList.toggle('touch-on',on);tbtn.textContent=on?'✓ Готово — листать страницу':'☝︎ Покрутить модель';});
window.vuolie3d={renderer,scene,camera,controls,showStop,fly};
}
