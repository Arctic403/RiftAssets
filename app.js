import { ASSET_LIBRARY, ASSET_BY_ID } from './assets/definitions.js';
import { buildAsset, syncPartFromMesh, applyPartToRecord, assetStats } from './assets/builders.js';
import { loadModelAsset } from './assets/model-loader.js';

const DRAFT_KEY='riftassets-lab-drafts-v1';
const IMPORTED_KEY='riftassets-lab-imported-v1';
const $=selector=>document.querySelector(selector);
const canvas=$('#preview-canvas');
const status=$('#lab-status');

if(!window.BABYLON){
  status.textContent='Babylon.js failed to load. Check the network connection and reload.';
  throw new Error('Babylon.js unavailable');
}

const B=window.BABYLON;
const engine=new B.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,adaptToDeviceRatio:true});
const scene=new B.Scene(engine);
scene.clearColor=new B.Color4(.035,.043,.052,1);
scene.imageProcessingConfiguration.contrast=1.08;
scene.imageProcessingConfiguration.exposure=1.02;

const camera=new B.ArcRotateCamera('asset-camera',-Math.PI/2,1.04,18,new B.Vector3(0,2.4,0),scene);
camera.lowerRadiusLimit=2.5;
camera.upperRadiusLimit=80;
camera.lowerBetaLimit=.25;
camera.upperBetaLimit=1.48;
camera.wheelPrecision=38;
camera.pinchPrecision=70;
camera.panningSensibility=90;
camera.attachControl(canvas,true);

const hemi=new B.HemisphericLight('hemi',new B.Vector3(.3,1,.2),scene);
hemi.intensity=.8;
hemi.groundColor=new B.Color3(.08,.09,.11);
const sun=new B.DirectionalLight('sun',new B.Vector3(-.45,-1,.38),scene);
sun.position=new B.Vector3(16,28,-16);
sun.intensity=1.0;
const shadows=new B.ShadowGenerator(1024,sun);
shadows.useBlurExponentialShadowMap=true;
shadows.blurKernel=16;

const groundMat=new B.PBRMaterial('ground-mat',scene);
groundMat.albedoColor=B.Color3.FromHexString('#20262b');
groundMat.roughness=.95;
const ground=B.MeshBuilder.CreateGround('ground',{width:120,height:120},scene);
ground.material=groundMat;
ground.receiveShadows=true;

const grid=makeGrid();
const highlight=new B.HighlightLayer('selection-highlight',scene);
highlight.innerGlow=false;
highlight.outerGlow=true;

const gizmos=new B.GizmoManager(scene);
gizmos.positionGizmoEnabled=true;
gizmos.rotationGizmoEnabled=false;
gizmos.scaleGizmoEnabled=false;
gizmos.usePointerToAttachGizmos=false;

let mode='move';
let currentAssetId=ASSET_LIBRARY[0].id;
let currentAsset=null;
let instance=null;
let selectedPartId=null;
let lastMeshSignature='';
let undoStack=[];
let redoStack=[];
let night=false;
let showWireframe=false;
let showBounds=false;
let dragSnapshot=null;
let importedAssets=loadImportedAssets();

boot();

async function boot(){
  renderAssetList();
  bindUi();
  await loadAsset(currentAssetId);
  hookGizmoHistory();
  engine.runRenderLoop(()=>{
    syncSelectedFromMesh();
    scene.render();
  });
  window.addEventListener('resize',()=>engine.resize());
}

async function loadAsset(id,{preserveHistory=false,ignoreDraft=false}={}){
  const source=getAssetSource(id);
  if(!source)return;
  saveCurrentDraft();
  currentAssetId=id;
  const savedDraft=source.modelUrl?getDraft(id):null;
  currentAsset=ignoreDraft?clone(source):(savedDraft||getDraft(id)||clone(source));
  selectedPartId=null;
  instance?.dispose?.();
  highlight.removeAllMeshes();

  try{
    if(source.modelUrl){
      currentAsset={...clone(source),parts:Array.isArray(currentAsset.parts)?currentAsset.parts:[]};
      say(`Loading real model ${source.name}…`);
      instance=await loadModelAsset(B,scene,shadows,source,{overrides:currentAsset.parts});
      currentAsset.parts=instance.parts;
      const bounds=instance.getBounds?.();
      if(bounds){
        camera.target.copyFrom(bounds.center);
        const longest=Math.max(bounds.size.x,bounds.size.y,bounds.size.z);
        camera.radius=Math.max(6,longest*1.45);
      }else{
        camera.radius=currentAsset.cameraRadius||18;
        camera.target.set(0,Math.min(6,(currentAsset.cameraRadius||18)*.18),0);
      }
    }else{
      instance=buildAsset(B,scene,shadows,currentAsset);
      camera.radius=currentAsset.cameraRadius||18;
      camera.target.set(0,Math.min(6,(currentAsset.cameraRadius||18)*.18),0);
    }
  }catch(error){
    console.error(error);
    say(`Model load failed: ${error?.message||'unknown error'}`);
    return;
  }

  if(!preserveHistory){undoStack=[];redoStack=[];}
  refreshAssetHeader();
  refreshModelModeUi();
  renderAssetList();
  renderParts();
  selectPart(currentAsset.parts?.[0]?.id||null);
  refreshStats();
  applyDebugVisuals();
  say(source.modelUrl?`Loaded real glTF model: ${currentAsset.name}.`:`Loaded ${currentAsset.name}.`);
}

function bindUi(){
  $('#asset-search').addEventListener('input',renderAssetList);

  const fileInput=$('#asset-file-input');
  $('#import-file-button').addEventListener('click',()=>fileInput.click());
  $('#import-paste-button').addEventListener('click',()=>{
    $('#import-panel').hidden=false;
    $('#import-json-input').focus();
    setImportStatus('Paste a RiftAssets asset JSON, then tap LOAD ASSET.');
  });
  $('#import-cancel-button').addEventListener('click',()=>{
    $('#import-panel').hidden=true;
    $('#import-json-input').value='';
    setImportStatus('Imports are validated before loading.');
  });
  $('#import-apply-button').addEventListener('click',()=>{
    importAssetText($('#import-json-input').value,'pasted JSON');
  });
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0];
    if(!file)return;
    try{
      const text=await file.text();
      await importAssetText(text,file.name);
    }catch(error){
      setImportStatus(error?.message||'Could not read that JSON file.',true);
    }finally{
      fileInput.value='';
    }
  });

  document.querySelectorAll('[data-mode]').forEach(button=>{
    button.addEventListener('click',()=>setMode(button.dataset.mode));
  });

  $('#grid-toggle').addEventListener('click',event=>{
    grid.setEnabled(!grid.isEnabled());
    event.currentTarget.classList.toggle('active',grid.isEnabled());
  });

  $('#wire-toggle').addEventListener('click',event=>{
    showWireframe=!showWireframe;
    event.currentTarget.classList.toggle('active',showWireframe);
    applyDebugVisuals();
  });

  $('#bounds-toggle').addEventListener('click',event=>{
    showBounds=!showBounds;
    event.currentTarget.classList.toggle('active',showBounds);
    applyDebugVisuals();
  });

  $('#light-toggle').addEventListener('click',event=>{
    night=!night;
    if(night){
      scene.clearColor=new B.Color4(.012,.017,.025,1);
      hemi.intensity=.32;
      sun.intensity=.42;
      event.currentTarget.textContent='DAY';
    }else{
      scene.clearColor=new B.Color4(.035,.043,.052,1);
      hemi.intensity=.8;
      sun.intensity=1;
      event.currentTarget.textContent='NIGHT';
    }
  });

  $('#screenshot-button').addEventListener('click',savePng);

  scene.onPointerObservable.add(info=>{
    if(info.type!==B.PointerEventTypes.POINTERDOWN)return;
    const partId=info.pickInfo?.pickedMesh?.metadata?.assetPartId;
    if(partId)selectPart(partId);
  });

  document.querySelectorAll('[data-field]').forEach(input=>{
    input.addEventListener('change',()=>applyInspectorTransform(input.dataset.field,input.value));
  });

  $('#part-color').addEventListener('change',event=>{
    const part=getSelectedPart();if(!part)return;
    pushUndo();
    part.color=event.target.value;
    applySelectedPart();
  });
  $('#part-roughness').addEventListener('input',event=>{
    const part=getSelectedPart();if(!part)return;
    part.roughness=Number(event.target.value);
    applySelectedPart(false);
  });
  $('#part-metallic').addEventListener('input',event=>{
    const part=getSelectedPart();if(!part)return;
    part.metallic=Number(event.target.value);
    applySelectedPart(false);
  });
  $('#part-roughness').addEventListener('change',saveCurrentDraft);
  $('#part-metallic').addEventListener('change',saveCurrentDraft);

  $('#add-box').addEventListener('click',()=>addPart('box'));
  $('#add-cylinder').addEventListener('click',()=>addPart('cylinder'));
  $('#add-sphere').addEventListener('click',()=>addPart('sphere'));
  $('#duplicate-part').addEventListener('click',duplicatePart);
  $('#hide-part').addEventListener('click',togglePartHidden);
  $('#delete-part').addEventListener('click',deletePart);
  $('#focus-part').addEventListener('click',focusSelected);

  $('#undo-button').addEventListener('click',undo);
  $('#redo-button').addEventListener('click',redo);
  $('#reset-asset').addEventListener('click',resetCurrentAsset);
  $('#remove-imported').addEventListener('click',removeCurrentImport);
  $('#clear-drafts').addEventListener('click',clearAllDrafts);

  $('#export-json').addEventListener('click',exportJson);
  $('#copy-json').addEventListener('click',copyJson);

  $('#library-toggle').addEventListener('click',()=>document.body.classList.toggle('library-open'));
  $('#inspector-toggle').addEventListener('click',()=>document.body.classList.toggle('inspector-open'));
  document.querySelectorAll('[data-close-panel]').forEach(button=>{
    button.addEventListener('click',()=>{
      document.body.classList.remove(`${button.dataset.closePanel}-open`);
    });
  });

  window.addEventListener('keydown',event=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    const mod=event.ctrlKey||event.metaKey;
    if(mod&&event.code==='KeyZ'){event.preventDefault();return event.shiftKey?redo():undo();}
    if(mod&&event.code==='KeyY'){event.preventDefault();return redo();}
    if(mod&&event.code==='KeyD'){event.preventDefault();return duplicatePart();}
    if(event.code==='KeyW'){event.preventDefault();return setMode('move');}
    if(event.code==='KeyE'){event.preventDefault();return setMode('rotate');}
    if(event.code==='KeyR'){event.preventDefault();return setMode('scale');}
    if(event.code==='Delete'||event.code==='Backspace'){event.preventDefault();return deletePart();}
    const mesh=getSelectedRecord()?.mesh;
    if(!mesh)return;
    const step=event.shiftKey?.5:.25;
    if(event.code==='ArrowLeft'){event.preventDefault();pushUndo();mesh.position.x-=step;}
    if(event.code==='ArrowRight'){event.preventDefault();pushUndo();mesh.position.x+=step;}
    if(event.code==='ArrowUp'){event.preventDefault();pushUndo();mesh.position.z-=step;}
    if(event.code==='ArrowDown'){event.preventDefault();pushUndo();mesh.position.z+=step;}
  });
}

function renderAssetList(){
  const query=$('#asset-search')?.value?.trim().toLowerCase()||'';
  const filtered=getAssetLibrary().filter(asset=>{
    if(!query)return true;
    return `${asset.name} ${asset.category} ${asset.description}`.toLowerCase().includes(query);
  });
  const groups=new Map();
  for(const asset of filtered){
    if(!groups.has(asset.category))groups.set(asset.category,[]);
    groups.get(asset.category).push(asset);
  }

  $('#asset-list').innerHTML=[...groups].map(([category,items])=>`
    <div class="asset-group-title">${escapeHtml(category)}</div>
    ${items.map(asset=>`
      <button class="asset-item ${asset.id===currentAssetId?'active':''}" data-asset-id="${asset.id}">
        <strong>${escapeHtml(asset.name)}</strong>
        <small>${asset.modelUrl?'<span class="model-badge">REAL MODEL</span>':`${asset.parts?.length||0} parts`}${importedAssets[asset.id]?' · <span class="imported-badge">IMPORTED</span>':''}</small>
      </button>
    `).join('')}
  `).join('')||'<div class="asset-group-title">No matches</div>';

  document.querySelectorAll('[data-asset-id]').forEach(button=>{
    button.addEventListener('click',()=>{
      loadAsset(button.dataset.assetId);
      document.body.classList.remove('library-open');
    });
  });
}

function renderParts(){
  const list=$('#parts-list');
  list.innerHTML=(currentAsset.parts||[]).map(part=>`
    <button class="part-item ${part.id===selectedPartId?'active':''} ${part.hidden?'hidden-part':''}" data-part-id="${escapeAttr(part.id)}">
      <span>${escapeHtml(part.name||part.id)}</span>
      <small>${escapeHtml(part.shape||'box')}</small>
    </button>
  `).join('');
  list.querySelectorAll('[data-part-id]').forEach(button=>{
    button.addEventListener('click',()=>selectPart(button.dataset.partId));
  });
}

function selectPart(id){
  const record=instance?.getRecord(id);
  selectedPartId=record?id:null;
  highlight.removeAllMeshes();
  if(record?.mesh){
    highlight.addMesh(record.mesh,B.Color3.FromHexString('#d68d35'));
    gizmos.attachToMesh(record.mesh);
    lastMeshSignature=meshSignature(record.mesh);
  }else{
    gizmos.attachToMesh(null);
    lastMeshSignature='';
  }
  renderParts();
  refreshInspector();
}

function refreshInspector(){
  const part=getSelectedPart();
  const record=getSelectedRecord();
  $('#selected-part-name').textContent=part?.name||'Nothing selected';
  $('#selected-part-type').textContent=part?`${part.shape.toUpperCase()} · ${part.id}`:'Click a part of the asset.';
  const fields=Object.fromEntries([...document.querySelectorAll('[data-field]')].map(input=>[input.dataset.field,input]));
  const position=part?.position||[0,0,0];
  const rotation=part?.rotation||[0,0,0];
  const size=part?.size||[1,1,1];
  const values={x:position[0],y:position[1],z:position[2],rx:rotation[0],ry:rotation[1],rz:rotation[2],sx:size[0],sy:size[1],sz:size[2]};
  for(const [key,input] of Object.entries(fields)){
    input.value=part?Number(values[key]??0).toFixed(2):'';
    input.disabled=!part;
  }
  $('#part-color').value=part?.color||'#777777';
  $('#part-color').disabled=!part;
  $('#part-roughness').value=part?.roughness??.82;
  $('#part-roughness').disabled=!part;
  $('#part-metallic').value=part?.metallic??0;
  $('#part-metallic').disabled=!part;
  $('#hide-part').textContent=part?.hidden?'SHOW':'HIDE';
  $('#duplicate-part').disabled=!part;
  $('#hide-part').disabled=!part;
  $('#delete-part').disabled=!part;
  $('#focus-part').disabled=!record;
}

function applyInspectorTransform(field,value){
  const part=getSelectedPart();if(!part)return;
  const n=Number(value);if(!Number.isFinite(n))return;
  pushUndo();
  const map={
    x:['position',0],y:['position',1],z:['position',2],
    rx:['rotation',0],ry:['rotation',1],rz:['rotation',2],
    sx:['size',0],sy:['size',1],sz:['size',2]
  };
  const [array,index]=map[field];
  part[array][index]=(array==='size')?Math.max(.01,n):n;
  applySelectedPart();
}

function applySelectedPart(save=true){
  const part=getSelectedPart(),record=getSelectedRecord();
  if(!part||!record)return;
  applyPartToRecord(B,part,record);
  lastMeshSignature=meshSignature(record.mesh);
  refreshInspector();
  refreshStats();
  applyDebugVisuals();
  if(save)saveCurrentDraft();
}

function syncSelectedFromMesh(){
  const part=getSelectedPart(),record=getSelectedRecord();
  if(!part||!record?.mesh)return;
  const sig=meshSignature(record.mesh);
  if(sig===lastMeshSignature)return;
  syncPartFromMesh(part,record.mesh);
  lastMeshSignature=sig;
  refreshInspector();
  saveCurrentDraft();
}

function setMode(next){
  mode=next;
  gizmos.positionGizmoEnabled=mode==='move';
  gizmos.rotationGizmoEnabled=mode==='rotate';
  gizmos.scaleGizmoEnabled=mode==='scale';
  const record=getSelectedRecord();
  gizmos.attachToMesh(record?.mesh||null);
  document.querySelectorAll('[data-mode]').forEach(button=>button.classList.toggle('active',button.dataset.mode===mode));
  say(`${mode.toUpperCase()} mode.`);
}

function addPart(shape){
  if(isModelAsset())return say('Real model topology is stored in the glTF file; browser primitive parts cannot be added to it.');
  pushUndo();
  const id=uniquePartId(shape);
  const colors={box:'#76706a',cylinder:'#5a6065',sphere:'#3e5b45'};
  currentAsset.parts.push({
    id,name:`New ${shape}`,shape,color:colors[shape]||'#777777',
    position:[0,1,0],size:[1,1,1],rotation:[0,0,0],metallic:0,roughness:.8,hidden:false
  });
  rebuildAsset(id);
  say(`Added ${shape}.`);
}

function duplicatePart(){
  if(isModelAsset())return say('Duplicate mesh topology is disabled for real model assets in this proof pass.');
  const source=getSelectedPart();if(!source)return;
  pushUndo();
  const copy=clone(source);
  copy.id=uniquePartId(source.id);
  copy.name=`${source.name} copy`;
  copy.position=[source.position[0]+.35,source.position[1],source.position[2]+.35];
  currentAsset.parts.push(copy);
  rebuildAsset(copy.id);
  say('Part duplicated.');
}

function togglePartHidden(){
  const part=getSelectedPart();if(!part)return;
  pushUndo();
  part.hidden=!part.hidden;
  applySelectedPart();
  renderParts();
  say(part.hidden?'Part hidden.':'Part shown.');
}

function deletePart(){
  if(isModelAsset())return say('Deleting glTF topology is disabled in this proof pass; use HIDE for inspection instead.');
  const part=getSelectedPart();if(!part)return;
  pushUndo();
  const index=currentAsset.parts.findIndex(row=>row.id===part.id);
  currentAsset.parts.splice(index,1);
  const next=currentAsset.parts[Math.min(index,currentAsset.parts.length-1)]?.id||null;
  rebuildAsset(next);
  say('Part deleted.');
}

function focusSelected(){
  const record=getSelectedRecord();
  if(!record?.mesh)return;
  const info=record.mesh.getBoundingInfo();
  const center=info.boundingBox.centerWorld;
  const extent=info.boundingBox.extendSizeWorld.length();
  camera.target.copyFrom(center);
  camera.radius=Math.max(3,extent*5);
}

function rebuildAsset(selectId=selectedPartId){
  if(isModelAsset())return say('Real model topology is not rebuilt from browser primitives.');
  instance?.dispose?.();
  highlight.removeAllMeshes();
  instance=buildAsset(B,scene,shadows,currentAsset);
  selectedPartId=null;
  renderParts();
  selectPart(selectId&&instance.getRecord(selectId)?selectId:(currentAsset.parts[0]?.id||null));
  refreshStats();
  applyDebugVisuals();
  saveCurrentDraft();
}

function pushUndo(){
  const snap=JSON.stringify(currentAsset);
  if(undoStack.at(-1)!==snap)undoStack.push(snap);
  if(undoStack.length>80)undoStack.shift();
  redoStack.length=0;
}

function undo(){
  if(!undoStack.length)return say('Nothing to undo.');
  redoStack.push(JSON.stringify(currentAsset));
  currentAsset=JSON.parse(undoStack.pop());
  rebuildAsset(currentAsset.parts.some(p=>p.id===selectedPartId)?selectedPartId:currentAsset.parts[0]?.id);
  say('Undo.');
}

function redo(){
  if(!redoStack.length)return say('Nothing to redo.');
  undoStack.push(JSON.stringify(currentAsset));
  currentAsset=JSON.parse(redoStack.pop());
  rebuildAsset(currentAsset.parts.some(p=>p.id===selectedPartId)?selectedPartId:currentAsset.parts[0]?.id);
  say('Redo.');
}

async function resetCurrentAsset(){
  const source=getAssetSource(currentAssetId);if(!source)return;
  pushUndo();
  removeDraft(currentAssetId);
  if(source.modelUrl){
    await loadAsset(currentAssetId,{ignoreDraft:true});
  }else{
    currentAsset=clone(source);
    rebuildAsset(currentAsset.parts[0]?.id);
  }
  say('Asset reset to its built-in definition.');
}

async function clearAllDrafts(){
  try{localStorage.removeItem(DRAFT_KEY);}catch(_){}
  undoStack=[];redoStack=[];
  const source=getAssetSource(currentAssetId);
  if(source?.modelUrl)await loadAsset(currentAssetId,{ignoreDraft:true});
  else{
    currentAsset=clone(source);
    rebuildAsset(currentAsset.parts[0]?.id);
  }
  say('All local asset drafts cleared.');
}

function saveCurrentDraft(){
  if(!currentAsset)return;
  const drafts=loadDrafts();
  drafts[currentAssetId]=currentAsset;
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));}catch(_){}
}

function getDraft(id){
  const value=loadDrafts()[id];
  return value?clone(value):null;
}
function removeDraft(id){
  const drafts=loadDrafts();
  delete drafts[id];
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));}catch(_){}
}
function loadDrafts(){
  try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}')||{};}catch(_){return {};}
}


async function importAssetText(text,sourceLabel='JSON'){
  const importPanel=$('#import-panel');
  try{
    const parsed=JSON.parse(String(text||''));
    const asset=validateImportedAsset(parsed);
    saveCurrentDraft();
    importedAssets[asset.id]=asset;
    saveImportedAssets();
    removeDraft(asset.id);
    loadAsset(asset.id,{ignoreDraft:true});
    removeDraft(asset.id);
    saveCurrentDraft();
    $('#import-json-input').value='';
    if(importPanel)importPanel.hidden=true;
    renderAssetList();
    setImportStatus(`Imported ${asset.name} from ${sourceLabel}.`,false,true);
    say(`Imported ${asset.name}. ${asset.parts.length} editable parts loaded.`);
    document.body.classList.remove('library-open');
    document.body.classList.add('inspector-open');
  }catch(error){
    if(importPanel)importPanel.hidden=false;
    setImportStatus(error?.message||'Invalid asset JSON.',true);
    say(`Import failed: ${error?.message||'invalid JSON'}`);
  }
}

function validateImportedAsset(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Asset JSON must contain one asset object.');
  const id=String(value.id||'').trim();
  if(!id)throw new Error('Asset is missing an id.');
  if(!/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(id))throw new Error('Asset id can only use letters, numbers, dot, underscore and dash.');
  const name=String(value.name||'').trim();
  if(!name)throw new Error('Asset is missing a name.');
  if(!Array.isArray(value.parts)||!value.parts.length)throw new Error('Asset must contain at least one part.');
  if(value.parts.length>2500)throw new Error('Asset has too many parts for the browser editor (2500 max).');

  const seen=new Set();
  const parts=value.parts.map((raw,index)=>{
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error(`Part ${index+1} is not a valid object.`);
    const partId=String(raw.id||'').trim();
    if(!partId)throw new Error(`Part ${index+1} is missing an id.`);
    if(seen.has(partId))throw new Error(`Duplicate part id: ${partId}`);
    seen.add(partId);
    const shape=String(raw.shape||'box').toLowerCase();
    if(!['box','cylinder','sphere'].includes(shape))throw new Error(`Unsupported shape "${shape}" in ${partId}.`);
    const position=validateVector(raw.position,[0,0,0],`${partId} position`);
    const rotation=validateVector(raw.rotation,[0,0,0],`${partId} rotation`);
    const size=validateVector(raw.size,[1,1,1],`${partId} size`).map((n,axis)=>{
      if(n<=0)throw new Error(`${partId} size values must be greater than 0.`);
      return Math.max(.01,n);
    });
    const color=String(raw.color||'#777777');
    if(!/^#[0-9a-f]{6}$/i.test(color))throw new Error(`${partId} has an invalid color. Use #RRGGBB.`);
    return {
      ...raw,
      id:partId,
      name:String(raw.name||partId),
      shape,
      color,
      position,
      rotation,
      size,
      metallic:clamp01(raw.metallic??0),
      roughness:clamp01(raw.roughness??.82),
      hidden:raw.hidden===true
    };
  });

  const cameraRadius=Number(value.cameraRadius);
  return {
    ...value,
    id,
    name,
    category:String(value.category||'Imported').trim()||'Imported',
    description:String(value.description||'Imported RiftAssets definition.'),
    cameraRadius:Number.isFinite(cameraRadius)&&cameraRadius>0?cameraRadius:18,
    parts
  };
}

function validateVector(value,fallback,label){
  const source=Array.isArray(value)?value:fallback;
  return [0,1,2].map(index=>{
    const n=Number(source[index]??fallback[index]);
    if(!Number.isFinite(n))throw new Error(`${label} contains a non-numeric value.`);
    return Math.round(n*1000)/1000;
  });
}

function getAssetLibrary(){
  const merged=new Map(ASSET_LIBRARY.map(asset=>[asset.id,asset]));
  for(const asset of Object.values(importedAssets||{}))merged.set(asset.id,asset);
  return [...merged.values()];
}

function getAssetSource(id){
  return importedAssets?.[id]||ASSET_BY_ID[id]||null;
}

function loadImportedAssets(){
  try{
    const parsed=JSON.parse(localStorage.getItem(IMPORTED_KEY)||'{}');
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  }catch(_){return {};}
}

function saveImportedAssets(){
  try{localStorage.setItem(IMPORTED_KEY,JSON.stringify(importedAssets||{}));}catch(_){}
}

function removeCurrentImport(){
  if(!importedAssets?.[currentAssetId]){
    say('Current asset is built into Pack 01; there is no imported override to remove.');
    return;
  }
  const id=currentAssetId;
  delete importedAssets[id];
  saveImportedAssets();
  removeDraft(id);
  const fallback=ASSET_BY_ID[id];
  if(fallback){
    loadAsset(id,{ignoreDraft:true});
    removeDraft(id);
    saveCurrentDraft();
    say('Imported override removed. Built-in asset restored.');
  }else{
    const next=ASSET_LIBRARY[0]?.id;
    if(next)loadAsset(next);
    say('Imported asset removed from the library.');
  }
  renderAssetList();
}

function setImportStatus(message,isError=false,isSuccess=false){
  const target=$('#import-status');
  if(!target)return;
  target.textContent=message;
  target.classList.toggle('error',!!isError);
  target.classList.toggle('success',!!isSuccess&&!isError);
}

function clamp01(value){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
}

function exportJson(){
  const json=JSON.stringify(currentAsset,null,2);
  const output=$('#export-output');
  output.hidden=false;
  output.value=json;
  downloadText(`${currentAsset.id}.asset.json`,json);
  say('Asset JSON exported.');
}
async function copyJson(){
  const json=JSON.stringify(currentAsset,null,2);
  const output=$('#export-output');
  output.hidden=false;output.value=json;
  try{
    await navigator.clipboard.writeText(json);
    say('Asset JSON copied.');
  }catch(_){
    output.focus();output.select();
    say('Clipboard blocked — JSON selected below.');
  }
}

function savePng(){
  B.Tools.CreateScreenshotUsingRenderTarget(engine,camera,{width:1200,height:800},data=>{
    const a=document.createElement('a');
    a.href=data;a.download=`${currentAsset.id}-preview.png`;a.click();
  });
}

function refreshAssetHeader(){
  $('#asset-category').textContent=currentAsset.category.toUpperCase();
  $('#asset-name').textContent=currentAsset.name;
  $('#asset-description').textContent=currentAsset.description||'';
}
function refreshStats(){
  const stats=assetStats(instance);
  $('#stat-meshes').textContent=stats.meshes.toLocaleString();
  $('#stat-verts').textContent=stats.vertices.toLocaleString();
  $('#stat-tris').textContent=stats.triangles.toLocaleString();
}

function applyDebugVisuals(){
  for(const record of instance?.records?.values?.()||[]){
    record.material.wireframe=showWireframe;
    record.mesh.showBoundingBox=showBounds;
  }
}

function hookGizmoHistory(){
  const hook=dragBehavior=>{
    if(!dragBehavior)return;
    dragBehavior.onDragStartObservable?.add(()=>{dragSnapshot=JSON.stringify(currentAsset);});
    dragBehavior.onDragEndObservable?.add(()=>{
      if(dragSnapshot&&dragSnapshot!==JSON.stringify(currentAsset)){
        undoStack.push(dragSnapshot);
        if(undoStack.length>80)undoStack.shift();
        redoStack.length=0;
      }
      dragSnapshot=null;
      saveCurrentDraft();
    });
  };
  const wire=gizmo=>{
    hook(gizmo?.xGizmo?.dragBehavior);
    hook(gizmo?.yGizmo?.dragBehavior);
    hook(gizmo?.zGizmo?.dragBehavior);
    hook(gizmo?.uniformScaleGizmo?.dragBehavior);
  };
  wire(gizmos.gizmos.positionGizmo);
  wire(gizmos.gizmos.rotationGizmo);
  wire(gizmos.gizmos.scaleGizmo);
}

function makeGrid(){
  const root=new B.TransformNode('grid-root',scene);
  const mat=new B.StandardMaterial('grid-material',scene);
  mat.emissiveColor=B.Color3.FromHexString('#59626b').scale(.5);
  mat.alpha=.5;
  const extent=40;
  for(let i=-extent;i<=extent;i+=1){
    const major=i%5===0;
    const a=B.MeshBuilder.CreateBox(`grid-x-${i}`,{width:major?.025:.012,height:.01,depth:extent*2},scene);
    a.position.set(i,.012,0);a.material=mat;a.parent=root;
    const b=B.MeshBuilder.CreateBox(`grid-z-${i}`,{width:extent*2,height:.01,depth:major?.025:.012},scene);
    b.position.set(0,.012,i);b.material=mat;b.parent=root;
  }
  return root;
}

function isModelAsset(){return !!currentAsset?.modelUrl;}
function refreshModelModeUi(){
  const model=isModelAsset();
  $('#model-asset-note').hidden=!model;
  for(const id of ['add-box','add-cylinder','add-sphere','duplicate-part','delete-part']){
    const button=$(`#${id}`);
    if(button)button.disabled=model;
  }
}
function getSelectedPart(){return currentAsset?.parts?.find(part=>part.id===selectedPartId)||null;}
function getSelectedRecord(){return instance?.getRecord(selectedPartId)||null;}
function uniquePartId(prefix){
  const base=String(prefix||'part').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'part';
  let index=1,id=`${base}-${index}`;
  const used=new Set(currentAsset.parts.map(part=>part.id));
  while(used.has(id))id=`${base}-${++index}`;
  return id;
}
function meshSignature(mesh){
  return [
    mesh.position.x,mesh.position.y,mesh.position.z,
    mesh.rotation.x,mesh.rotation.y,mesh.rotation.z,
    mesh.scaling.x,mesh.scaling.y,mesh.scaling.z
  ].map(n=>Number(n).toFixed(4)).join('|');
}
function clone(value){return JSON.parse(JSON.stringify(value));}
function say(message){status.textContent=message;}
function downloadText(filename,text){
  const blob=new Blob([text],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function escapeAttr(value){return escapeHtml(value);}
