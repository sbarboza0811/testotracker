import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Open Anatomy 3D, male, licensed CC BY 4.0.
// Sources / credit: https://github.com/MervinR07/open-anatomy-3d/blob/main/ATTRIBUTION.md
const MODEL_URL='https://cdn.jsdelivr.net/npm/open-anatomy-3d@0.1.0/models/anatomy-male.glb';
const mount=document.getElementById('stage3d');
const host=document.getElementById('hotspots');
const fallback=document.getElementById('viewer-fallback');
const loading=document.getElementById('model-loading');
const app=window.BodyMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(37,1,.05,100);
let renderer,controls,skinMeshes=[],loaded=false;
const markerRecords=[],hitTargets=[];
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const front=new THREE.Vector3(0,0,-1),back=new THREE.Vector3(0,0,1);
let pointerStart,selected=app?.getSelection().region||'olheiras';
let currentView=app?.getSelection().view||'body';
const markers=[
 {id:'olheiras',label:'Olheiras',x:-.095,y:.878,views:['head','body']},
 {id:'visao',label:'Visão',x:.092,y:.883,views:['head']},
 {id:'nariz',label:'Nariz',x:0,y:.847,views:['head','body']},
 {id:'orelhas',label:'Orelhas',x:.275,y:.88,views:['head']},
 {id:'dentes',label:'Dentes',x:0,y:.813,views:['head']},
 {id:'papada',label:'Papada',x:0,y:.783,views:['head']},
 {id:'pele',label:'Pele',x:.16,y:.841,views:['head']},
 {id:'cabelo',label:'Cabelo',x:0,y:.975,views:['head']},
 {id:'pescoco',label:'Pescoço',x:0,y:.755,views:['head']},
 {id:'peitoral',label:'Peitoral',x:.24,y:.685,views:['body']},
 {id:'bracos',label:'Braços',x:.64,y:.612,views:['body']},
 {id:'abdomen',label:'Abdômen',x:0,y:.532,views:['body']},
 {id:'pernas',label:'Pernas',x:.24,y:.238,views:['body']},
 {id:'ombros',label:'Ombros',x:-.47,y:.745,views:['body','back']},
 {id:'costas',label:'Costas',x:0,y:.69,views:['back'],back:true}
];
scene.add(new THREE.HemisphereLight(0xffffff,0x8da79c,2.25));
const key=new THREE.DirectionalLight(0xfff6ee,2.2);key.position.set(-3,6,6);scene.add(key);
const fill=new THREE.DirectionalLight(0xe0f4ed,1.15);fill.position.set(4,3,-3);scene.add(fill);
const hairline=new THREE.DirectionalLight(0xffffff,.8);hairline.position.set(0,2,-6);scene.add(hairline);
function makePin(p,point){
 const el=document.createElement('button');
 el.type='button';el.className='marker';el.title=p.label;el.dataset.region=p.id;
 el.setAttribute('aria-label','Ver objetivos de '+p.label);
 const dot=document.createElement('span');dot.className='marker-dot';
 el.append(dot,document.createTextNode(p.label));
 el.addEventListener('click',()=>app?.selectRegion(p.id,false));host.appendChild(el);
 const hit=new THREE.Mesh(new THREE.SphereGeometry(.14,12,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
 hit.position.copy(point);
 hit.userData.region=p.id;
 scene.add(hit);hitTargets.push(hit);
 markerRecords.push({def:p,el,at:point,normal:new THREE.Vector3(0,0,p.back?-1:1)});
}
// The original anatomical male mesh is nude. These fitted opaque shorts and
// a world-space skin-masking zone keep genital anatomy out of public UI views.
function addPrivacyShorts(box){
 const height=box.max.y-box.min.y;
 const y=frac=>box.min.y+height*frac;
 const cloth=new THREE.MeshStandardMaterial({color:0x3d5c56,roughness:.96,metalness:0,side:THREE.DoubleSide});
 const edge=new THREE.MeshStandardMaterial({color:0x263f3b,roughness:.99,metalness:0});
 function sleeve(top,bottom,rTop,rBottom,x,zScale,mat){
  const geo=new THREE.CylinderGeometry(rTop,rBottom,top-bottom,64,2,false);
  geo.scale(1,1,zScale);
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(x,(top+bottom)/2,0);
  mesh.castShadow=true;mesh.receiveShadow=true;
  scene.add(mesh);
  return mesh;
 }
 const upper=y(.505),join=y(.394),hem=y(.292);
 // Waist/hips plus individual short legs, enclosing the original mesh from
 // all directions (front, side and back), without exposing the groin.
 sleeve(upper,join,.55,.65,0,.91,cloth);
 sleeve(join+.07,hem,.365,.34,-.31,1.22,cloth);
 sleeve(join+.07,hem,.365,.34,.31,1.22,cloth);
 sleeve(upper+.027,upper-.04,.553,.55,0,.94,edge);
 sleeve(hem+.035,hem-.015,.343,.34,-.31,1.23,edge);
 sleeve(hem+.035,hem-.015,.343,.34,.31,1.23,edge);
}
async function loadHuman(){
 const loader=new GLTFLoader();
 loader.setMeshoptDecoder(MeshoptDecoder);
 const gltf=await loader.loadAsync(MODEL_URL);
 const body=gltf.scene;
 const skin=body.getObjectByName('skin');
 if(!skin)throw new Error('Modelo sem superfície corporal');
 for(const name of ['skeleton','muscles','organs','vessels','nerves','joints']){
  const group=body.getObjectByName(name);if(group)group.visible=false;
 }
 const clay=new THREE.MeshStandardMaterial({
  color:0xdac9bc,metalness:0,roughness:.88,side:THREE.FrontSide
 });
 // Also mask the skin inside the shorts so anatomy cannot protrude when
 // the user rotates the body or zooms. In world units, the body is ~4.7 tall.
 clay.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPrivacyWorld;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPrivacyWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPrivacyWorld;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vPrivacyWorld.y>-1.12 && vPrivacyWorld.y<0.06 && abs(vPrivacyWorld.x)<0.82 && abs(vPrivacyWorld.z)<1.2) discard;');
 };
 clay.customProgramCacheKey=()=> 'intimate-area-privacy-v1';
 skin.traverse(obj=>{
  if(obj.isMesh){
   obj.material=clay;
   obj.castShadow=false;obj.receiveShadow=false;
   skinMeshes.push(obj);
  }
 });
 if(!skinMeshes.length)throw new Error('Modelo sem malha de superfície');
 const natural=new THREE.Box3().setFromObject(body);
 const dims=natural.getSize(new THREE.Vector3());
 const center=natural.getCenter(new THREE.Vector3());
 if(dims.y<.7||dims.y>3)throw new Error('Escala do modelo inválida');
 const scale=4.7/dims.y;
 body.scale.setScalar(scale);
 body.position.set(-center.x*scale,-natural.min.y*scale-2.35,-center.z*scale);
 scene.add(body);
 body.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(body);
 const worldHeight=box.max.y-box.min.y;
 addPrivacyShorts(box);
 for(const p of markers){
  const y=box.min.y+worldHeight*p.y;
  const x=p.x;
  const origin=new THREE.Vector3(x,y,p.back?-5:5);
  raycaster.set(origin,p.back?back:front);
  const hits=raycaster.intersectObjects(skinMeshes,false);
  let point;
  if(hits.length){
   point=hits[0].point.clone();
   point.z+=p.back?-.045:.045;
  }else{
   point=new THREE.Vector3(x,y,p.back?-.13:.25);
  }
  makePin(p,point);
 }
 loaded=true;window.BodyMap3DReady=true;
 host.hidden=false;fallback.hidden=true;if(loading)loading.hidden=true;
}
function cameraView(view){
 currentView=view;
 if(view==='head'){
  camera.position.set(.07,1.79,2.68);
  controls.target.set(0,1.75,0);
  controls.minDistance=1.35;controls.maxDistance=6;
 }else{
  camera.position.set(.18,.05,view==='back'?-8.4:8.4);
  controls.target.set(0,0,0);
  controls.minDistance=3.3;controls.maxDistance=15;
 }
 controls.update();
}
function resize(){
 if(!renderer)return;
 const w=Math.max(100,mount.clientWidth),h=Math.max(100,mount.clientHeight);
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
function layoutPins(){
 if(!loaded)return;
 const w=mount.clientWidth,h=mount.clientHeight;
 const dir=new THREE.Vector3();
 for(const m of markerRecords){
  if(!m.def.views.includes(currentView)){m.el.hidden=true;continue}
  dir.copy(camera.position).sub(m.at).normalize();
  if(m.normal.dot(dir)<.13){m.el.hidden=true;continue}
  const p=m.at.clone().project(camera);
  if(p.z<-1||p.z>1||Math.abs(p.x)>1.02||Math.abs(p.y)>1.02){m.el.hidden=true;continue}
  m.el.hidden=false;
  m.el.style.left=((p.x+1)*w/2)+'px';
  m.el.style.top=((1-p.y)*h/2)+'px';
  m.el.classList.toggle('chosen',m.def.id===selected);
  m.el.style.opacity=app?.hasGoal(m.def.id)?'1':'.76';
 }
}
function chooseFromClick(e){
 if(!loaded||!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>7)return;
 const rect=renderer.domElement.getBoundingClientRect();
 pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
 raycaster.setFromCamera(pointer,camera);
 const targets=hitTargets.filter(m=>markers.find(d=>d.id===m.userData.region)?.views.includes(currentView));
 const hit=raycaster.intersectObjects(targets,false);
 if(hit.length){app?.selectRegion(hit[0].object.userData.region,false);return}
 // Touching anatomical skin also selects its closest marked region.
 const surface=raycaster.intersectObjects(skinMeshes,false);
 if(!surface.length)return;
 let best,dist=Infinity;
 for(const m of markerRecords){
  if(!m.def.views.includes(currentView))continue;
  const targetDistance=surface[0].point.distanceTo(m.at);
  if(targetDistance<dist){dist=targetDistance;best=m;}
 }
 if(best&&dist<(currentView==='head'?.45:.67))app?.selectRegion(best.def.id,false);
}
function showError(error){
 console.warn('Falha ao carregar anatomia:',error);
 if(loading)loading.hidden=true;
 fallback.hidden=false;host.hidden=true;
 const hint=fallback.querySelector('p');
 if(hint)hint.textContent='Não foi possível carregar o modelo agora. Confira a internet ou selecione a área na lista.';
}
function start(){
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.30;
  mount.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Corpo humano tridimensional com regiões selecionáveis');
  controls=new OrbitControls(camera,renderer.domElement);
  controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.07;
  controls.minPolarAngle=.20;controls.maxPolarAngle=Math.PI-.20;
  controls.rotateSpeed=.65;
  cameraView(currentView);resize();
  renderer.domElement.addEventListener('pointerdown',e=>pointerStart={x:e.clientX,y:e.clientY});
  renderer.domElement.addEventListener('pointerup',chooseFromClick);
  window.addEventListener('mapa:view',e=>cameraView(e.detail.view));
  window.addEventListener('mapa:select',e=>{selected=e.detail.region;layoutPins()});
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(mount);
  else window.addEventListener('resize',resize);
  function frame(){requestAnimationFrame(frame);controls.update();renderer.render(scene,camera);layoutPins()}
  frame();
  loadHuman().catch(showError);
 }catch(e){showError(e)}
}
start();