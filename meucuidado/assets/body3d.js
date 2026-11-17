import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

/**
 * Mapa do Corpo 4.0
 * Professional licensed avatar based on Microsoft Rocketbox (MIT), assembled
 * by Avatar Studio (MIT). No nude mesh, clothing hacks, or anatomy replacement.
 * Native Android bundles this entire GLB: no network required in the APK.
 */
const SOURCE_REV='2fd9ec82fbe1613d40ae38aadcca3f410725f740';
const FILENAME='ethan_casual.glb';
const SOURCES=[
 'https://cdn.jsdelivr.net/gh/memoriesrohit/avatar-studio@'+SOURCE_REV+'/models/'+FILENAME,
 'https://raw.githubusercontent.com/memoriesrohit/avatar-studio/'+SOURCE_REV+'/models/'+FILENAME
];
const IS_NATIVE=!!(window.Capacitor?.isNativePlatform?.());
const mount=document.getElementById('stage3d');
const hotspotLayer=document.getElementById('hotspots');
const loaderPanel=document.getElementById('model-loading');
const fallback=document.getElementById('viewer-fallback');
const bodyMap=window.BodyMap;
const scene=new THREE.Scene();
const clock=new THREE.Clock();
const camera=new THREE.PerspectiveCamera(35,1,.05,120);
const loader=new GLTFLoader();
let renderer,controls,avatar,mixer,renderReady=false,activeView=bodyMap?.getSelection().view||'body',activeRegion=bodyMap?.getSelection().region||'olheiras',pressed,visibleMeshes=[];
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const targets=[],markers=[];
scene.add(new THREE.HemisphereLight(0xffffff,0xc7d4cf,1.85));
const keyLight=new THREE.DirectionalLight(0xffefdf,2.3);keyLight.position.set(-3,6,7);scene.add(keyLight);
const fill=new THREE.DirectionalLight(0xc9f7e5,1.1);fill.position.set(4,2,-3);scene.add(fill);
const backLight=new THREE.DirectionalLight(0xffffff,.85);backLight.position.set(0,4,-7);scene.add(backLight);

const locations=[
 ['olheiras','Olheiras',-.11,.855,['head']],
 ['visao','Visão',.11,.87,['head']],
 ['nariz','Nariz',0,.82,['head','body']],
 ['orelhas','Orelhas',.28,.86,['head']],
 ['dentes','Dentes',0,.796,['head']],
 ['papada','Papada',0,.765,['head']],
 ['pele','Pele',.21,.83,['head']],
 ['cabelo','Cabelo',0,.98,['head']],
 ['pescoco','Pescoço',0,.735,['head']],
 ['peitoral','Peitoral',.16,.66,['body']],
 ['abdomen','Abdômen',0,.50,['body']],
 ['bracos','Braços',.54,.60,['body']],
 ['ombros','Ombros',-.36,.70,['body','back']],
 ['pernas','Pernas',.18,.23,['body']],
 ['costas','Costas',0,.67,['back'],true]
];

function setLoading(text,detail){
 if(loaderPanel){
  const main=loaderPanel.querySelector('strong'),sub=loaderPanel.querySelector('span');
  if(main)main.textContent=text;
  if(sub)sub.textContent=detail||'';
 }
}
function meshLabel(m){
 return (m.name&&!/^mesh_\d|_\d+$/.test(m.name)?m.name:m.parent?.name||m.name)||'';
}
const allOutfits=new Set(['Outfit_original','Skin_original','Outfit_formal','Skin_formal','Top_shirt','Skin_shirt','Top_tee','Skin_tee','Trousers','Shoes']);
function prepareModel(gltf){
 const obj=gltf.scene;
 let count=0;
 obj.traverse(m=>{
  if(!m.isMesh)return;
  const label=meshLabel(m);
  if(label==='HairTips'){m.visible=false;return;}
  if(allOutfits.has(label))m.visible=(label==='Outfit_original'||label==='Skin_original');
  // The Rocketbox neutral original outfit is already clothed. Hide unused
  // full-body meshes to ensure that no undressed geometry can peek through.
  if(label==='Body'&&obj.getObjectByName('Skin_original'))m.visible=false;
  m.frustumCulled=false;
  const isArray=Array.isArray(m.material);
  const materials=isArray?m.material:[m.material];
  m.material=materials.map(old=>{
   const material=old.clone();
   if(/^Hair/.test(label)){
    material.transparent=false;
    material.alphaTest=.45;
    material.side=THREE.DoubleSide;
    material.depthWrite=true;
   }else if(/^(Eyebrows|Eyelashes)/.test(label)){
    material.transparent=true;
    material.depthWrite=false;
    material.alphaTest=.025;
    material.side=THREE.DoubleSide;
   }else if(/^Eyes/.test(label)){
    material.alphaTest=.38;
    material.transparent=false;
   }else{
    material.transparent=false;
    material.alphaTest=0;
    material.depthWrite=true;
   }
   material.needsUpdate=true;
   return material;
  });
  if(!isArray)m.material=m.material[0];
  if(m.visible){visibleMeshes.push(m);count++}
 });
 if(count<3)throw Error('O personagem está incompleto');
 const initialBounds=new THREE.Box3().setFromObject(obj),size=initialBounds.getSize(new THREE.Vector3());
 if(!isFinite(size.y)||size.y<.5)throw Error('Escala do personagem inválida');
 // Normalized height for consistent navigation of all views.
 const scale=4.4/size.y;
 const center=initialBounds.getCenter(new THREE.Vector3());
 obj.scale.setScalar(scale);
 obj.position.set(-center.x*scale,-initialBounds.min.y*scale-2.2,-center.z*scale);
 obj.updateMatrixWorld(true);
 // Resting pose if animation exists.
 if(gltf.animations?.length){
  mixer=new THREE.AnimationMixer(obj);
  const idle=gltf.animations.find(c=>/idle/i.test(c.name));
  if(idle)mixer.clipAction(idle).play();
 }
 scene.add(obj);
 avatar=obj;
 const b=new THREE.Box3().setFromObject(obj);
 const h=b.max.y-b.min.y;
 for(const [id,label,rx,fy,views,isBack] of locations){
  const y=b.min.y+h*fy,x=rx*1.3,reverse=!!isBack;
  const from=new THREE.Vector3(x,y,reverse?-5:5);
  raycaster.set(from,new THREE.Vector3(0,0,reverse?1:-1));
  const hits=raycaster.intersectObjects(visibleMeshes,true);
  const point=hits[0]?.point.clone()||new THREE.Vector3(x,y,reverse?-.28:.3);
  point.z+=reverse?-.055:.055;
  addMarker({id,label,views,isBack:reverse,point});
 }
}
function addMarker(spec){
 const el=document.createElement('button');el.type='button';el.className='marker';el.setAttribute('aria-label','Abrir região: '+spec.label);
 const dot=document.createElement('span');dot.className='marker-dot';el.append(dot,document.createTextNode(spec.label));
 hotspotLayer.appendChild(el);
 el.addEventListener('click',()=>bodyMap?.selectRegion(spec.id,false));
 const target=new THREE.Mesh(new THREE.SphereGeometry(.15,12,8),new THREE.MeshBasicMaterial({visible:false}));
 target.position.copy(spec.point);target.userData.region=spec.id;scene.add(target);targets.push(target);
 markers.push({...spec,el,normal:new THREE.Vector3(0,0,spec.isBack?-1:1)});
}
function setCamera(view){
 activeView=view;
 if(view==='head'){
  camera.position.set(.08,1.70,2.65);
  controls.target.set(0,1.62,0);
  controls.minDistance=1.30;controls.maxDistance=7.4;
 }else{
  camera.position.set(.14,.03,view==='back'?-8.3:8.3);
  controls.target.set(0,0,0);
  controls.minDistance=3;controls.maxDistance=15;
 }
 controls.update();
}
function resize(){
 if(!renderer)return;
 const w=Math.max(mount.clientWidth,120),h=Math.max(mount.clientHeight,120);
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
function updateMarkers(){
 if(!renderReady)return;
 const w=mount.clientWidth,h=mount.clientHeight;
 const dir=new THREE.Vector3();
 for(const m of markers){
  if(!m.views.includes(activeView)){m.el.hidden=true;continue}
  dir.copy(camera.position).sub(m.point).normalize();
  if(dir.dot(m.normal)<.14){m.el.hidden=true;continue}
  const p=m.point.clone().project(camera);
  if(p.z<-1||p.z>1||Math.abs(p.x)>1.02||Math.abs(p.y)>1.03){m.el.hidden=true;continue}
  m.el.hidden=false;
  m.el.style.left=((p.x+1)*w/2)+'px';
  m.el.style.top=((1-p.y)*h/2)+'px';
  m.el.classList.toggle('chosen',m.id===activeRegion);
  m.el.style.opacity=bodyMap?.hasGoal(m.id)?'1':'.73';
 }
}
function pickOnAvatar(e){
 if(!pressed||Math.hypot(pressed.x-e.clientX,pressed.y-e.clientY)>8||!renderReady)return;
 const bounds=renderer.domElement.getBoundingClientRect();
 pointer.set((e.clientX-bounds.left)*2/bounds.width-1,1-(e.clientY-bounds.top)*2/bounds.height);
 raycaster.setFromCamera(pointer,camera);
 const available=targets.filter(obj=>markers.some(m=>m.id===obj.userData.region&&m.views.includes(activeView)));
 const hits=raycaster.intersectObjects(available,false);
 if(hits.length)bodyMap?.selectRegion(hits[0].object.userData.region,false);
}
function showFailure(error){
 console.error('Não foi possível exibir o personagem:',error);
 if(loaderPanel)loaderPanel.hidden=true;
 if(fallback){
  fallback.hidden=false;
  const txt=fallback.querySelector('p');
  if(txt)txt.textContent='O avatar não pôde ser carregado. Os objetivos e checklists continuam disponíveis.';
 }
 hotspotLayer.hidden=true;
 const retry=document.getElementById('retry-3d');if(retry)retry.hidden=false;
}
async function loadCharacter(){
 const urls=IS_NATIVE?['./models/avatar.glb']:SOURCES;
 let lastError;
 for(const url of urls){
  try{
   setLoading('Preparando o avatar','Carregando modelo 3D detalhado');
   const gltf=await loader.loadAsync(url,(event)=>{
    if(event.total) setLoading('Carregando avatar 3D',Math.floor(100*event.loaded/event.total)+'%');
   });
   prepareModel(gltf);
   renderReady=true;window.BodyMap3DReady=true;
   if(loaderPanel)loaderPanel.hidden=true;
   if(fallback)fallback.hidden=true;
   hotspotLayer.hidden=false;
   return;
  }catch(err){
   lastError=err;
   console.warn('Fonte de avatar indisponível:',url,err);
  }
 }
 throw lastError||new Error('Avatar indisponível');
}
function start(){
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
  mount.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Avatar 3D de corpo inteiro com roupas');
  controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.08;controls.enablePan=false;
  controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI-.15;
  controls.rotateSpeed=.6;
  setCamera(activeView);resize();
  renderer.domElement.addEventListener('pointerdown',e=>pressed={x:e.clientX,y:e.clientY});
  renderer.domElement.addEventListener('pointerup',pickOnAvatar);
  window.addEventListener('mapa:view',e=>setCamera(e.detail.view));
  window.addEventListener('mapa:select',e=>{activeRegion=e.detail.region;updateMarkers()});
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(mount);
  else window.addEventListener('resize',resize);
  let previous=performance.now();
  function frame(now){
   requestAnimationFrame(frame);
   const dt=Math.min((now-previous)/1000,.04);previous=now;
   if(mixer)mixer.update(dt);
   controls.update();
   renderer.render(scene,camera);
   updateMarkers();
  }
  requestAnimationFrame(frame);
  loadCharacter().catch(showFailure);
 }catch(err){showFailure(err)}
}
start();