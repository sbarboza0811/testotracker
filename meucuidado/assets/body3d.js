import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const viewer=document.getElementById('viewer');
const mount=document.getElementById('stage3d');
const host=document.getElementById('hotspots');
const fallback=document.getElementById('viewer-fallback');
const app=window.BodyMap;
const scene=new THREE.Scene();
const root=new THREE.Group();
scene.add(root);
const camera=new THREE.PerspectiveCamera(37,1,.05,100);
let renderer,controls;
const markers=[];
let selected=app?.getSelection().region||'olheiras';
let currentView=app?.getSelection().view||'body';
const sphereGeometry=new THREE.SphereGeometry(1,36,24);
const skin=new THREE.MeshStandardMaterial({color:0xddbda9,roughness:.84,metalness:0});
const skinShadow=new THREE.MeshStandardMaterial({color:0xcba38f,roughness:.91});
const skinLight=new THREE.MeshStandardMaterial({color:0xe8caba,roughness:.83});
const eyes=new THREE.MeshStandardMaterial({color:0xf0e9dd,roughness:.48});
const iris=new THREE.MeshStandardMaterial({color:0x4b625a,roughness:.32});
const pupil=new THREE.MeshStandardMaterial({color:0x25322f,roughness:.26});
const hair=new THREE.MeshStandardMaterial({color:0x363b37,roughness:.98});
const brows=new THREE.MeshStandardMaterial({color:0x53443e,roughness:.93});
const lips=new THREE.MeshStandardMaterial({color:0xb87c76,roughness:.92});
const shorts=new THREE.MeshStandardMaterial({color:0x6c817c,roughness:.93});
const joints=new THREE.MeshStandardMaterial({color:0xd9b49e,roughness:.9});
function oval(x,y,z,sx,sy,sz,material=skin,parent=root){
 const m=new THREE.Mesh(sphereGeometry,material);
 m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function tapered(a,b,radiusTop,radiusBottom,mat=skin){
 const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p),len=delta.length();
 const geo=new THREE.CylinderGeometry(radiusBottom,radiusTop,len,26,1,false);
 const mesh=new THREE.Mesh(geo,mat);
 mesh.position.copy(p).add(q).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
 mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
}
function line(points,mat,thick=.017){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const m=new THREE.Mesh(new THREE.TubeGeometry(curve,18,thick,8,false),mat);
 root.add(m);return m;
}
function createMannequin(){
 // Feet, legs and subtle joints
 oval(-.30,-2.29,.15,.20,.12,.43,skin);
 oval(.30,-2.29,.15,.20,.12,.43,skin);
 tapered([-.30,-1.44,.015],[-.30,-2.20,.035],.22,.16,skin);
 tapered([.30,-1.44,.015],[.30,-2.20,.035],.22,.16,skin);
 oval(-.30,-1.44,.03,.23,.26,.23,skin);
 oval(.30,-1.44,.03,.23,.26,.23,skin);
 tapered([-.30,-.60,0],[-.30,-1.42,.015],.34,.22,skin);
 tapered([.30,-.60,0],[.30,-1.42,.015],.34,.22,skin);
 oval(-.32,-.75,0,.36,.31,.33,skin);
 oval(.32,-.75,0,.36,.31,.33,skin);
 // Hips covered by simple fabric
 oval(0,-.62,0,.68,.42,.37,shorts);
 // Main torso, sculpted volume
 oval(0,.15,0,.67,.90,.38,skin);
 oval(0,-.18,.03,.58,.44,.37,skin);
 oval(-.38,.51,.06,.43,.36,.38,skinLight);
 oval(.38,.51,.06,.43,.36,.38,skinLight);
 oval(0,.65,.005,.50,.26,.32,skin);
 // Collarbone and abdomen hints
 line([[-.52,.81,.30],[-.26,.73,.35],[0,.70,.37]],skinShadow,.01);
 line([[.52,.81,.30],[.26,.73,.35],[0,.70,.37]],skinShadow,.01);
 line([[0,.25,.39],[0,-.04,.405],[0,-.25,.37]],skinShadow,.009);
 oval(0,-.29,.382,.038,.018,.021,skinShadow);
 // Shoulders and arms
 oval(-.72,.62,.0,.31,.31,.32,joints);
 oval(.72,.62,.0,.31,.31,.32,joints);
 tapered([-.76,.56,0],[-1.02,-.12,.01],.28,.20,skin);
 tapered([.76,.56,0],[1.02,-.12,.01],.28,.20,skin);
 oval(-1.02,-.12,.01,.19,.22,.20,skin);
 oval(1.02,-.12,.01,.19,.22,.20,skin);
 tapered([-1.02,-.17,.01],[-1.10,-.91,.16],.19,.13,skin);
 tapered([1.02,-.17,.01],[1.10,-.91,.16],.19,.13,skin);
 oval(-1.12,-1.08,.16,.15,.24,.12,skin);
 oval(1.12,-1.08,.16,.15,.24,.12,skin);
 // Neck
 oval(0,1.05,0,.235,.37,.24,skinShadow);
 oval(0,1.14,.06,.22,.29,.22,skin);
 // Head and facial planes
 oval(0,1.77,0,.51,.65,.43,skin);
 oval(0,1.60,.085,.45,.42,.40,skinLight);
 oval(-.33,1.67,.20,.20,.26,.22,skin);
 oval(.33,1.67,.20,.20,.26,.22,skin);
 // Ears with internal shadow
 oval(-.515,1.74,.01,.105,.19,.115,skin);
 oval(.515,1.74,.01,.105,.19,.115,skin);
 oval(-.569,1.745,.074,.025,.095,.055,skinShadow);
 oval(.569,1.745,.074,.025,.095,.055,skinShadow);
 // Hair with gentle temples and crown
 oval(0,2.265,-.046,.50,.225,.41,hair);
 oval(-.34,2.18,.057,.17,.21,.29,hair);
 oval(.34,2.18,.057,.17,.21,.29,hair);
 oval(0,2.307,.27,.35,.12,.14,hair);
 // Eyes, lids and eyebrows
 for(const sign of [-1,1]){
  const x=sign*.205;
  oval(x,1.855,.413,.105,.053,.039,eyes);
  oval(x,1.858,.449,.039,.038,.018,iris);
  oval(x,1.858,.463,.021,.026,.012,pupil);
  line([[x-sign*.10,1.966,.425],[x,1.989,.44],[x+sign*.11,1.962,.417]],brows,.020);
  line([[x-sign*.098,1.872,.445],[x,1.880,.458],[x+sign*.095,1.871,.441]],skinShadow,.012);
 }
 // Nose bridge and tip
 oval(0,1.745,.435,.091,.205,.13,skinLight);
 oval(0,1.645,.545,.105,.068,.088,skin);
 oval(-.075,1.624,.537,.049,.035,.044,skinShadow);
 oval(.075,1.624,.537,.049,.035,.044,skinShadow);
 // Lips and chin
 line([[-.125,1.482,.447],[-.048,1.494,.464],[0,1.488,.466],[.048,1.494,.464],[.125,1.482,.447]],lips,.019);
 line([[-.10,1.465,.442],[0,1.455,.473],[.10,1.465,.442]],lips,.014);
 oval(0,1.357,.375,.22,.12,.18,skinLight);
 // Grounding pedestal below feet
 const floor=new THREE.Mesh(new THREE.CylinderGeometry(1.40,1.43,.075,64),new THREE.MeshStandardMaterial({color:0xe5efe8,roughness:1,metalness:0}));
 floor.position.y=-2.49;floor.receiveShadow=true;root.add(floor);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(1.38,.013,8,88),new THREE.MeshBasicMaterial({color:0xa9cfb5}));
 rim.rotation.x=Math.PI/2;rim.position.y=-2.449;root.add(rim);
}
createMannequin();
scene.add(new THREE.HemisphereLight(0xffffff,0x8daaa2,2.0));
const key=new THREE.DirectionalLight(0xffffff,2.7);key.position.set(-3,6,8);scene.add(key);
const fill=new THREE.DirectionalLight(0xb5f2d5,1.1);fill.position.set(4,2,-4);scene.add(fill);
const rim=new THREE.DirectionalLight(0xf7ead9,1.1);rim.position.set(0,4,-5);scene.add(rim);

const pointDefs=[
 {id:'olheiras',label:'Olheiras',pos:[-.215,1.76,.45],normal:[0,0,1],views:['head','body']},
 {id:'visao',label:'Visão',pos:[.216,1.862,.49],normal:[0,0,1],views:['head']},
 {id:'nariz',label:'Nariz',pos:[0,1.675,.63],normal:[0,0,1],views:['head','body']},
 {id:'orelhas',label:'Orelhas',pos:[.53,1.75,.10],normal:[.24,0,.90],views:['head']},
 {id:'dentes',label:'Dentes',pos:[0,1.49,.48],normal:[0,0,1],views:['head']},
 {id:'papada',label:'Papada',pos:[0,1.30,.42],normal:[0,0,1],views:['head']},
 {id:'pele',label:'Pele',pos:[.36,1.60,.38],normal:[.3,0,.8],views:['head']},
 {id:'cabelo',label:'Cabelo',pos:[0,2.37,.22],normal:[0,.5,1],views:['head']},
 {id:'pescoco',label:'Pescoço',pos:[0,1.12,.27],normal:[0,0,1],views:['head']},
 {id:'peitoral',label:'Peitoral',pos:[.31,.48,.42],normal:[0,0,1],views:['body']},
 {id:'bracos',label:'Braços',pos:[1.02,-.23,.23],normal:[.2,0,.9],views:['body']},
 {id:'abdomen',label:'Abdômen',pos:[0,-.25,.43],normal:[0,0,1],views:['body']},
 {id:'pernas',label:'Pernas',pos:[.33,-1.60,.24],normal:[0,0,1],views:['body']},
 {id:'ombros',label:'Ombros',pos:[-.76,.63,.24],normal:[-.2,0,.8],views:['body','back']},
 {id:'costas',label:'Costas',pos:[0,.10,-.43],normal:[0,0,-1],views:['back']}
];
let rayTargets=[];
function setupPoints(){
 pointDefs.forEach(function(p){
  const el=document.createElement('button');el.type='button';el.className='marker';el.title=p.label;el.setAttribute('aria-label','Selecionar '+p.label);el.dataset.region=p.id;
  const dot=document.createElement('span');dot.className='marker-dot';el.append(dot,document.createTextNode(p.label));
  host.appendChild(el);
  el.addEventListener('click',function(){app?.selectRegion(p.id,false)});
  const hit=new THREE.Mesh(new THREE.SphereGeometry(.17,12,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
  hit.position.set(...p.pos);hit.userData.region=p.id;root.add(hit);
  rayTargets.push(hit);markers.push({p,el,at:new THREE.Vector3(...p.pos),n:new THREE.Vector3(...p.normal)});
 });
}
setupPoints();
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let pointerStart;
function onClick3d(e){
 if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>8)return;
 const rect=renderer.domElement.getBoundingClientRect();
 pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
 raycaster.setFromCamera(pointer,camera);
 const hits=raycaster.intersectObjects(rayTargets,false);
 for(const hit of hits){const reg=hit.object.userData.region;const def=pointDefs.find(x=>x.id===reg);if(def?.views.includes(currentView)){app?.selectRegion(reg,false);break;}}
}
function resize(){
 if(!renderer)return;
 const w=Math.max(100,mount.clientWidth),h=Math.max(100,mount.clientHeight);
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
function setCamera(view){
 currentView=view;
 if(view==='head'){camera.position.set(.16,1.83,3.75);controls.target.set(0,1.74,0);controls.minDistance=1.9;controls.maxDistance=6.3;}
 else if(view==='back'){camera.position.set(.2,.1,-8.5);controls.target.set(0,-.05,0);controls.minDistance=4;controls.maxDistance=13;}
 else{camera.position.set(.25,.18,8.4);controls.target.set(0,-.05,0);controls.minDistance=4;controls.maxDistance=13;}
 controls.update();
}
function projectMarkers(){
 const w=mount.clientWidth,h=mount.clientHeight;
 if(!w||!h)return;
 const camDir=new THREE.Vector3();
 markers.forEach(function(m){
  const p=m.p;
  if(!p.views.includes(currentView)){m.el.hidden=true;return;}
  camDir.copy(camera.position).sub(m.at).normalize();
  if(m.n.dot(camDir)<.08){m.el.hidden=true;return;}
  const v=m.at.clone().project(camera);
  if(v.z<-1||v.z>1||Math.abs(v.x)>1.05||Math.abs(v.y)>1.05){m.el.hidden=true;return}
  m.el.hidden=false;m.el.style.left=((v.x+1)*.5*w)+'px';m.el.style.top=((-v.y+1)*.5*h)+'px';
  m.el.classList.toggle('chosen',p.id===selected);
  const has=app?.hasGoal(p.id);
  m.el.style.opacity=has?'1':'.77';
 });
}
function start(){
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.75;
  mount.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Corpo humano 3D interativo');
  controls=new OrbitControls(camera,renderer.domElement);
  controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.065;
  controls.minPolarAngle=.26;controls.maxPolarAngle=2.80;
  controls.rotateSpeed=.70;
  setCamera(currentView);
  renderer.domElement.addEventListener('pointerdown',e=>pointerStart={x:e.clientX,y:e.clientY});
  renderer.domElement.addEventListener('pointerup',onClick3d);
  window.addEventListener('mapa:view',e=>setCamera(e.detail.view));
  window.addEventListener('mapa:select',e=>{selected=e.detail.region;projectMarkers()});
  if('ResizeObserver'in window){new ResizeObserver(resize).observe(mount)}else window.addEventListener('resize',resize);
  resize();fallback.hidden=true;window.BodyMap3DReady=true;
  function frame(){requestAnimationFrame(frame);controls.update();renderer.render(scene,camera);projectMarkers()}
  frame();
 }catch(e){
  console.warn('Modelo 3D não disponível:',e?.message);
  fallback.hidden=false;
  host.hidden=true;
 }
}
start();