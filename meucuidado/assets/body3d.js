import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

// Model and clothing: MakeHuman CC0, exported by kblood/CharacterCreator.
// Complete credits and stable source in README.md.
const REV='852e48f316b90a0937234886630e4fb4cdfd1f78';
const ASSET_SOURCES=[
 'https://raw.githubusercontent.com/kblood/CharacterCreator/'+REV+'/output/',
 'https://cdn.jsdelivr.net/gh/kblood/CharacterCreator@'+REV+'/output/'
];
const FILE_BYTES={'base_body.glb':7234380,'clothing_tshirt.glb':388104,'clothing_jeans.glb':428704,'clothing_shoes.glb':847684,'hair_short04.glb':1132824};
let loadedBytes=0;
const mount=document.getElementById('stage3d');
const hotspots=document.getElementById('hotspots');
const fallback=document.getElementById('viewer-fallback');
const loading=document.getElementById('model-loading');
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(36,1,.06,100);
const raycaster=new THREE.Raycaster();
const mouse=new THREE.Vector2();
const selectors=[],hitObjects=[],skinSurfaces=[];
let controls=null,renderer=null,ready=false;
let view=window.BodyMap?.getSelection()?.view||'body';
let chosen=window.BodyMap?.getSelection()?.region||'olheiras';
let startPointer=null;
const mks=[
 ['olheiras','Olheiras',-.10,.876,['head','body']],
 ['visao','Visão',.09,.881,['head']],
 ['nariz','Nariz',0,.84,['head','body']],
 ['orelhas','Orelhas',.22,.864,['head']],
 ['dentes','Dentes',0,.808,['head']],
 ['papada','Papada',0,.776,['head']],
 ['pele','Pele',.17,.837,['head']],
 ['cabelo','Cabelo',0,.969,['head']],
 ['pescoco','Pescoço',0,.752,['head']],
 ['peitoral','Peitoral',.20,.681,['body']],
 ['bracos','Braços',.60,.611,['body']],
 ['abdomen','Abdômen',0,.519,['body']],
 ['pernas','Pernas',.22,.227,['body']],
 ['ombros','Ombros',-.40,.733,['body','back']],
 ['costas','Costas',0,.681,['back']]
];
scene.add(new THREE.HemisphereLight(0xffffff,0xa7c4b9,2.1));
const light=new THREE.DirectionalLight(0xfff7ec,2.35);
light.position.set(-3,5,7);scene.add(light);
const side=new THREE.DirectionalLight(0xc5e5d9,1.05);
side.position.set(4,2,-4);scene.add(side);
const rim=new THREE.DirectionalLight(0xffffff,.8);
rim.position.set(0,4,-7);scene.add(rim);

// Use GitHub raw as primary, jsDelivr as fallback. A partially transferred
// file or CDN error returned as HTTP 200 is rejected by validating GLB magic.
async function load(filename){
 const expected=FILE_BYTES[filename]||0;
 const caption=loading?.querySelector('strong');
 const detail=loading?.querySelector('span');
 let lastError=null;
 for(let origin=0;origin<ASSET_SOURCES.length;origin++){
  const controller=new AbortController();
  const deadline=setTimeout(()=>controller.abort(),filename==='base_body.glb'?60000:45000);
  try{
   const response=await fetch(ASSET_SOURCES[origin]+filename,{signal:controller.signal,mode:'cors',cache:'default'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const size=Number(response.headers.get('Content-Length'))||expected;
   const buffers=[];let transferred=0;
   if(caption)caption.textContent='Baixando modelo 3D…';
   if(detail)detail.textContent=filename==='base_body.glb'?'Corpo e rosto':'Roupas e detalhes';
   if(response.body?.getReader){
    const reader=response.body.getReader();
    while(true){
     const {value,done}=await reader.read();
     if(done)break;
     buffers.push(value);transferred+=value.byteLength;
     if(detail&&size)detail.textContent=(filename==='base_body.glb'?'Corpo e rosto':'Roupas e detalhes')+' · '+Math.min(99,Math.round(transferred/size*100))+'%';
    }
   }else{
    const b=await response.arrayBuffer();buffers.push(new Uint8Array(b));transferred=b.byteLength;
   }
   const bytes=new Uint8Array(transferred);let offset=0;
   for(const buffer of buffers){bytes.set(buffer,offset);offset+=buffer.byteLength}
   if(bytes.length<20||new DataView(bytes.buffer).getUint32(0,true)!==0x46546c67)throw Error('Arquivo 3D inválido');
   if(caption)caption.textContent='Preparando personagem…';
   const gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');
   loadedBytes+=transferred;
   clearTimeout(deadline);return gltf;
  }catch(error){
   lastError=error;
   if(detail)detail.textContent=origin===0?'Tentando segunda origem de download…':'Download indisponível';
  }finally{clearTimeout(deadline)}
 }
 throw Error('Falha ao baixar '+filename+': '+(lastError?.message||'rede indisponível'));
}
function mainMesh(group){
 let match;
 group.traverse(o=>{if(!match&&o.isSkinnedMesh&&o.geometry?.attributes?.skinIndex)match=o});
 return match;
}
function remapClothToBase(mesh,body){
 if(!mesh.skeleton||!body.skeleton)throw Error('Arquivo de roupa incompatível com o corpo');
 const byName=new Map(body.skeleton.bones.map((bone,index)=>[bone.name,index]));
 const mapping=mesh.skeleton.bones.map(b=>byName.get(b.name));
 if(mapping.some(i=>i===undefined))throw Error('Os ossos da roupa não correspondem ao modelo');
 const src=mesh.geometry.attributes.skinIndex;
 const arr=src.array;
 for(let i=0;i<arr.length;i++)arr[i]=mapping[arr[i]];
 src.needsUpdate=true;
 mesh.bind(body.skeleton,body.bindMatrix);
}
// Don't render skin covered by clothing. The CCZONE attribute was generated
// for exactly this purpose by the source model project.
function concealCoveredSkin(body){
 const attr=body.geometry.getAttribute('_cczone');
 const idx=body.geometry.getIndex();
 if(!attr||!idx)throw Error('Não foi possível garantir roupa e privacidade');
 const masks=1|2|4|8|32; // Shoes, jeans, hips, T-shirt and underwear region
 const indices=idx.array,zone=attr.array,kept=[];
 for(let i=0;i<indices.length;i+=3){
  const a=indices[i],b=indices[i+1],c=indices[i+2];
  if(((zone[a]&masks)!==0)&&((zone[b]&masks)!==0)&&((zone[c]&masks)!==0))continue;
  kept.push(a,b,c);
 }
 if(kept.length===indices.length||kept.length<150)throw Error('Não foi possível ocultar regiões cobertas');
 body.geometry.setIndex(kept);
 body.geometry.computeBoundingSphere();
}
// Pose and material remain native to the actual clothing assets, never
// synthetic cylinders or an overlay covering an anatomical nude model.
async function buildCharacter(){
 const core=await load('base_body.glb');
 const base=core.scene;
 const body=mainMesh(base);
 if(!body)throw Error('Avatar não disponível');
 const garments=await Promise.all([
  'clothing_tshirt.glb','clothing_jeans.glb','clothing_shoes.glb'
 ].map(name=>load(name)));
 const outfit=[];
 for(const file of garments){
  const pieces=[];
  file.scene.traverse(o=>{if(o.isSkinnedMesh)pieces.push(o)});
  if(!pieces.length)throw Error('Roupa 3D indisponível');
  for(const piece of pieces){
   piece.removeFromParent();
   piece.position.copy(body.position);
   piece.quaternion.copy(body.quaternion);
   piece.scale.copy(body.scale);
   remapClothToBase(piece,body);
   piece.frustumCulled=false;
   outfit.push(piece);
  }
 }
 concealCoveredSkin(body);
 for(const piece of outfit)body.parent.add(piece);

 // Optional pre-made short hair, attached to the same skeleton.
 try{
  const hair=await load('hair_short04.glb');
  const pieces=[];
  hair.scene.traverse(o=>{if(o.isSkinnedMesh)pieces.push(o)});
  for(const piece of pieces){
   piece.removeFromParent();
   piece.position.copy(body.position);
   piece.quaternion.copy(body.quaternion);
   piece.scale.copy(body.scale);
   remapClothToBase(piece,body);
   piece.frustumCulled=false;
   body.parent.add(piece);
  }
 }catch(e){console.info('Cabelo adicional não carregado:',e.message)}

 // All meshes are assembled and the underlying body is masked before
 // the avatar is allowed into the visible scene, preventing any nude frame.
 base.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(base);
 const dimensions=bounds.getSize(new THREE.Vector3());
 if(dimensions.y<.5||dimensions.y>4)throw Error('Dimensão do avatar inválida');
 const center=bounds.getCenter(new THREE.Vector3());
 const scale=4.7/dimensions.y;
 base.scale.multiplyScalar(scale);
 base.position.x-=center.x*scale;
 base.position.z-=center.z*scale;
 base.position.y+=(-bounds.min.y*scale-2.35);
 scene.add(base);
 base.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(base);
 const height=box.max.y-box.min.y;
 skinSurfaces.push(body);

 for(const [id,label,xf,yf,views] of mks){
  const back=id==='costas';
  const y=box.min.y+height*yf;
  const x=xf;
  const p0=new THREE.Vector3(x,y,back?-5:5);
  raycaster.set(p0,back?new THREE.Vector3(0,0,1):new THREE.Vector3(0,0,-1));
  const hits=raycaster.intersectObjects([body],false);
  let at=hits[0]?.point.clone()||new THREE.Vector3(x,y,back?-.25:.23);
  at.z+=back?-.06:.06;
  createHotspot({id,label,views,back,at});
 }
 ready=true;
 window.BodyMap3DReady=true;
 if(loading)loading.hidden=true;
 if(fallback)fallback.hidden=true;
 hotspots.hidden=false;
}
function createHotspot(p){
 const btn=document.createElement('button');
 btn.type='button';btn.className='marker';btn.dataset.region=p.id;
 btn.title=p.label;btn.setAttribute('aria-label','Abrir '+p.label);
 const dot=document.createElement('span');dot.className='marker-dot';
 btn.append(dot,document.createTextNode(p.label));
 btn.addEventListener('click',()=>window.BodyMap?.selectRegion(p.id,false));
 hotspots.appendChild(btn);
 const hit=new THREE.Mesh(new THREE.SphereGeometry(.15,10,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
 hit.position.copy(p.at);hit.userData.region=p.id;
 scene.add(hit);hitObjects.push(hit);
 selectors.push({...p,btn,normal:new THREE.Vector3(0,0,p.back?-1:1)});
}
function cameraView(nextView){
 view=nextView;
 if(view==='head'){
  camera.position.set(.1,1.76,3.1);
  controls.target.set(0,1.70,0);
  controls.minDistance=1.2;controls.maxDistance=6;
 }else{
  camera.position.set(.12,.04,view==='back'?-8.0:8.0);
  controls.target.set(0,0,0);
  controls.minDistance=3;controls.maxDistance=14;
 }
 controls.update();
}
function resize(){
 if(!renderer)return;
 const width=Math.max(120,mount.clientWidth),height=Math.max(120,mount.clientHeight);
 renderer.setSize(width,height,false);
 camera.aspect=width/height;camera.updateProjectionMatrix();
}
function locateHotspots(){
 if(!ready)return;
 const width=mount.clientWidth,height=mount.clientHeight;
 const toCamera=new THREE.Vector3();
 for(const p of selectors){
  if(!p.views.includes(view)){p.btn.hidden=true;continue}
  toCamera.copy(camera.position).sub(p.at).normalize();
  if(p.normal.dot(toCamera)<.1){p.btn.hidden=true;continue}
  const location=p.at.clone().project(camera);
  if(location.z<-1||location.z>1||Math.abs(location.x)>1.07||Math.abs(location.y)>1.05){p.btn.hidden=true;continue}
  p.btn.hidden=false;
  p.btn.style.left=((location.x+1)*width/2)+'px';
  p.btn.style.top=((1-location.y)*height/2)+'px';
  p.btn.classList.toggle('chosen',p.id===chosen);
  p.btn.style.opacity=window.BodyMap?.hasGoal(p.id)?'1':'.73';
 }
}
function touchAvatar(e){
 if(!startPointer||Math.hypot(e.clientX-startPointer.x,e.clientY-startPointer.y)>8||!ready)return;
 const box=renderer.domElement.getBoundingClientRect();
 mouse.set(2*(e.clientX-box.left)/box.width-1,1-2*(e.clientY-box.top)/box.height);
 raycaster.setFromCamera(mouse,camera);
 const candidates=hitObjects.filter(o=>selectors.find(p=>p.id===o.userData.region)?.views.includes(view));
 const hit=raycaster.intersectObjects(candidates,false);
 if(hit.length)window.BodyMap?.selectRegion(hit[0].object.userData.region,false);
}
function fail(err){
 console.warn('Falha na renderização do avatar 3D:',err.message||err);
 if(loading)loading.hidden=true;
 if(fallback){
  fallback.hidden=false;
  const hint=fallback.querySelector('p');
  if(hint)hint.textContent='Não foi possível baixar o avatar. Você ainda pode usar objetivos e checklists. Confira a internet e tente novamente.';
 }
 hotspots.hidden=true;
 const retry=document.getElementById('retry-3d');if(retry)retry.hidden=false;
}
function start(){
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.2;
  mount.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Avatar masculino 3D com camiseta, calça e tênis');
  controls=new OrbitControls(camera,renderer.domElement);
  controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.075;
  controls.minPolarAngle=.2;controls.maxPolarAngle=Math.PI-.2;
  controls.rotateSpeed=.6;
  cameraView(view);resize();
  renderer.domElement.addEventListener('pointerdown',e=>startPointer={x:e.clientX,y:e.clientY});
  renderer.domElement.addEventListener('pointerup',touchAvatar);
  window.addEventListener('mapa:view',e=>cameraView(e.detail.view));
  window.addEventListener('mapa:select',e=>{chosen=e.detail.region;locateHotspots()});
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(mount);
  else addEventListener('resize',resize);
  function frame(){requestAnimationFrame(frame);controls.update();renderer.render(scene,camera);locateHotspots()}
  frame();
  buildCharacter().catch(fail);
 }catch(e){fail(e)}
}
start();